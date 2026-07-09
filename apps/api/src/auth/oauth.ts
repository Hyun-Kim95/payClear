import { createHmac, randomBytes, randomUUID } from 'crypto'
import { query, queryOne } from '../db/pool.js'

type Provider = 'google' | 'kakao'
export type OAuthClient = 'app' | 'web'

const STATE_TTL_MS = 10 * 60 * 1000
const EXCHANGE_CODE_TTL_MS = 60 * 1000

function stateSecret(): string {
  return process.env.JWT_SECRET ?? 'change-me-in-local-dev-only'
}

export function createOAuthState(provider: Provider, client: OAuthClient = 'web'): string {
  const payload = Buffer.from(
    JSON.stringify({
      provider,
      client,
      nonce: randomBytes(16).toString('hex'),
      exp: Date.now() + STATE_TTL_MS,
    }),
  ).toString('base64url')
  const sig = createHmac('sha256', stateSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyOAuthState(state: string, provider: Provider): OAuthClient | null {
  const [payload, sig] = state.split('.')
  if (!payload || !sig) return null
  const expected = createHmac('sha256', stateSecret()).update(payload).digest('base64url')
  if (sig !== expected) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (data.provider !== provider) return null
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null
    return data.client === 'app' ? 'app' : 'web'
  } catch {
    return null
  }
}

function apiPublicUrl(): string {
  return process.env.API_PUBLIC_URL ?? 'http://localhost:3910'
}

function webOrigin(): string {
  return process.env.WEB_ORIGIN ?? 'http://localhost:5173'
}

export function googleAuthUrl(state: string): string | null {
  const clientId = process.env.OAUTH_GOOGLE_CLIENT_ID
  if (!clientId) return null
  const redirect = `${apiPublicUrl()}/api/v1/auth/google/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export function kakaoAuthUrl(state: string): string | null {
  const clientId = process.env.OAUTH_KAKAO_CLIENT_ID
  if (!clientId) return null
  const redirect = `${apiPublicUrl()}/api/v1/auth/kakao/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    state,
  })
  return `https://kauth.kakao.com/oauth/authorize?${params}`
}

async function findOrCreateOAuthUser(
  provider: Provider,
  providerUserId: string,
  email?: string | null,
): Promise<string> {
  const normalizedEmail = email?.trim().toLowerCase() || null

  const existing = await queryOne<{ user_id: string }>(
    'SELECT user_id FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2',
    [provider, providerUserId],
  )
  if (existing) {
    if (normalizedEmail) {
      await query(
        `UPDATE users
         SET email = COALESCE(email, $2), email_verified_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND email_verified_at IS NULL AND (email IS NULL OR email = $2)`,
        [existing.user_id, normalizedEmail],
      )
    }
    return existing.user_id
  }

  const userId = randomUUID()
  await query(
    `INSERT INTO users (id, email, email_verified_at)
     VALUES ($1, $2, CASE WHEN $2::text IS NULL THEN NULL ELSE NOW() END)`,
    [userId, normalizedEmail],
  )
  await query(
    'INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id) VALUES ($1, $2, $3, $4)',
    [randomUUID(), userId, provider, providerUserId],
  )
  return userId
}

export async function handleGoogleCallback(code: string): Promise<string> {
  const clientId = process.env.OAUTH_GOOGLE_CLIENT_ID
  const clientSecret = process.env.OAUTH_GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('OAUTH_NOT_CONFIGURED')

  const redirect = `${apiPublicUrl()}/api/v1/auth/google/callback`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirect,
      grant_type: 'authorization_code',
    }),
  })
  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string }
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error ?? 'GOOGLE_TOKEN_FAILED')
  }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const profile = (await userRes.json()) as { id?: string; email?: string }
  if (!profile.id) throw new Error('GOOGLE_PROFILE_FAILED')

  return findOrCreateOAuthUser('google', profile.id, profile.email)
}

export async function handleKakaoCallback(code: string): Promise<string> {
  const clientId = process.env.OAUTH_KAKAO_CLIENT_ID
  if (!clientId) throw new Error('OAUTH_NOT_CONFIGURED')

  const redirect = `${apiPublicUrl()}/api/v1/auth/kakao/callback`
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirect,
    code,
  })
  const clientSecret = process.env.OAUTH_KAKAO_CLIENT_SECRET
  if (clientSecret) body.set('client_secret', clientSecret)

  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string }
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error ?? 'KAKAO_TOKEN_FAILED')
  }

  const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const profile = (await userRes.json()) as { id?: number; kakao_account?: { email?: string } }
  if (!profile.id) throw new Error('KAKAO_PROFILE_FAILED')

  const email = profile.kakao_account?.email ?? null
  return findOrCreateOAuthUser('kakao', String(profile.id), email)
}

export async function createExchangeCode(userId: string): Promise<string> {
  const code = randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + EXCHANGE_CODE_TTL_MS).toISOString()
  await query(
    `INSERT INTO oauth_exchange_codes (code, user_id, expires_at) VALUES ($1, $2, $3)`,
    [code, userId, expiresAt],
  )
  void query('DELETE FROM oauth_exchange_codes WHERE expires_at < NOW()')
  return code
}

export async function consumeExchangeCode(code: string): Promise<string | null> {
  const row = await queryOne<{ user_id: string; expires_at: string; used_at: string | null }>(
    'SELECT user_id, expires_at, used_at FROM oauth_exchange_codes WHERE code = $1',
    [code],
  )
  if (!row || row.used_at) return null
  if (new Date(row.expires_at) < new Date()) return null
  await query('UPDATE oauth_exchange_codes SET used_at = NOW() WHERE code = $1', [code])
  return row.user_id
}

const APP_SCHEME = 'payclear'

export function redirectWithCode(exchangeCode: string, client: OAuthClient = 'web'): string {
  if (client === 'app') {
    return `${APP_SCHEME}://auth/callback?code=${encodeURIComponent(exchangeCode)}`
  }
  return `${webOrigin()}/auth/callback?code=${encodeURIComponent(exchangeCode)}`
}

export function redirectWithError(code: string, client: OAuthClient = 'web'): string {
  if (client === 'app') {
    return `${APP_SCHEME}://auth/callback?error=${encodeURIComponent(code)}`
  }
  return `${webOrigin()}/auth/callback?error=${encodeURIComponent(code)}`
}
