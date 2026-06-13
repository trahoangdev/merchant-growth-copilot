from app.api.schemas import MerchantGoal, Product, SearchResult


GOAL_BOOSTS: dict[MerchantGoal, list[str]] = {
    MerchantGoal.repeat_purchase: ["daily care", "routine", "skincare"],
    MerchantGoal.clear_inventory: ["bundle", "gift", "add-on"],
    MerchantGoal.increase_aov: ["bundle", "gift", "office worker"],
    MerchantGoal.reactivate_dormant: ["gift", "daily care", "under 100k"],
}


def _tokenize(value: str) -> set[str]:
    return {token.strip().lower() for token in value.replace("-", " ").replace(",", " ").split() if token.strip()}


def score_product(product: Product, query: str, goal: MerchantGoal) -> tuple[float, str]:
    query_tokens = _tokenize(query)
    product_text = " ".join([product.name, product.category, product.description, " ".join(product.tags)])
    product_tokens = _tokenize(product_text)

    lexical_overlap = len(query_tokens & product_tokens)
    phrase_bonus = 2 if any(tag in query.lower() for tag in product.tags) else 0
    goal_bonus = sum(1 for tag in GOAL_BOOSTS[goal] if tag in product.tags)
    stock_bonus = min(product.stock / 200, 1)
    margin_bonus = product.margin_percent / 100

    score = lexical_overlap * 1.8 + phrase_bonus + goal_bonus * 0.8 + stock_bonus + margin_bonus
    reason_parts = []
    if lexical_overlap:
        reason_parts.append("matches customer wording")
    if goal_bonus:
        reason_parts.append("fits the selected growth goal")
    if product.stock > 80:
        reason_parts.append("has enough stock for campaign demand")
    if product.margin_percent >= 45:
        reason_parts.append("protects margin")

    reason = ", ".join(reason_parts) if reason_parts else "closest catalog context match"
    return round(score, 2), reason


def semantic_search(products: list[Product], query: str, goal: MerchantGoal, limit: int = 4) -> list[SearchResult]:
    results = []
    for product in products:
        score, reason = score_product(product, query, goal)
        results.append(SearchResult(product=product, score=score, match_reason=reason))
    return sorted(results, key=lambda item: item.score, reverse=True)[:limit]
