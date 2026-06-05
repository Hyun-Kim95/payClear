/**
 * Phase 3 auth/email smoke (dev-token + JWT + email verify dev).
 */
import 'dotenv/config'
import { signJwt } from '../auth/jwt.js'

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3910/api/v1'

async function req(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string>),
    },
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`OK: ${msg}`)
}

async function main() {
  const dev = await req('/me', 'dev-token')
  assert(dev.status === 200 && dev.data.id, 'dev-token /me')

  const jwt = await signJwt(dev.data.id)
  const jwtMe = await req('/me', jwt)
  assert(jwtMe.status === 200 && jwtMe.data.id === dev.data.id, 'JWT /me')

  const emailRes = await req('/me/email', jwt, {
    method: 'POST',
    body: JSON.stringify({ email: `smoke-${Date.now()}@test.local` }),
  })
  assert(emailRes.status === 200 && emailRes.data.dev_verify_token, 'register email dev token')

  const verify = await req('/me/email/verify', jwt, {
    method: 'POST',
    body: JSON.stringify({ token: emailRes.data.dev_verify_token }),
  })
  assert(verify.status === 200, 'verify email')

  const meAfter = await req('/me', jwt)
  assert(meAfter.data.email_verified === true, 'email verified flag')

  const googleStart = await fetch(`${BASE}/auth/google/start`, { redirect: 'manual' })
  assert(googleStart.status === 503 || googleStart.status === 302, 'google start responds')

  console.log('\nAll phase-3 smoke checks passed.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
