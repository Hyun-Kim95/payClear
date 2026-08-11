/**
 * AC-01: 상대별 잔액 합산은 active·양수·비분할만 포함 (목록/상세 동일)
 * AC-02: lent → total_receivable, borrowed → total_payable
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aggregateContactBalances } from './payment-helpers.js'

test('AC-01/AC-02 aggregates receivable and payable per contact', () => {
  const map = aggregateContactBalances([
    { contact_id: 'c1', status: 'active', is_split: false, balance: 10000, direction: 'lent' },
    { contact_id: 'c1', status: 'active', is_split: false, balance: 3000, direction: 'borrowed' },
    { contact_id: 'c1', status: 'completed', is_split: false, balance: 999, direction: 'lent' },
    { contact_id: 'c1', status: 'active', is_split: true, balance: 500, direction: 'lent' },
    { contact_id: 'c1', status: 'active', is_split: false, balance: 0, direction: 'borrowed' },
    { contact_id: 'c2', status: 'active', is_split: false, balance: 7000, direction: 'lent' },
  ])

  assert.deepEqual(map.get('c1'), { total_receivable: 10000, total_payable: 3000 })
  assert.deepEqual(map.get('c2'), { total_receivable: 7000, total_payable: 0 })
  assert.equal(map.has('c3'), false)
})
