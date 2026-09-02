BEGIN;

-- ============================================================
-- TRUSTSHIELD — SCAM INTELLIGENCE LAYER
-- Migration: 002_scam_intelligence.sql
--
-- Additive migration only.
-- Existing users and analyses tables are NOT modified.
-- ============================================================


-- ============================================================
-- 1. SCAM PATTERNS
-- ============================================================

CREATE TABLE IF NOT EXISTS scam_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    pattern_code VARCHAR(100) NOT NULL UNIQUE,

    pattern_name VARCHAR(255) NOT NULL,

    country_code VARCHAR(2) NOT NULL DEFAULT 'NG',

    category VARCHAR(100) NOT NULL,

    description TEXT NOT NULL,

    severity VARCHAR(20) NOT NULL,

    recommendation VARCHAR(30) NOT NULL,

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT scam_patterns_severity_check
        CHECK (
            severity IN (
                'low',
                'medium',
                'high',
                'critical'
            )
        ),

    CONSTRAINT scam_patterns_recommendation_check
        CHECK (
            recommendation IN (
                'CAUTION',
                'VERIFY',
                'AVOID'
            )
        ),

    CONSTRAINT scam_patterns_country_code_check
        CHECK (
            country_code ~ '^[A-Z]{2}$'
        )
);


CREATE INDEX IF NOT EXISTS idx_scam_patterns_country
    ON scam_patterns(country_code);

CREATE INDEX IF NOT EXISTS idx_scam_patterns_category
    ON scam_patterns(category);

CREATE INDEX IF NOT EXISTS idx_scam_patterns_enabled
    ON scam_patterns(enabled);


-- ============================================================
-- 2. SCAM PATTERN SIGNALS
-- ============================================================

CREATE TABLE IF NOT EXISTS scam_pattern_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    pattern_id UUID NOT NULL,

    signal_code VARCHAR(100) NOT NULL,

    required BOOLEAN NOT NULL DEFAULT FALSE,

    weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT scam_pattern_signals_pattern_fk
        FOREIGN KEY (pattern_id)
        REFERENCES scam_patterns(id)
        ON DELETE CASCADE,

    CONSTRAINT scam_pattern_signals_weight_check
        CHECK (
            weight > 0
        ),

    CONSTRAINT scam_pattern_signals_unique
        UNIQUE (
            pattern_id,
            signal_code
        )
);


CREATE INDEX IF NOT EXISTS idx_scam_pattern_signals_pattern
    ON scam_pattern_signals(pattern_id);

CREATE INDEX IF NOT EXISTS idx_scam_pattern_signals_code
    ON scam_pattern_signals(signal_code);


-- ============================================================
-- 3. ANALYSIS CONTEXT
-- ============================================================

CREATE TABLE IF NOT EXISTS analysis_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    analysis_id UUID NOT NULL UNIQUE,

    context_text TEXT NOT NULL,

    extracted_signals JSONB NOT NULL DEFAULT '{}'::jsonb,

    language VARCHAR(20),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT analysis_context_analysis_fk
        FOREIGN KEY (analysis_id)
        REFERENCES analyses(id)
        ON DELETE CASCADE,

    CONSTRAINT analysis_context_signals_object_check
        CHECK (
            jsonb_typeof(extracted_signals) = 'object'
        )
);


CREATE INDEX IF NOT EXISTS idx_analysis_context_analysis
    ON analysis_context(analysis_id);


-- ============================================================
-- 4. SCAM PATTERN MATCHES
-- ============================================================

CREATE TABLE IF NOT EXISTS scam_pattern_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    analysis_id UUID NOT NULL,

    pattern_id UUID NOT NULL,

    confidence NUMERIC(5,4) NOT NULL,

    matched_signals JSONB NOT NULL DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT scam_pattern_matches_analysis_fk
        FOREIGN KEY (analysis_id)
        REFERENCES analyses(id)
        ON DELETE CASCADE,

    CONSTRAINT scam_pattern_matches_pattern_fk
        FOREIGN KEY (pattern_id)
        REFERENCES scam_patterns(id)
        ON DELETE CASCADE,

    CONSTRAINT scam_pattern_matches_confidence_check
        CHECK (
            confidence >= 0
            AND confidence <= 1
        ),

    CONSTRAINT scam_pattern_matches_signals_array_check
        CHECK (
            jsonb_typeof(matched_signals) = 'array'
        ),

    CONSTRAINT scam_pattern_matches_unique
        UNIQUE (
            analysis_id,
            pattern_id
        )
);


CREATE INDEX IF NOT EXISTS idx_scam_pattern_matches_analysis
    ON scam_pattern_matches(analysis_id);

