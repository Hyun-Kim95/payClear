-- 상대별 정기 상환 주기 (채무 due_on 과 별도)
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS due_schedule_type TEXT NOT NULL DEFAULT 'none'
  CHECK (due_schedule_type IN ('none', 'monthly', 'weekly'));

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS due_schedule_value SMALLINT NULL;

ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_due_schedule_value_check;

ALTER TABLE contacts
  ADD CONSTRAINT contacts_due_schedule_value_check
  CHECK (
    (due_schedule_type = 'none' AND due_schedule_value IS NULL)
    OR (due_schedule_type = 'monthly' AND due_schedule_value BETWEEN 1 AND 31)
    OR (due_schedule_type = 'weekly' AND due_schedule_value BETWEEN 0 AND 6)
  );
