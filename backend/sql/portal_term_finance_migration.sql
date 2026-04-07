-- Apply once to existing databases: quarter finance settings + adjustment source for late fees.
-- Idempotent-ish: ignores duplicate column/table errors when re-run manually.

CREATE TABLE IF NOT EXISTS portal_term_finance_settings (
  term VARCHAR(32) NOT NULL,
  year INT NOT NULL,
  payment_due_date DATE NULL,
  late_fee_enabled TINYINT(1) NOT NULL DEFAULT 1,
  late_fee_amount DECIMAL(12, 2) NOT NULL DEFAULT 30.00,
  updated_by VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (term, year)
);

-- Distinguish manual admin charges from system-generated late fees (idempotent late fee runs).
ALTER TABLE portal_billing_adjustments
  ADD COLUMN adjustment_source ENUM('manual', 'system_late_fee') NOT NULL DEFAULT 'manual'
  AFTER category;