CREATE INDEX IF NOT EXISTS idx_scam_pattern_matches_pattern
    ON scam_pattern_matches(pattern_id);

CREATE INDEX IF NOT EXISTS idx_scam_pattern_matches_confidence
    ON scam_pattern_matches(confidence DESC);


-- ============================================================
-- 5. NIGERIA-FIRST SCAM DNA PATTERNS
-- ============================================================

INSERT INTO scam_patterns (
    pattern_code,
    pattern_name,
    country_code,
    category,
    description,
    severity,
    recommendation
)
VALUES

(
    'NG-GOV-GRANT-001',
    'Government Grant Impersonation',
    'NG',
    'financial_scam',
    'Impersonation of a government institution using a financial grant, reward, or public-benefit lure to obtain sensitive information or money.',
    'critical',
    'AVOID'
),

(
    'NG-BANK-IMPERSONATION-001',
    'Banking Impersonation',
    'NG',
    'financial_scam',
    'Impersonation of a bank or banking service to obtain credentials, verification information, or financial details.',
    'critical',
    'AVOID'
),

(
    'NG-FINTECH-IMPERSONATION-001',
    'Fintech Impersonation',
    'NG',
    'financial_scam',
    'Impersonation of a fintech, digital wallet, payment platform, or financial technology service to obtain sensitive information or payment.',
    'critical',
    'AVOID'
),

(
    'NG-FAKE-JOB-001',
    'Fake Job or Recruitment Scam',
    'NG',
    'employment_scam',
    'Fraudulent employment or recruitment opportunity designed to obtain money, credentials, identity information, or other sensitive data.',
    'high',
    'VERIFY'
),

(
    'NG-INVESTMENT-001',
    'Investment Scam',
    'NG',
    'investment_scam',
    'Fraudulent investment opportunity using financial-return promises, urgency, or payment requests to persuade a victim to transfer money.',
    'critical',
    'AVOID'
),

(
    'NG-DELIVERY-001',
    'Delivery or Parcel Scam',
    'NG',
    'delivery_scam',
    'Fraudulent delivery or parcel notification requesting payment, verification, or sensitive information.',
    'high',
    'AVOID'
),

(
    'NG-ACCOUNT-VERIFY-001',
    'Account Verification Scam',
    'NG',
    'credential_theft',
    'Fraudulent account-security or verification request intended to capture credentials or authentication information.',
    'high',
    'AVOID'
),

(
    'NG-BVN-NIN-001',
    'BVN or NIN Data Theft',
    'NG',
    'identity_theft',
    'Suspicious request for BVN, NIN, or related identity information in a context associated with fraud or impersonation.',
    'critical',
    'AVOID'
),

(
    'NG-OTP-PIN-001',
    'OTP or PIN Credential Theft',
    'NG',
    'credential_theft',
    'Attempt to obtain OTP, PIN, password, or authentication information through deceptive communication or impersonation.',
    'critical',
    'AVOID'
),

(
    'NG-PAYMENT-001',
    'Suspicious Payment Request',
    'NG',
    'payment_scam',
    'Deceptive request for payment associated with a suspicious reward, service, account, delivery, investment, or other claim.',
    'high',
    'AVOID'
)

ON CONFLICT (pattern_code) DO NOTHING;


-- ============================================================
-- 6. PATTERN SIGNAL DEFINITIONS
--
-- These signal codes are consumed by the deterministic
-- Scam DNA engine.
--
-- Existing URL Analyzer signals are reused directly where
-- applicable rather than being recreated.
-- ============================================================


-- ------------------------------------------------------------
-- Government Grant Impersonation
-- ------------------------------------------------------------

INSERT INTO scam_pattern_signals (
    pattern_id,
    signal_code,
    required,
    weight
)
SELECT
    id,
    signal_code,
    required,
    weight
FROM scam_patterns
CROSS JOIN (
    VALUES
        ('GOVERNMENT_CLAIM', TRUE, 3.00),
        ('FINANCIAL_LURE', TRUE, 3.00),
        ('URGENCY', FALSE, 1.50),
        ('BVN_REQUEST', FALSE, 2.50),
        ('NIN_REQUEST', FALSE, 2.50),
        ('PAYMENT_REQUEST', FALSE, 2.00),
        ('SUSPICIOUS_TLD', FALSE, 1.50),
        ('URL_SHORTENER', FALSE, 1.00),
        ('IP_ADDRESS_HOST', FALSE, 2.00)
) AS signals(signal_code, required, weight)
WHERE pattern_code = 'NG-GOV-GRANT-001'
ON CONFLICT (pattern_id, signal_code) DO NOTHING;


