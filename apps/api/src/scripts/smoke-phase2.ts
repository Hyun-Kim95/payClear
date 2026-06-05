/**
 * Phase 2 share smoke. Requires API on PORT (default 3910).
 */
const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3910/api/v1'
const AUTH = { Authorization: 'Bearer dev-token' }

async function req(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { Authorization: AUTH.Authorization }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return { status: res.status, data: null }
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`OK: ${msg}`)
}

async function main() {
  const health = await fetch(`${BASE}/health`)
  assert(health.ok, 'health')

  const created = await req('POST', '/debts', {
    contact_name: `ShareSmoke ${Date.now()}`,
    direction: 'lent',
    principal: 100000,
    occurred_on: '2026-01-01',
    reason: 'share smoke debt',
  })
  assert(created.status === 201 && created.data.id, 'create debt')
  const debtId = created.data.id as string

  const share = await req('POST', `/debts/${debtId}/share`, {
    expires_in_days: 90,
    pin: '1234',
    anonymous: true,
    include_reason: false,
  })
  assert(share.status === 201 && share.data.token, 'create share')
  const token = share.data.token as string

  const pubNoPin = await fetch(`${BASE}/public/share/${token}`)
  assert(pubNoPin.status === 401, 'public requires pin')

  const pubBad = await fetch(`${BASE}/public/share/${token}?pin=0000`)
  const badBody = await pubBad.json()
  assert(pubBad.status === 401 && badBody.error?.code === 'SHARE_PIN_INVALID', 'bad pin')

  const pubOk = await fetch(`${BASE}/public/share/${token}?pin=1234`)
  const view = await pubOk.json()
  assert(pubOk.status === 200 && view.contact?.display_name === '익명(상대)', 'anonymous public view')
  assert(view.reason === undefined, 'include_reason false')

  const share2 = await req('POST', `/debts/${debtId}/share`, { expires_in_days: 30 })
  assert(share2.status === 201 && share2.data.token !== token, 'replace share')

  const oldInvalid = await fetch(`${BASE}/public/share/${token}?pin=1234`)
  assert(oldInvalid.status === 404, 'old token invalid after replace')

  const detail = await req('GET', `/debts/${debtId}`)
  const archive = await req('PATCH', `/debts/${debtId}/status`, {
    action: 'archive',
    updated_at: detail.data.updated_at,
  })
  assert(archive.status === 200, 'archive debt')

  const newToken = share2.data.token as string
  const archivedInvalid = await fetch(`${BASE}/public/share/${newToken}`)
  assert(archivedInvalid.status === 404, 'share invalid after archive')

  const blocked = await req('POST', `/debts/${debtId}/share`, {})
  assert(blocked.status === 400 && blocked.data.error?.code === 'DEBT_ARCHIVED', 'E5 share blocked')

  console.log('\nAll phase-2 smoke checks passed.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
