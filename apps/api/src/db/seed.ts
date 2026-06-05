import { randomUUID } from 'crypto'
import { query } from './pool.js'

const DEMO_USER = 'user-1'

export async function seedDemo() {
  const existing = await query('SELECT id FROM users WHERE id = $1', [DEMO_USER])
  if (existing.rows.length > 0) {
    console.log('Seed skipped: demo user exists')
    return
  }

  await query('INSERT INTO users (id, email, email_verified_at) VALUES ($1, $2, NOW())', [
    DEMO_USER,
    'demo@payclear.local',
  ])

  const contacts = [
    { id: randomUUID(), name: '김민수' },
    { id: randomUUID(), name: '박지영' },
    { id: randomUUID(), name: '이준호' },
    { id: randomUUID(), name: '최수연' },
    { id: randomUUID(), name: '정우진' },
  ]

  for (const c of contacts) {
    await query('INSERT INTO contacts (id, user_id, display_name) VALUES ($1, $2, $3)', [
      c.id,
      DEMO_USER,
      c.name,
    ])
  }

  const debts = [
    {
      id: randomUUID(),
      contact_id: contacts[0].id,
      direction: 'lent',
      principal: 1_000_000,
      occurred_on: '2026-01-10',
      reason: '생활비 대출',
      due_on: '2026-05-28',
      status: 'active',
      agreement_closed: false,
      completed_at: null as string | null,
    },
    {
      id: randomUUID(),
      contact_id: contacts[1].id,
      direction: 'borrowed',
      principal: 500_000,
      occurred_on: '2026-02-05',
      reason: '이사 비용',
      due_on: '2026-06-20',
      status: 'active',
      agreement_closed: false,
      completed_at: null,
    },
    {
      id: randomUUID(),
      contact_id: contacts[2].id,
      direction: 'lent',
      principal: 300_000,
      occurred_on: '2025-11-01',
      reason: '카페 운영 자금',
      due_on: null,
      status: 'completed',
      agreement_closed: true,
      completed_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      contact_id: contacts[3].id,
      direction: 'borrowed',
      principal: 150_000,
      occurred_on: '2026-03-10',
      reason: '점심값',
      due_on: null,
      status: 'completed',
      agreement_closed: false,
      completed_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      contact_id: contacts[4].id,
      direction: 'lent',
      principal: 200_000,
      occurred_on: '2026-04-01',
      reason: '학원비',
      due_on: '2026-07-01',
      status: 'active',
      agreement_closed: false,
      completed_at: null,
    },
  ]

  for (const d of debts) {
    await query(
      `INSERT INTO debts (id, user_id, contact_id, direction, principal, occurred_on, reason, due_on, status, agreement_closed, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        d.id,
        DEMO_USER,
        d.contact_id,
        d.direction,
        d.principal,
        d.occurred_on,
        d.reason,
        d.due_on,
        d.status,
        d.agreement_closed,
        d.completed_at,
      ],
    )
  }

  const ledger = [
    { debt: debts[0].id, type: 'payment', amount: 300_000, occurred_on: '2026-03-01', note: '1차 상환' },
    { debt: debts[0].id, type: 'payment', amount: 200_000, occurred_on: '2026-04-15', note: null },
    { debt: debts[1].id, type: 'payment', amount: 300_000, occurred_on: '2026-05-01', note: null },
    { debt: debts[2].id, type: 'payment', amount: 300_000, occurred_on: '2026-04-20', note: '전액 상환' },
    { debt: debts[3].id, type: 'payment', amount: 150_000, occurred_on: '2026-03-25', note: null },
    { debt: debts[4].id, type: 'payment', amount: 250_000, occurred_on: '2026-05-10', note: '초과 상환' },
  ]

  for (const e of ledger) {
    await query(
      'INSERT INTO ledger_entries (id, debt_id, type, amount, occurred_on, note) VALUES ($1,$2,$3,$4,$5,$6)',
      [randomUUID(), e.debt, e.type, e.amount, e.occurred_on, e.note],
    )
  }

  console.log('Demo seed completed')
}
