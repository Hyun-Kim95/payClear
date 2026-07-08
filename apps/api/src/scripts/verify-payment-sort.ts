/**
 * mapDebtRow Date 정규화 및 배분 정렬 회귀 검증.
 * 실행: npx tsx src/scripts/verify-payment-sort.ts
 */
import { mapDebtRow } from '../debt-helpers.js'
import type { DebtRow } from '../domain.js'

function sortByOldestFirst(
  items: Array<{ row: DebtRow; balance: number }>,
): Array<{ row: DebtRow; balance: number }> {
  return [...items].sort((a, b) => {
    const dueA = a.row.due_on ?? '9999-12-31'
    const dueB = b.row.due_on ?? '9999-12-31'
    return (
      a.row.occurred_on.localeCompare(b.row.occurred_on) ||
      dueA.localeCompare(dueB) ||
      b.balance - a.balance
    )
  })
}

const raw = {
  id: 'd1',
  user_id: 'u1',
  contact_id: 'c1',
  direction: 'lent',
  principal: 100000,
  occurred_on: new Date('2026-01-15T00:00:00.000Z'),
  reason: '테스트',
  due_on: new Date('2026-02-01T00:00:00.000Z'),
  status: 'active',
  is_split: false,
  agreement_closed: false,
  completed_at: null,
  archived_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  contact_name: '테스트',
}

const row = mapDebtRow(raw)
if (typeof row.occurred_on !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.occurred_on)) {
  throw new Error(`occurred_on must be YYYY-MM-DD string, got ${String(row.occurred_on)}`)
}

const sorted = sortByOldestFirst([
  { row: mapDebtRow({ ...raw, id: 'd2', occurred_on: new Date('2026-03-01') }), balance: 50000 },
  { row, balance: 100000 },
])

if (sorted[0].row.id !== 'd1') {
  throw new Error('oldest_first sort failed')
}

console.log('verify-payment-sort: OK')
