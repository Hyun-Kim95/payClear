-- 분할 할부 상환: 균등 1/N 참여자 + 참여자별 회차 할부 일정
-- 기존(비분할) 채무는 is_split=false, participant_id NULL로 영향 없음.

ALTER TABLE debts ADD COLUMN IF NOT EXISTS is_split BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS debt_participants (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  seq INT NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  contact_id TEXT REFERENCES contacts(id),
  share_amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS installments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES debt_participants(id) ON DELETE CASCADE,
  seq INT NOT NULL,
  due_on DATE NOT NULL,
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ledger_entries
  ADD COLUMN IF NOT EXISTS participant_id TEXT REFERENCES debt_participants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_participants_debt ON debt_participants(debt_id);
CREATE INDEX IF NOT EXISTS idx_installments_debt ON installments(debt_id);
CREATE INDEX IF NOT EXISTS idx_installments_due ON installments(due_on);
CREATE INDEX IF NOT EXISTS idx_ledger_participant ON ledger_entries(participant_id);
