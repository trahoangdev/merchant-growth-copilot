import csv
from dataclasses import dataclass
from pathlib import Path

from app.api.schemas import CampaignReport, PrivacyPreference, Product, Recommendation, RecommendationFeedback
from app.core.config import get_settings


class DataStoreError(RuntimeError):
    pass


class DataUnavailableError(DataStoreError):
    pass


@dataclass(frozen=True)
class DataStatus:
    ready: bool
    data_dir: str
    missing_files: list[str]
    required_files: list[str]


REQUIRED_FILES = [
    "products.csv",
    "recommendations.csv",
    "recommendation_products.csv",
    "reports.csv",
    "privacy.csv",
]

PRODUCT_FIELDS = {"id", "name", "category", "price_vnd", "margin_percent", "stock", "tags", "description"}
RECOMMENDATION_FIELDS = {
    "id",
    "title",
    "action_type",
    "target_segment",
    "timing",
    "expected_metric",
    "confidence",
    "risk_flag",
    "evidence",
    "campaign_copy",
    "status",
}
RECOMMENDATION_PRODUCT_FIELDS = {"recommendation_id", "product_id"}
REPORT_FIELDS = {
    "recommendation_id",
    "conversion_lift_percent",
    "aov_lift_percent",
    "repeat_orders",
    "inventory_units_moved",
    "estimated_time_saved_hours",
}
PRIVACY_FIELDS = {"signal", "enabled", "description"}


def data_status() -> DataStatus:
    data_dir = _data_dir()
    missing = [file_name for file_name in REQUIRED_FILES if not (data_dir / file_name).exists()]
    return DataStatus(
        ready=not missing,
        data_dir=str(data_dir),
        missing_files=missing,
        required_files=REQUIRED_FILES,
    )


def load_products() -> list[Product]:
    rows = _read_csv("products.csv", PRODUCT_FIELDS)
    return [
        Product(
            id=row["id"],
            name=row["name"],
            category=row["category"],
            price_vnd=_int(row["price_vnd"], "price_vnd"),
            margin_percent=_float(row["margin_percent"], "margin_percent"),
            stock=_int(row["stock"], "stock"),
            tags=_split_list(row["tags"]),
            description=row["description"],
        )
        for row in rows
    ]


def load_recommendations() -> list[Recommendation]:
    products_by_id = {product.id: product for product in load_products()}
    product_ids_by_recommendation: dict[str, list[str]] = {}

    for row in _read_csv("recommendation_products.csv", RECOMMENDATION_PRODUCT_FIELDS):
        product_ids_by_recommendation.setdefault(row["recommendation_id"], []).append(row["product_id"])

    recommendations = []
    for row in _read_csv("recommendations.csv", RECOMMENDATION_FIELDS):
        product_ids = product_ids_by_recommendation.get(row["id"], [])
        products = []
        for product_id in product_ids:
            if product_id not in products_by_id:
                raise DataStoreError(f"recommendation_products.csv references unknown product_id '{product_id}'")
            products.append(products_by_id[product_id])

        recommendations.append(
            Recommendation(
                id=row["id"],
                title=row["title"],
                action_type=row["action_type"],
                target_segment=row["target_segment"],
                timing=row["timing"],
                expected_metric=row["expected_metric"],
                confidence=_float(row["confidence"], "confidence"),
                risk_flag=row["risk_flag"],
                evidence=_split_list(row["evidence"]),
                campaign_copy=row["campaign_copy"],
                status=row["status"] or "draft",
                products=products,
            )
        )

    return recommendations


def load_reports() -> list[CampaignReport]:
    rows = _read_csv("reports.csv", REPORT_FIELDS)
    return [
        CampaignReport(
            recommendation_id=row["recommendation_id"],
            conversion_lift_percent=_float(row["conversion_lift_percent"], "conversion_lift_percent"),
            aov_lift_percent=_float(row["aov_lift_percent"], "aov_lift_percent"),
            repeat_orders=_int(row["repeat_orders"], "repeat_orders"),
            inventory_units_moved=_int(row["inventory_units_moved"], "inventory_units_moved"),
            estimated_time_saved_hours=_float(row["estimated_time_saved_hours"], "estimated_time_saved_hours"),
        )
        for row in rows
    ]


def load_privacy_preferences() -> list[PrivacyPreference]:
    rows = _read_csv("privacy.csv", PRIVACY_FIELDS)
    return [
        PrivacyPreference(
            signal=row["signal"],
            enabled=row["enabled"].strip().lower() in {"1", "true", "yes", "enabled"},
            description=row["description"],
        )
        for row in rows
    ]


def update_privacy_preference(signal: str, enabled: bool) -> PrivacyPreference:
    rows = _read_csv("privacy.csv", PRIVACY_FIELDS)
    updated = False

    for row in rows:
        if row["signal"] == signal:
            row["enabled"] = "true" if enabled else "false"
            updated = True
            break

    if not updated:
        raise KeyError(signal)

    _write_csv("privacy.csv", rows, ["signal", "enabled", "description"])
    return next(item for item in load_privacy_preferences() if item.signal == signal)


def update_recommendation_feedback(recommendation_id: str, feedback: RecommendationFeedback) -> Recommendation:
    rows = _read_csv("recommendations.csv", RECOMMENDATION_FIELDS)
    updated = False

    for row in rows:
        if row["id"] == recommendation_id:
            row["status"] = feedback.status
            if feedback.edited_copy:
                row["campaign_copy"] = feedback.edited_copy
            if feedback.reason:
                current_evidence = _split_list(row["evidence"])
                current_evidence.append(f"Merchant feedback: {feedback.reason}")
                row["evidence"] = "|".join(current_evidence)
            updated = True
            break

    if not updated:
        raise KeyError(recommendation_id)

    _write_csv("recommendations.csv", rows, list(RECOMMENDATION_FIELDS))
    return next(item for item in load_recommendations() if item.id == recommendation_id)


def _data_dir() -> Path:
    path = Path(get_settings().data_dir)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def _read_csv(file_name: str, required_fields: set[str]) -> list[dict[str, str]]:
    status = data_status()
    if status.missing_files:
        raise DataUnavailableError(
            f"Real data is not loaded. Missing files in {status.data_dir}: {', '.join(status.missing_files)}"
        )

    path = _data_dir() / file_name
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fields = set(reader.fieldnames or [])
        missing_fields = sorted(required_fields - fields)
        if missing_fields:
            raise DataStoreError(f"{file_name} is missing required columns: {', '.join(missing_fields)}")
        return [{key: (value or "").strip() for key, value in row.items()} for row in reader]


def _write_csv(file_name: str, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    path = _data_dir() / file_name
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def _split_list(value: str) -> list[str]:
    if not value:
        return []
    delimiter = "|" if "|" in value else ";"
    return [item.strip() for item in value.split(delimiter) if item.strip()]


def _int(value: str, field_name: str) -> int:
    try:
        return int(float(value))
    except ValueError as exc:
        raise DataStoreError(f"Invalid integer for {field_name}: {value}") from exc


def _float(value: str, field_name: str) -> float:
    try:
        return float(value)
    except ValueError as exc:
        raise DataStoreError(f"Invalid number for {field_name}: {value}") from exc
