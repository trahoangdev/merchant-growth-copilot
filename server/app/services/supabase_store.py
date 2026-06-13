import json
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from app.api.schemas import CampaignReport, PrivacyPreference, Product, Recommendation, RecommendationFeedback
from app.core.config import get_settings


class SupabaseStoreError(RuntimeError):
    pass


class SupabaseUnavailableError(SupabaseStoreError):
    pass


@dataclass(frozen=True)
class SupabaseStatus:
    ready: bool
    source: str
    missing_tables: list[str]
    required_tables: list[str]


REQUIRED_TABLES = ["products", "recommendations", "recommendation_products", "reports", "privacy"]


def supabase_status() -> SupabaseStatus:
    missing = []
    for table in REQUIRED_TABLES:
        try:
            _request(table, {"select": "*", "limit": "1"})
        except SupabaseStoreError:
            missing.append(table)

    return SupabaseStatus(
        ready=not missing,
        source=_source_label(),
        missing_tables=missing,
        required_tables=REQUIRED_TABLES,
    )


def load_products() -> list[Product]:
    rows = _request("products", {"select": "*", "order": "name.asc"})
    return [_product(row) for row in rows]


def load_recommendations() -> list[Recommendation]:
    products_by_id = {product.id: product for product in load_products()}
    rows = _request("recommendations", {"select": "*", "order": "id.asc"})
    relation_rows = _request("recommendation_products", {"select": "*"})

    product_ids_by_recommendation: dict[str, list[str]] = {}
    for row in relation_rows:
        product_ids_by_recommendation.setdefault(str(row["recommendation_id"]), []).append(str(row["product_id"]))

    recommendations = []
    for row in rows:
        recommendation_id = str(row["id"])
        products = [products_by_id[product_id] for product_id in product_ids_by_recommendation.get(recommendation_id, [])]
        recommendations.append(
            Recommendation(
                id=recommendation_id,
                title=str(row["title"]),
                action_type=str(row["action_type"]),
                target_segment=str(row["target_segment"]),
                timing=str(row["timing"]),
                expected_metric=str(row["expected_metric"]),
                confidence=float(row["confidence"]),
                risk_flag=str(row["risk_flag"]),
                evidence=_list_value(row.get("evidence")),
                campaign_copy=str(row["campaign_copy"]),
                status=str(row.get("status") or "draft"),
                products=products,
            )
        )
    return recommendations


def load_reports() -> list[CampaignReport]:
    rows = _request("reports", {"select": "*", "order": "recommendation_id.asc"})
    return [
        CampaignReport(
            recommendation_id=str(row["recommendation_id"]),
            conversion_lift_percent=float(row["conversion_lift_percent"]),
            aov_lift_percent=float(row["aov_lift_percent"]),
            repeat_orders=int(row["repeat_orders"]),
            inventory_units_moved=int(row["inventory_units_moved"]),
            estimated_time_saved_hours=float(row["estimated_time_saved_hours"]),
        )
        for row in rows
    ]


def load_privacy_preferences() -> list[PrivacyPreference]:
    rows = _request("privacy", {"select": "*", "order": "signal.asc"})
    return [
        PrivacyPreference(
            signal=str(row["signal"]),
            enabled=bool(row["enabled"]),
            description=str(row["description"]),
        )
        for row in rows
    ]


def update_privacy_preference(signal: str, enabled: bool) -> PrivacyPreference:
    rows = _request(
        "privacy",
        {"signal": f"eq.{signal}", "select": "*"},
        method="PATCH",
        body={"enabled": enabled},
        prefer="return=representation",
    )
    if not rows:
        raise KeyError(signal)
    row = rows[0]
    return PrivacyPreference(
        signal=str(row["signal"]),
        enabled=bool(row["enabled"]),
        description=str(row["description"]),
    )


def update_recommendation_feedback(recommendation_id: str, feedback: RecommendationFeedback) -> Recommendation:
    payload: dict[str, Any] = {"status": feedback.status}
    if feedback.edited_copy:
        payload["campaign_copy"] = feedback.edited_copy

    rows = _request(
        "recommendations",
        {"id": f"eq.{recommendation_id}", "select": "*"},
        method="PATCH",
        body=payload,
        prefer="return=representation",
    )
    if not rows:
        raise KeyError(recommendation_id)
    return next(item for item in load_recommendations() if item.id == recommendation_id)


def _product(row: dict[str, Any]) -> Product:
    return Product(
        id=str(row["id"]),
        name=str(row["name"]),
        category=str(row["category"]),
        price_vnd=int(row["price_vnd"]),
        margin_percent=float(row["margin_percent"]),
        stock=int(row["stock"]),
        tags=_list_value(row.get("tags")),
        description=str(row["description"]),
    )


def _request(
    table: str,
    query: dict[str, str],
    *,
    method: str = "GET",
    body: dict[str, Any] | list[dict[str, Any]] | None = None,
    prefer: str | None = None,
) -> list[dict[str, Any]]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise SupabaseUnavailableError("Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.")

    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{quote(table)}?{urlencode(query)}"
    headers = {
        "apikey": settings.supabase_publishable_key,
        "Authorization": f"Bearer {settings.supabase_publishable_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer

    request = Request(
        url,
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers=headers,
        method=method,
    )

    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else []
    except HTTPError as exc:
        detail = exc.read().decode("utf-8")
        if exc.code == 404 and "Could not find the table" in detail:
            raise SupabaseUnavailableError(f"Supabase table '{table}' is not available. Run the schema seed SQL first.") from exc
        raise SupabaseStoreError(f"Supabase {table} request failed: {exc.code} {detail}") from exc
    except URLError as exc:
        raise SupabaseUnavailableError(f"Supabase request failed: {exc.reason}") from exc


def _list_value(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, str):
        delimiter = "|" if "|" in value else ";"
        return [item.strip() for item in value.split(delimiter) if item.strip()]
    return []


def _source_label() -> str:
    settings = get_settings()
    return settings.supabase_url or "supabase"
