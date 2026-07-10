/**
 * Security hardening smoke (CORS, FCM re-register, env guard).
 * Requires API on PORT (default 3910) with ALLOW_DEV_TOKEN=true for authed tests.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3910/api/v1'
const AUTH = { Authorization: 'Bearer dev-token' }

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`OK: ${msg}`)
}

async function authedPost(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: AUTH.Authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function testCorsRejected() {
  const res = await fetch(`${BASE}/health`, {
    headers: { Origin: 'https://evil.example.com' },
  })
  const acao = res.headers.get('access-control-allow-origin')
  assert(acao !== 'https://evil.example.com', 'CORS rejects unknown origin')
}

async function testCorsCapacitorOrigin() {
  const res = await fetch(`${BASE}/health`, {
    headers: { Origin: 'https://localhost' },
  })
  const acao = res.headers.get('access-control-allow-origin')
  assert(acao === 'https://localhost', 'CORS allows Capacitor WebView origin')
}

async function testPublicHealthLivenessOnly() {
  const res = await fetch(`${BASE}/health`)
  const body = await res.json()
  assert(res.ok && body.ok === true, 'public health ok')
  assert(body.db === undefined, 'public health does not expose db')
}

async function testFcmSameUserUpsert() {
  const token = `smoke-fcm-${Date.now()}`
  const first = await authedPost('/me/fcm-token', { token, platform: 'android' })
  assert(first.status === 201, 'fcm register user-1')
  const second = await authedPost('/me/fcm-token', { token, platform: 'android' })
  assert(second.status === 201, 'fcm re-register same user')
}

function testProductionEnvGuard() {
  const apiRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '-e',
      `import { assertProductionEnv } from './env-guard.js';
       process.env.NODE_ENV='production';
       process.env.ALLOW_DEV_TOKEN='true';
       process.env.JWT_SECRET='change-me-in-local-dev-only';
       assertProductionEnv();`,
    ],
    { cwd: apiRoot, encoding: 'utf8' },
  )
  assert(result.status !== 0 && (result.stderr ?? '').includes('ENV_GUARD'), 'production env guard blocks weak config')
}

async function main() {
  await testCorsRejected()
  await testCorsCapacitorOrigin()
  await testPublicHealthLivenessOnly()
  await testFcmSameUserUpsert()
  testProductionEnvGuard()
  console.log('\nAll security hardening smoke checks passed.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
