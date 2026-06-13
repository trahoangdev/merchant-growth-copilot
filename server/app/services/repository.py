from dataclasses import dataclass

from app.api.schemas import CampaignReport, PrivacyPreference, Product, Recommendation, RecommendationFeedback
from app.core.config import get_settings
from app.services import data_store, supabase_store


class RepositoryError(RuntimeError):
    pass


class RepositoryUnavailableError(RepositoryError):
    pass


@dataclass(frozen=True)
class RepositoryStatus:
    ready: bool
    source: str
    required: list[str]
    missing: list[str]


def status() -> RepositoryStatus:
    if _use_supabase():
        supabase_status = supabase_store.supabase_status()
        return RepositoryStatus(
            ready=supabase_status.ready,
            source=supabase_status.source,
            required=supabase_status.required_tables,
            missing=supabase_status.missing_tables,
        )

    csv_status = data_store.data_status()
    return RepositoryStatus(
        ready=csv_status.ready,
        source=csv_status.data_dir,
        required=csv_status.required_files,
        missing=csv_status.missing_files,
    )


def load_products() -> list[Product]:
    return _call(supabase_store.load_products if _use_supabase() else data_store.load_products)


def load_recommendations() -> list[Recommendation]:
    return _call(supabase_store.load_recommendations if _use_supabase() else data_store.load_recommendations)


def load_reports() -> list[CampaignReport]:
    return _call(supabase_store.load_reports if _use_supabase() else data_store.load_reports)


def load_privacy_preferences() -> list[PrivacyPreference]:
    return _call(supabase_store.load_privacy_preferences if _use_supabase() else data_store.load_privacy_preferences)


def update_privacy_preference(signal: str, enabled: bool) -> PrivacyPreference:
    return _call(
        lambda: (
            supabase_store.update_privacy_preference(signal, enabled)
            if _use_supabase()
            else data_store.update_privacy_preference(signal, enabled)
        )
    )


def update_recommendation_feedback(recommendation_id: str, feedback: RecommendationFeedback) -> Recommendation:
    return _call(
        lambda: (
            supabase_store.update_recommendation_feedback(recommendation_id, feedback)
            if _use_supabase()
            else data_store.update_recommendation_feedback(recommendation_id, feedback)
        )
    )


def _use_supabase() -> bool:
    return get_settings().data_source.lower() == "supabase"


def _call(func):
    try:
        return func()
    except (data_store.DataUnavailableError, supabase_store.SupabaseUnavailableError) as exc:
        raise RepositoryUnavailableError(str(exc)) from exc
    except (data_store.DataStoreError, supabase_store.SupabaseStoreError) as exc:
        raise RepositoryError(str(exc)) from exc
