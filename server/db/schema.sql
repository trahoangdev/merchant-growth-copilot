CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    primary_goal TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    merchant_id UUID REFERENCES merchants(id),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price_vnd INTEGER NOT NULL,
    margin_percent NUMERIC(5, 2) NOT NULL,
    stock INTEGER NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    description TEXT NOT NULL,
    embedding vector(1536)
);

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS recommendations (
    id TEXT PRIMARY KEY,
    merchant_id UUID REFERENCES merchants(id),
    title TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_segment TEXT NOT NULL,
    timing TEXT NOT NULL,
    expected_metric TEXT NOT NULL,
    confidence NUMERIC(4, 3) NOT NULL,
    risk_flag TEXT NOT NULL,
    evidence JSONB NOT NULL,
    campaign_copy TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recommendation_products (
    recommendation_id TEXT NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (recommendation_id, product_id)
);

CREATE TABLE IF NOT EXISTS reports (
    recommendation_id TEXT PRIMARY KEY REFERENCES recommendations(id) ON DELETE CASCADE,
    conversion_lift_percent NUMERIC(6, 2) NOT NULL,
    aov_lift_percent NUMERIC(6, 2) NOT NULL,
    repeat_orders INTEGER NOT NULL,
    inventory_units_moved INTEGER NOT NULL,
    estimated_time_saved_hours NUMERIC(6, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS privacy (
    signal TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id TEXT REFERENCES recommendations(id),
    status TEXT NOT NULL,
    reason TEXT,
    edited_copy TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id),
    query TEXT NOT NULL,
    goal TEXT NOT NULL,
    top_product_id TEXT REFERENCES products(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
