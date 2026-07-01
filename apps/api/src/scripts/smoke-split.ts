/**
 * 분할/할부 상환 스모크. API가 PORT(기본 3910)에서 실행 중이어야 한다.
 * 생성 → 회차/참여자 검증 → 참여자별 상환 → 개인 완료 → 전원 완료.
 */
const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3910/api/v1'
const AUTH = 'Bearer dev-token'

async function req(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { Authorization: AUTH }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return { status: res.status, data: null as any }
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`OK: ${msg}`)
}

async function main() {
  const created = await req('POST', '/debts', {
    contact_name: `SplitSmoke ${Date.now()}`,
    direction: 'borrowed',
    principal: 300000,
    occurred_on: '2026-01-01',
    reason: 'split smoke',
    split: {
      participants: [{ label: '나' }, { label: '동생' }],
      installment: { count: 3, interval_months: 1, start_on: '2026-01-01' },
    },
  })
  assert(created.status === 201 && created.data.id, 'create split debt')
  assert(created.data.is_split === true, 'is_split true')
  const debtId = created.data.id as string

  const detail = await req('GET', `/debts/${debtId}`)
  assert(detail.status === 200, 'get detail')
  assert(detail.data.participants?.length === 2, 'two participants')
  const shares = detail.data.participants.map((p: any) => p.share_amount).sort()
  assert(shares[0] === 150000 && shares[1] === 150000, 'equal 1/N shares 150000')
  assert(detail.data.installments?.length === 6, '2 participants x 3 installments = 6')
  const instAmts = detail.data.installments.map((i: any) => i.amount)
  assert(instAmts.every((a: number) => a === 50000), 'each installment 50000')

  const dongsaeng = detail.data.participants.find((p: any) => p.label === '동생')
  const me = detail.data.participants.find((p: any) => p.label === '나')

  // 분할 채무는 participant_id 없는 상환은 거부
  const noPid = await req('POST', `/debts/${debtId}/ledger`, {
    type: 'payment',
    amount: 50000,
    occurred_on: '2026-01-01',
  })
  assert(noPid.status === 400, 'reject payment without participant_id')

  // 동생 1회차 5만 상환
  const pay1 = await req('POST', `/debts/${debtId}/ledger`, {
    type: 'payment',
    amount: 50000,
    occurred_on: '2026-01-01',
    participant_id: dongsaeng.id,
  })
  assert(pay1.status === 201, 'pay dongsaeng 50000')

  let d2 = await req('GET', `/debts/${debtId}`)
  let dg = d2.data.participants.find((p: any) => p.label === '동생')
  assert(dg.paid_amount === 50000 && dg.balance === 100000 && dg.completed === false, 'dongsaeng partial')
  assert(d2.data.balance === 250000, 'overall balance 250000 after 50000')

  // 동생 나머지 10만 상환 → 동생 완료
  await req('POST', `/debts/${debtId}/ledger`, {
    type: 'payment', amount: 100000, occurred_on: '2026-02-01', participant_id: dongsaeng.id,
  })
  d2 = await req('GET', `/debts/${debtId}`)
  dg = d2.data.participants.find((p: any) => p.label === '동생')
  assert(dg.completed === true && dg.balance === 0, 'dongsaeng completed')
  assert(d2.data.status === 'active', 'debt still active (나 미상환)')

  // 나 15만 전액 상환 → 전원 완료 → 채무 완료
  await req('POST', `/debts/${debtId}/ledger`, {
    type: 'payment', amount: 150000, occurred_on: '2026-03-01', participant_id: me.id,
  })
  d2 = await req('GET', `/debts/${debtId}`)
  assert(d2.data.balance === 0, 'overall balance 0')
  assert(d2.data.status === 'completed', 'debt completed when all participants done')

  console.log('\nSPLIT SMOKE PASSED')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