-- ------------------------------------------------------------
-- Banking Impersonation
-- ------------------------------------------------------------

INSERT INTO scam_pattern_signals (
    pattern_id,
    signal_code,
    required,
    weight
)
SELECT
    id,
    signal_code,
    required,
    weight
FROM scam_patterns
CROSS JOIN (
    VALUES
        ('BANKING_CLAIM', TRUE, 3.00),
        ('CREDENTIAL_REQUEST', TRUE, 2.50),
        ('OTP_REQUEST', FALSE, 3.00),
        ('PIN_REQUEST', FALSE, 3.00),
        ('CARD_REQUEST', FALSE, 3.00),
        ('URGENCY', FALSE, 1.50),
        ('LOGIN_RELATED_PATH', FALSE, 1.50),
        ('SUSPICIOUS_TLD', FALSE, 1.50),
        ('AT_SYMBOL_IN_URL', FALSE, 2.00)
) AS signals(signal_code, required, weight)
WHERE pattern_code = 'NG-BANK-IMPERSONATION-001'
ON CONFLICT (pattern_id, signal_code) DO NOTHING;


-- ------------------------------------------------------------
-- Fintech Impersonation
-- ------------------------------------------------------------

INSERT INTO scam_pattern_signals (
    pattern_id,
    signal_code,
    required,
    weight
)
SELECT
    id,
    signal_code,
    required,
    weight
FROM scam_patterns
CROSS JOIN (
    VALUES
        ('FINTECH_CLAIM', TRUE, 3.00),
        ('CREDENTIAL_REQUEST', TRUE, 2.50),
        ('OTP_REQUEST', FALSE, 3.00),
        ('PIN_REQUEST', FALSE, 3.00),
        ('PAYMENT_REQUEST', FALSE, 2.00),
        ('URGENCY', FALSE, 1.50),
        ('LOGIN_RELATED_PATH', FALSE, 1.50),
        ('URL_SHORTENER', FALSE, 1.00)
) AS signals(signal_code, required, weight)
WHERE pattern_code = 'NG-FINTECH-IMPERSONATION-001'
ON CONFLICT (pattern_id, signal_code) DO NOTHING;


-- ------------------------------------------------------------
-- Fake Job / Recruitment
-- ------------------------------------------------------------

INSERT INTO scam_pattern_signals (
    pattern_id,
    signal_code,
    required,
    weight
)
SELECT
    id,
    signal_code,
    required,
    weight
FROM scam_patterns
CROSS JOIN (
    VALUES
        ('JOB_CLAIM', TRUE, 3.00),
        ('FINANCIAL_LURE', FALSE, 2.00),
        ('PAYMENT_REQUEST', FALSE, 2.50),
        ('URGENCY', FALSE, 1.50),
        ('CREDENTIAL_REQUEST', FALSE, 2.00),
        ('BVN_REQUEST', FALSE, 2.00),
        ('NIN_REQUEST', FALSE, 2.00),
        ('URL_SHORTENER', FALSE, 1.00)
) AS signals(signal_code, required, weight)
WHERE pattern_code = 'NG-FAKE-JOB-001'
ON CONFLICT (pattern_id, signal_code) DO NOTHING;


-- ------------------------------------------------------------
-- Investment Scam
-- ------------------------------------------------------------

INSERT INTO scam_pattern_signals (
    pattern_id,
    signal_code,
    required,
    weight
)
SELECT
    id,
    signal_code,
    required,
    weight
FROM scam_patterns
CROSS JOIN (
    VALUES
        ('INVESTMENT_CLAIM', TRUE, 3.00),
        ('FINANCIAL_LURE', TRUE, 3.00),
        ('PAYMENT_REQUEST', FALSE, 2.50),
        ('URGENCY', FALSE, 1.50),
        ('CREDENTIAL_REQUEST', FALSE, 1.50),
        ('SUSPICIOUS_TLD', FALSE, 1.50),
        ('URL_SHORTENER', FALSE, 1.00)
) AS signals(signal_code, required, weight)
WHERE pattern_code = 'NG-INVESTMENT-001'
ON CONFLICT (pattern_id, signal_code) DO NOTHING;


-- ------------------------------------------------------------
-- Delivery / Parcel Scam
-- ------------------------------------------------------------

INSERT INTO scam_pattern_signals (
    pattern_id,
    signal_code,
    required,
    weight
)
SELECT
    id,
    signal_code,
    required,
    weight
