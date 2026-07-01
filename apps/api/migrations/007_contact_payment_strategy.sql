-- 상대별 일괄 상환 배분 전략
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS payment_strategy TEXT NOT NULL DEFAULT 'oldest_first'
  CHECK (payment_strategy IN ('oldest_first', 'largest_first'));
