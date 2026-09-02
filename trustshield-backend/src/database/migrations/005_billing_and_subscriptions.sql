BEGIN;

-- ============================================================
-- TRUSTSHIELD — BILLING & SUBSCRIPTIONS SYSTEM
-- Migration: 005_billing_and_subscriptions.sql
--
-- Additive migration only.
-- Existing tables and data are preserved.
-- ============================================================

-- 1. PLANS TABLE
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'monthly',
    monthly_request_limit INTEGER NOT NULL,
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT plans_price_check
        CHECK (price >= 0),

    CONSTRAINT plans_limit_check
        CHECK (monthly_request_limit > 0),

    CONSTRAINT plans_interval_check
        CHECK (billing_interval IN ('monthly', 'yearly'))
);

CREATE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);

-- 2. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    provider VARCHAR(50) NOT NULL DEFAULT 'paystack',
    provider_customer_id VARCHAR(255),
    provider_subscription_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT subscriptions_status_check
        CHECK (status IN ('active', 'pending', 'past_due', 'cancelled', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_sub ON subscriptions(provider_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);

-- 3. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'paystack',
    provider_transaction_id VARCHAR(255) UNIQUE,
    reference VARCHAR(255) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT payments_status_check
        CHECK (status IN ('pending', 'success', 'failed', 'refunded')),

    CONSTRAINT payments_amount_check
        CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- 4. BILLING EVENTS TABLE (Idempotency Store)
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_billing_events_event_id ON billing_events(event_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_provider ON billing_events(provider);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at DESC);

-- 5. SEED CANONICAL PLANS
INSERT INTO plans (
    name,
    slug,
    description,
    price,
    currency,
    billing_interval,
    monthly_request_limit,
    rate_limit_per_minute,
    features
)
VALUES
(
    'Free',
    'free',
    'Essential digital trust verification for individual developers and testing.',
    0.00,
    'USD',
    'monthly',
    500,
    60,
    '[
        "500 trust checks / month",
        "Basic dashboard analytics",
        "Developer API access",
        "Standard rate limit (60 req/min)",
        "Community & documentation support"
    ]'::jsonb
),
(
    'Starter',
    'starter',
    'Enhanced capacity and telemetry for growing security-conscious applications.',
    19.00,
    'USD',
    'monthly',
    5000,
    120,
    '[
        "5,000 trust checks / month",
        "Developer API access",
        "Higher rate limit (120 req/min)",
        "Usage analytics & telemetry",
        "Trust intelligence reports",
        "Standard email support"
    ]'::jsonb
),
(
    'Growth',
    'growth',
    'Comprehensive threat detection with Scam DNA engine for high-traffic products.',
    49.00,
    'USD',
    'monthly',
    25000,
    300,
    '[
        "25,000 trust checks / month",
        "Higher API rate limit (300 req/min)",
        "Advanced telemetry & risk analytics",
        "Full Scam DNA intelligence access",
        "Priority threat pattern updates",
        "Priority developer support"
    ]'::jsonb
),
(
    'Business',
    'business',
    'Maximum throughput and enterprise-grade trust infrastructure for businesses.',
    149.00,
    'USD',
    'monthly',
    100000,
    600,
    '[
        "100,000 trust checks / month",
        "High-capacity rate limit (600 req/min)",
        "Dedicated threat intelligence",
        "24/7 Priority SLA support",
        "Business analytics & export",
        "Custom integration assistance"
    ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    billing_interval = EXCLUDED.billing_interval,
    monthly_request_limit = EXCLUDED.monthly_request_limit,
    rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
    features = EXCLUDED.features,
    updated_at = NOW();

COMMIT;
