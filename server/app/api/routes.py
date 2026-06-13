from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    CampaignReport,
    OnboardingRequest,
    PrivacyPreference,
    PrivacyPreferenceUpdate,
    Product,
    Recommendation,
    RecommendationFeedback,
    SearchRequest,
    SearchResult,
)
from app.services import repository
from app.services.search import semantic_search

router = APIRouter(prefix="/api")


def _data_error(exc: repository.RepositoryError) -> HTTPException:
    status_code = 503 if isinstance(exc, repository.RepositoryUnavailableError) else 422
    return HTTPException(status_code=status_code, detail=str(exc))


@router.get("/health")
def health() -> dict[str, object]:
    status = repository.status()
    return {
        "status": "ok",
        "data_ready": status.ready,
        "data_source": status.source,
        "missing": status.missing,
    }


@router.get("/data-status")
def get_data_status() -> dict[str, object]:
    status = repository.status()
    return {
        "ready": status.ready,
        "data_dir": status.source,
        "required_files": status.required,
        "missing_files": status.missing,
    }


@router.post("/onboarding")
def save_onboarding(payload: OnboardingRequest) -> dict[str, object]:
    return {
        "merchant_id": payload.merchant_name.lower().replace(" ", "-"),
        "status": "context_ready",
        "summary": {
            "merchant_name": payload.merchant_name,
            "category": payload.category,
            "primary_goal": payload.primary_goal,
            "connected_sources": ["catalog_csv", "orders_csv", "inventory_csv"],
            "excluded_signals": payload.excluded_signals,
        },
    }


@router.get("/products", response_model=list[Product])
def list_products() -> list[Product]:
    try:
        return repository.load_products()
    except repository.RepositoryError as exc:
        raise _data_error(exc) from exc


@router.post("/search", response_model=list[SearchResult])
def search_products(payload: SearchRequest) -> list[SearchResult]:
    try:
        return semantic_search(repository.load_products(), payload.query, payload.goal)
    except repository.RepositoryError as exc:
        raise _data_error(exc) from exc


@router.get("/recommendations", response_model=list[Recommendation])
def list_recommendations() -> list[Recommendation]:
    try:
        return repository.load_recommendations()
    except repository.RepositoryError as exc:
        raise _data_error(exc) from exc


@router.patch("/recommendations/{recommendation_id}", response_model=Recommendation)
def change_recommendation(recommendation_id: str, payload: RecommendationFeedback) -> Recommendation:
    try:
        return repository.update_recommendation_feedback(recommendation_id, payload)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Recommendation not found") from exc
    except repository.RepositoryError as exc:
        raise _data_error(exc) from exc


@router.get("/reports", response_model=list[CampaignReport])
def reports() -> list[CampaignReport]:
    try:
        return repository.load_reports()
    except repository.RepositoryError as exc:
        raise _data_error(exc) from exc


@router.get("/privacy", response_model=list[PrivacyPreference])
def privacy_preferences() -> list[PrivacyPreference]:
    try:
        return repository.load_privacy_preferences()
    except repository.RepositoryError as exc:
        raise _data_error(exc) from exc


@router.patch("/privacy/{signal}", response_model=PrivacyPreference)
def change_privacy_preference(signal: str, payload: PrivacyPreferenceUpdate) -> PrivacyPreference:
    try:
        return repository.update_privacy_preference(signal, payload.enabled)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Privacy signal not found") from exc
    except repository.RepositoryError as exc:
        raise _data_error(exc) from exc
