-- Clearcut schema (Postgres / Neon). Applied by `npm run migrate`; safe to run again.

CREATE TABLE IF NOT EXISTS users (
    clerk_id    TEXT PRIMARY KEY,
    email       TEXT NOT NULL DEFAULT '',
    name        TEXT NOT NULL DEFAULT '',
    photo       TEXT NOT NULL DEFAULT '',
    credits     INTEGER NOT NULL DEFAULT 5 CHECK (credits >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (lower(email));

-- One processed photo. The binary versions live in their own columns and are only
-- selected when a file is served.
CREATE TABLE IF NOT EXISTS images (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner           TEXT NOT NULL REFERENCES users (clerk_id) ON DELETE CASCADE,
    name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
    width           INTEGER NOT NULL,
    height          INTEGER NOT NULL,
    original        BYTEA NOT NULL,
    original_mime   TEXT NOT NULL,
    result          BYTEA NOT NULL,          -- transparent PNG
    thumb           BYTEA NOT NULL,          -- small WebP of the cutout
    original_bytes  INTEGER NOT NULL,
    result_bytes    INTEGER NOT NULL,
    provider        TEXT NOT NULL,
    duration_ms     INTEGER NOT NULL,
    favorite        BOOLEAN NOT NULL DEFAULT false,
    sample          BOOLEAN NOT NULL DEFAULT false,  -- seeded demo content
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS images_owner_created_idx ON images (owner, created_at DESC);

-- A credit pack purchase. Credits are added once, when the payment is verified with the provider.
CREATE TABLE IF NOT EXISTS transactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner        TEXT NOT NULL REFERENCES users (clerk_id) ON DELETE CASCADE,
    plan         TEXT NOT NULL,
    credits      INTEGER NOT NULL CHECK (credits > 0),
    amount       INTEGER NOT NULL,           -- minor units (cents, paise)
    currency     TEXT NOT NULL,
    provider     TEXT NOT NULL CHECK (provider IN ('stripe', 'razorpay')),
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    provider_ref TEXT,                       -- Stripe session id / Razorpay order id
    payment_id   TEXT,
    paid_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS transactions_owner_idx ON transactions (owner, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS transactions_ref_idx ON transactions (provider, provider_ref);
