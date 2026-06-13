from enum import Enum

from pydantic import BaseModel, Field


class MerchantGoal(str, Enum):
    repeat_purchase = "repeat_purchase"
    clear_inventory = "clear_inventory"
    increase_aov = "increase_aov"
    reactivate_dormant = "reactivate_dormant"


class OnboardingRequest(BaseModel):
    merchant_name: str = Field(min_length=2, max_length=80)
    category: str = Field(min_length=2, max_length=80)
    primary_goal: MerchantGoal
    channels: list[str] = Field(default_factory=list)
    excluded_signals: list[str] = Field(default_factory=list)


class Product(BaseModel):
    id: str
    name: str
    category: str
    price_vnd: int
    margin_percent: float
    stock: int
    tags: list[str]
    description: str


class SearchResult(BaseModel):
    product: Product
    score: float
    match_reason: str


class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=200)
    goal: MerchantGoal = MerchantGoal.repeat_purchase


class RecommendationStatus(str, Enum):
    draft = "draft"
    approved = "approved"
    rejected = "rejected"
    edited = "edited"


class Recommendation(BaseModel):
    id: str
    title: str
    action_type: str
    target_segment: str
    products: list[Product]
    timing: str
    expected_metric: str
    confidence: float
    risk_flag: str
    evidence: list[str]
    campaign_copy: str
    status: RecommendationStatus = RecommendationStatus.draft


class RecommendationFeedback(BaseModel):
    status: RecommendationStatus
    edited_copy: str | None = None
    reason: str | None = None


class CampaignReport(BaseModel):
    recommendation_id: str
    conversion_lift_percent: float
    aov_lift_percent: float
    repeat_orders: int
    inventory_units_moved: int
    estimated_time_saved_hours: float


class PrivacyPreference(BaseModel):
    signal: str
    enabled: bool
    description: str


class PrivacyPreferenceUpdate(BaseModel):
    enabled: bool