FROM scam_patterns
CROSS JOIN (
    VALUES
        ('DELIVERY_CLAIM', TRUE, 3.00),
        ('PAYMENT_REQUEST', FALSE, 2.50),
        ('URGENCY', FALSE, 2.00),
        ('CREDENTIAL_REQUEST', FALSE, 1.50),
        ('CARD_REQUEST', FALSE, 2.50),
        ('URL_SHORTENER', FALSE, 1.00),
        ('SUSPICIOUS_TLD', FALSE, 1.50)
) AS signals(signal_code, required, weight)
WHERE pattern_code = 'NG-DELIVERY-001'
ON CONFLICT (pattern_id, signal_code) DO NOTHING;


-- ------------------------------------------------------------
-- Account Verification Scam
-- ------------------------------------------------------------

INSERT INTO scam_pattern_signals (
    pattern_id,
    signal_code,
    required,
    weight
)
SELECT
    id,
    signal_code,
    required,
    weight
FROM scam_patterns
CROSS JOIN (
    VALUES
        ('CREDENTIAL_REQUEST', TRUE, 3.00),
        ('URGENCY', FALSE, 2.00),
        ('OTP_REQUEST', FALSE, 3.00),
        ('PIN_REQUEST', FALSE, 3.00),
        ('LOGIN_RELATED_PATH', FALSE, 1.50),
        ('REDIRECT_PARAMETER', FALSE, 1.50),
        ('AT_SYMBOL_IN_URL', FALSE, 2.00)
) AS signals(signal_code, required, weight)
WHERE pattern_code = 'NG-ACCOUNT-VERIFY-001'
ON CONFLICT (pattern_id, signal_code) DO NOTHING;


-- ------------------------------------------------------------
-- BVN / NIN Data Theft
-- ------------------------------------------------------------

INSERT INTO scam_pattern_signals (
    pattern_id,
    signal_code,
    required,
    weight
)
SELECT
    id,
    signal_code,
    required,
    weight
FROM scam_patterns
CROSS JOIN (
    VALUES
        ('BVN_REQUEST', FALSE, 3.00),
        ('NIN_REQUEST', FALSE, 3.00),
        ('GOVERNMENT_CLAIM', FALSE, 2.00),
        ('BANKING_CLAIM', FALSE, 2.00),
        ('FINTECH_CLAIM', FALSE, 2.00),
        ('URGENCY', FALSE, 1.50),
        ('CREDENTIAL_REQUEST', FALSE, 2.00),
        ('PAYMENT_REQUEST', FALSE, 2.00)
) AS signals(signal_code, required, weight)
WHERE pattern_code = 'NG-BVN-NIN-001'
ON CONFLICT (pattern_id, signal_code) DO NOTHING;


-- ------------------------------------------------------------
-- OTP / PIN Credential Theft
-- ------------------------------------------------------------

INSERT INTO scam_pattern_signals (
    pattern_id,
    signal_code,
    required,
    weight
)
SELECT
    id,
    signal_code,
    required,
    weight
FROM scam_patterns
CROSS JOIN (
    VALUES
        ('OTP_REQUEST', FALSE, 3.00),
        ('PIN_REQUEST', FALSE, 3.00),
        ('CREDENTIAL_REQUEST', FALSE, 2.50),
        ('BANKING_CLAIM', FALSE, 2.00),
        ('FINTECH_CLAIM', FALSE, 2.00),
        ('URGENCY', FALSE, 1.50),
        ('LOGIN_RELATED_PATH', FALSE, 1.50)
) AS signals(signal_code, required, weight)
WHERE pattern_code = 'NG-OTP-PIN-001'
ON CONFLICT (pattern_id, signal_code) DO NOTHING;


-- ------------------------------------------------------------
-- Suspicious Payment Request
-- ------------------------------------------------------------

INSERT INTO scam_pattern_signals (
    pattern_id,
    signal_code,
    required,
    weight
)
SELECT
    id,
    signal_code,
    required,
    weight
FROM scam_patterns
CROSS JOIN (
    VALUES
        ('PAYMENT_REQUEST', TRUE, 3.00),
        ('FINANCIAL_LURE', FALSE, 2.00),
        ('URGENCY', FALSE, 2.00),
        ('GOVERNMENT_CLAIM', FALSE, 1.50),
        ('JOB_CLAIM', FALSE, 1.50),
        ('DELIVERY_CLAIM', FALSE, 1.50),
        ('INVESTMENT_CLAIM', FALSE, 2.00),
        ('URL_SHORTENER', FALSE, 1.00),
        ('SUSPICIOUS_TLD', FALSE, 1.50)
) AS signals(signal_code, required, weight)
WHERE pattern_code = 'NG-PAYMENT-001'
ON CONFLICT (pattern_id, signal_code) DO NOTHING;


COMMIT;