-- Verified login email for admin OTP sign-in and password reset.

CREATE TABLE IF NOT EXISTS admin_login_emails (
  admin_email VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_admin_login_emails_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_admin_login_emails_email_lower
  ON admin_login_emails (LOWER(email));

CREATE TABLE IF NOT EXISTS admin_email_otp_challenges (
  id BIGSERIAL PRIMARY KEY,
  admin_email VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(128) NOT NULL,
  purpose VARCHAR(32) NOT NULL DEFAULT 'verify',
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_email_otp_challenges_lookup
  ON admin_email_otp_challenges (admin_email, email, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_email_otp_challenges_admin_recent
  ON admin_email_otp_challenges (admin_email, created_at DESC);

ALTER TABLE public.admin_login_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_email_otp_challenges ENABLE ROW LEVEL SECURITY;
