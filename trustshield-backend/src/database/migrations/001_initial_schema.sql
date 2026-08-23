CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'user',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_role_check
        CHECK (role IN ('user', 'admin'))
);

CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    url TEXT NOT NULL,

    risk_score INTEGER NOT NULL,

    risk_level VARCHAR(20) NOT NULL,

    summary TEXT NOT NULL,

    indicators JSONB NOT NULL DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT analyses_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT analyses_score_check
        CHECK (risk_score >= 0 AND risk_score <= 100),

    CONSTRAINT analyses_risk_level_check
        CHECK (
            risk_level IN (
                'low',
                'medium',
                'high',
                'critical'
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id
    ON analyses(user_id);

CREATE INDEX IF NOT EXISTS idx_analyses_created_at
    ON analyses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analyses_user_created
    ON analyses(user_id, created_at DESC);