-- 배분 전략: 최근순·잔액 작은 순 추가
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_payment_strategy_check;

ALTER TABLE contacts
  ADD CONSTRAINT contacts_payment_strategy_check
  CHECK (payment_strategy IN ('oldest_first', 'largest_first', 'newest_first', 'smallest_first'));
