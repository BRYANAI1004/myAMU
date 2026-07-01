-- Stored copies of attachments sent with admin email logs (for audit download).

CREATE TABLE IF NOT EXISTS admin_email_log_attachments (
  id BIGSERIAL PRIMARY KEY,
  log_id BIGINT NOT NULL REFERENCES admin_email_logs(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(127) NULL,
  storage_path VARCHAR(512) NOT NULL,
  byte_size INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_email_log_attachments_log_id
  ON admin_email_log_attachments (log_id, id);

ALTER TABLE public.admin_email_log_attachments ENABLE ROW LEVEL SECURITY;
