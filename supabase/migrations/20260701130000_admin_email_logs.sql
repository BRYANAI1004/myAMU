-- Audit trail for admin bulk / mass email sends.

CREATE TABLE IF NOT EXISTS admin_email_logs (
  id BIGSERIAL PRIMARY KEY,
  kind VARCHAR(32) NOT NULL,
  sent_by_admin_email VARCHAR(255) NOT NULL,
  sent_by_display_name VARCHAR(255) NULL,
  from_address VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  recipient_count INT NOT NULL,
  delivery_mode VARCHAR(8) NOT NULL DEFAULT 'bcc',
  delivered BOOLEAN NOT NULL DEFAULT FALSE,
  message_id VARCHAR(255) NULL,
  smtp_profile_id VARCHAR(64) NULL,
  attachment_count INT NOT NULL DEFAULT 0,
  attachment_names JSONB NULL,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_email_logs_created_at
  ON admin_email_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_email_logs_sent_by
  ON admin_email_logs (LOWER(sent_by_admin_email), created_at DESC);

ALTER TABLE public.admin_email_logs ENABLE ROW LEVEL SECURITY;
