from app.api.schemas import Recommendation, RecommendationFeedback


def update_recommendation_status(
    recommendations: list[Recommendation],
    recommendation_id: str,
    feedback: RecommendationFeedback,
) -> Recommendation:
    for recommendation in recommendations:
        if recommendation.id == recommendation_id:
            recommendation.status = feedback.status
            if feedback.edited_copy:
                recommendation.campaign_copy = feedback.edited_copy
            if feedback.reason:
                recommendation.evidence.append(f"Merchant feedback: {feedback.reason}")
            return recommendation
    raise KeyError(recommendation_id)
