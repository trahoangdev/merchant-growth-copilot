from app.api.schemas import CampaignReport, PrivacyPreference, Product, Recommendation


PRODUCTS = [
    Product(
        id="p-toner-01",
        name="Lotus Balance Toner",
        category="Skincare",
        price_vnd=185000,
        margin_percent=42,
        stock=86,
        tags=["oily skin", "toner", "lightweight", "daily care"],
        description="Alcohol-free toner for oily and combination skin after cleansing.",
    ),
    Product(
        id="p-sun-02",
        name="Urban Shield Sunscreen SPF50",
        category="Skincare",
        price_vnd=265000,
        margin_percent=47,
        stock=124,
        tags=["sunscreen", "oily skin", "office worker", "daily care"],
        description="Non-sticky SPF50 sunscreen for commuters and office workers.",
    ),
    Product(
        id="p-serum-03",
        name="Cica Repair Serum",
        category="Skincare",
        price_vnd=320000,
        margin_percent=51,
        stock=34,
        tags=["sensitive skin", "serum", "repair", "night routine"],
        description="Calming serum for redness and damaged skin barrier.",
    ),
    Product(
        id="p-mask-04",
        name="Hydra Sheet Mask Set",
        category="Skincare",
        price_vnd=99000,
        margin_percent=38,
        stock=210,
        tags=["gift", "under 100k", "hydration", "bundle"],
        description="Five-piece hydration sheet mask set for gifting and add-ons.",
    ),
    Product(
        id="p-case-05",
        name="Soft Grip Phone Case",
        category="Accessories",
        price_vnd=145000,
        margin_percent=55,
        stock=178,
        tags=["student budget", "phone case", "gift", "durable"],
        description="Durable phone case with matte texture for students.",
    ),
    Product(
        id="p-pouch-06",
        name="Mini Travel Cosmetic Pouch",
        category="Accessories",
        price_vnd=125000,
        margin_percent=49,
        stock=92,
        tags=["travel", "gift", "office worker", "organizer"],
        description="Compact pouch for travel skincare and daily office carry.",
    ),
]


RECOMMENDATIONS = [
    Recommendation(
        id="rec-repeat-skincare",
        title="Bundle toner + sunscreen for repeat skincare buyers",
        action_type="Repeat purchase",
        target_segment="Customers who bought cleanser 25-45 days ago",
        products=[PRODUCTS[0], PRODUCTS[1]],
        timing="Before this weekend livestream",
        expected_metric="+16% repeat purchase conversion",
        confidence=0.82,
        risk_flag="Low: uses recent purchase behavior and high-stock products",
        evidence=[
            "1,248 buyers purchased cleanser in the last 45 days.",
            "Sunscreen stock is high and margin is above category average.",
            "Similar routine bundles raised AOV in the last salary-day campaign.",
        ],
        campaign_copy="Your daily skincare routine is almost complete. Pair Lotus Balance Toner with Urban Shield Sunscreen this weekend and save 12%.",
    ),
    Recommendation(
        id="rec-clear-masks",
        title="Move hydration mask inventory through add-on offer",
        action_type="Inventory clearance",
        target_segment="Buyers adding skincare items above 250k",
        products=[PRODUCTS[3]],
        timing="Next 7 days",
        expected_metric="Sell through 80-110 extra units",
        confidence=0.76,
        risk_flag="Medium: discount depth should stay below 15%",
        evidence=[
            "Hydra Sheet Mask stock is 2.3x higher than weekly average demand.",
            "Mask sets convert well as cart add-ons under 100k.",
            "Discounts above 15% reduced perceived value in prior campaigns.",
        ],
        campaign_copy="Add a Hydra Sheet Mask Set to any skincare order over 250k for a limited add-on price.",
    ),
    Recommendation(
        id="rec-office-gift",
        title="Create office-worker gift bundle under 300k",
        action_type="Bundle upsell",
        target_segment="Chat buyers asking for affordable gifts",
        products=[PRODUCTS[1], PRODUCTS[5]],
        timing="Salary week",
        expected_metric="+11% AOV on gift-intent chats",
        confidence=0.79,
        risk_flag="Low: aggregate segment only, no sensitive attributes",
        evidence=[
            "Gift queries under 300k increased in staff search history.",
            "Pouch and sunscreen share strong office-worker intent tags.",
            "Combined bundle remains under the most common stated budget.",
        ],
        campaign_copy="A practical office gift under 300k: Urban Shield Sunscreen plus a Mini Travel Cosmetic Pouch.",
    ),
]


REPORTS = [
    CampaignReport(
        recommendation_id="rec-repeat-skincare",
        conversion_lift_percent=18.4,
        aov_lift_percent=9.2,
        repeat_orders=146,
        inventory_units_moved=212,
        estimated_time_saved_hours=4.5,
    ),
    CampaignReport(
        recommendation_id="rec-clear-masks",
        conversion_lift_percent=10.8,
        aov_lift_percent=5.6,
        repeat_orders=62,
        inventory_units_moved=94,
        estimated_time_saved_hours=3.0,
    ),
    CampaignReport(
        recommendation_id="rec-office-gift",
        conversion_lift_percent=14.1,
        aov_lift_percent=12.7,
        repeat_orders=88,
        inventory_units_moved=131,
        estimated_time_saved_hours=3.8,
    ),
]


PRIVACY_PREFERENCES = [
    PrivacyPreference(
        signal="order_history",
        enabled=True,
        description="Use prior purchases and order timing for segment recommendations.",
    ),
    PrivacyPreference(
        signal="inventory",
        enabled=True,
        description="Use stock and sell-through pressure to prioritize products.",
    ),
    PrivacyPreference(
        signal="margin",
        enabled=True,
        description="Use product margin to avoid low-profit recommendations.",
    ),
    PrivacyPreference(
        signal="chat_intent",
        enabled=False,
        description="Use aggregated customer chat intent without exposing individual messages.",
    ),
]
