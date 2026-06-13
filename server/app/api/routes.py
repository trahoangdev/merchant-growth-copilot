from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    CampaignReport,
    OnboardingRequest,
    PrivacyPreference,
    Product,
    Recommendation,
    RecommendationFeedback,
    SearchRequest,
    SearchResult,
)
from app.data.mock_data import PRIVACY_PREFERENCES, PRODUCTS, RECOMMENDATIONS, REPORTS
from app.services.recommendations import update_recommendation_status
from app.services.search import semantic_search

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/onboarding")
def save_onboarding(payload: OnboardingRequest) -> dict[str, object]:
    return {
        "merchant_id": "m-linh-cosmetics",
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
    return PRODUCTS


@router.post("/search", response_model=list[SearchResult])
def search_products(payload: SearchRequest) -> list[SearchResult]:
    return semantic_search(PRODUCTS, payload.query, payload.goal)


@router.get("/recommendations", response_model=list[Recommendation])
def list_recommendations() -> list[Recommendation]:
    return RECOMMENDATIONS


@router.patch("/recommendations/{recommendation_id}", response_model=Recommendation)
def change_recommendation(recommendation_id: str, payload: RecommendationFeedback) -> Recommendation:
    try:
        return update_recommendation_status(RECOMMENDATIONS, recommendation_id, payload)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Recommendation not found") from exc


@router.get("/reports", response_model=list[CampaignReport])
def reports() -> list[CampaignReport]:
    return REPORTS


@router.get("/privacy", response_model=list[PrivacyPreference])
def privacy_preferences() -> list[PrivacyPreference]:
    return PRIVACY_PREFERENCES
