/**
 * Phase 1 API smoke (E1~E5, P5b). Requires running API on PORT (default 3910).
 * Usage: npx tsx src/scripts/smoke-phase1.ts
 */
const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3910/api/v1'
const AUTH = { Authorization: 'Bearer dev-token' }

async function req(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { Authorization: AUTH.Authorization }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`OK: ${msg}`)
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10)
}

async function main() {
  const health = await fetch(`${BASE}/health`)
  assert(health.ok, 'health')

  const debts = await req('GET', '/debts')
  assert(debts.status === 200 && debts.data.items?.length > 0, 'list debts')
  const created = await req('POST', '/debts', {
    contact_name: `Smoke ${Date.now()}`,
    direction: 'lent',
    principal: 50000,
    occurred_on: '2026-01-01',
    reason: 'smoke isolated debt',
  })
  assert((created.status === 201 || created.status === 200) && created.data.id, 'create temp debt')
  const debtId = created.data.id as string

  const detail = await req('GET', `/debts/${debtId}`)
  assert(detail.status === 200, 'debt detail')
  let { updated_at } = detail.data

  // E4: payment to zero → completed
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
  const payRes = await req('POST', `/debts/${debtId}/ledger`, {
    type: 'payment',
    amount: Number(detail.data.balance),
    occurred_on: today,
    note: 'smoke full pay',
  })
  if (!(payRes.status === 201 || payRes.status === 200) || !payRes.data.debt) {
    throw new Error(`FAIL: full payment (${payRes.status}) ${JSON.stringify(payRes.data)}`)
  }
  console.log('OK: full payment')
  assert(payRes.data.debt?.status === 'completed', 'E4 auto completed')
  assert(payRes.data.debt?.display_label === '완료', 'E4 display 완료')
  updated_at = payRes.data.debt.updated_at

  // P5b/X17: agreement closed keeps 합의 종료 label even with balance > 0 after adjustment
  const agree = await req('PATCH', `/debts/${debtId}/status`, {
    action: 'complete_agreement',
    updated_at,
  })
  assert(agree.status === 200, 'complete_agreement')
  assert(agree.data.display_label === '합의 종료', 'P5b 합의 종료 label')
  updated_at = agree.data.updated_at

  const adj = await req('POST', `/debts/${debtId}/ledger`, {
    type: 'adjustment',
    amount: 10000,
    occurred_on: today,
    note: 'smoke adjustment reopen',
  })
  assert((adj.status === 201 || adj.status === 200) && adj.data.debt, 'adjustment after agreement')
  assert(adj.data.debt?.status === 'active', 'active after adjustment')
  assert(adj.data.debt?.display_label !== '합의 종료', 'P5b no agreement badge after active')
  updated_at = adj.data.debt.updated_at
  const entryId = adj.data.entry?.id
  assert(!!entryId, 'adjustment entry id')

  // E1: delete ledger → status recalc
  const del = await req('DELETE', `/debts/${debtId}/ledger/${entryId}`)
  if (del.status !== 200 || !del.data.status) {
    throw new Error(`FAIL: E1 delete ledger (${del.status}) ${JSON.stringify(del.data)}`)
  }
  console.log('OK: E1 delete ledger')
  assert(del.data.status === 'completed', 'E1 back to completed after delete')

  // E5: archive blocks payment
  const arch = await req('PATCH', `/debts/${debtId}/status`, {
    action: 'archive',
    updated_at: del.data.updated_at,
  })
  assert(arch.status === 200 && arch.data.status === 'archived', 'archive debt')
  const blocked = await req('POST', `/debts/${debtId}/ledger`, {
    type: 'payment',
    amount: 1000,
    occurred_on: today,
  })
  assert(blocked.status === 400 && blocked.data.error?.code === 'DEBT_ARCHIVED', 'E5 archived blocks ledger')

  const unarch = await req('PATCH', `/debts/${debtId}/status`, {
    action: 'unarchive',
    updated_at: arch.data.updated_at,
  })
  assert(unarch.status === 200, 'unarchive')

  // contacts CRUD smoke
  const c = await req('POST', '/contacts', { display_name: 'Smoke Contact' })
  assert(c.status === 201 || c.status === 200, 'create contact')
  const cid = c.data.id
  const getC = await req('GET', `/contacts/${cid}`)
  assert(getC.status === 200, 'get contact')
  const patchC = await req('PATCH', `/contacts/${cid}`, { display_name: 'Smoke Updated' })
  assert(patchC.status === 200, 'patch contact')
  const delC = await req('DELETE', `/contacts/${cid}`)
  assert(delC.status === 204, 'delete contact')

  console.log('\nAll phase-1 smoke checks passed.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
