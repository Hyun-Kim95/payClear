-- share_tokens extensions (F16)

ALTER TABLE share_tokens
  ADD COLUMN IF NOT EXISTS include_reason BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE share_tokens
  ADD COLUMN IF NOT EXISTS pin_failed_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE share_tokens
  ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_share_tokens_debt_active
  ON share_tokens(debt_id)
  WHERE revoked_at IS NULL;
