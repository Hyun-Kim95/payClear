import { createHmac, randomBytes, randomUUID } from 'crypto'
import { query, queryOne } from '../db/pool.js'
import { signJwt } from './jwt.js'

type Provider = 'google' | 'kakao'
export type OAuthClient = 'app' | 'web'

const STATE_TTL_MS = 10 * 60 * 1000

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

// state 검증 후 client('app'|'web')를 반환. 검증 실패 시 null.
// 하위호환: client 미포함(구버전 state)이면 'web'으로 간주.
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
  const existing = await queryOne<{ user_id: string }>(
    'SELECT user_id FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2',
    [provider, providerUserId],
  )
  if (existing) return existing.user_id

  const userId = randomUUID()
  await query('INSERT INTO users (id, email) VALUES ($1, $2)', [userId, email ?? null])
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

  const userId = await findOrCreateOAuthUser('google', profile.id, profile.email)
  return signJwt(userId)
}

export async function handleKakaoCallback(code: string): Promise<string> {
  const clientId = process.env.OAUTH_KAKAO_CLIENT_ID
  const clientSecret = process.env.OAUTH_KAKAO_CLIENT_SECRET
  if (!clientId) throw new Error('OAUTH_NOT_CONFIGURED')

  const redirect = `${apiPublicUrl()}/api/v1/auth/kakao/callback`
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirect,
    code,
  })
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
  const userId = await findOrCreateOAuthUser('kakao', String(profile.id), email)
  return signJwt(userId)
}

// 앱 딥링크 커스텀 스킴(계약 §2). 앱은 payclear://auth/callback 을 가로챈다.
const APP_SCHEME = 'payclear'

export function redirectWithToken(jwt: string, client: OAuthClient = 'web'): string {
  if (client === 'app') {
    return `${APP_SCHEME}://auth/callback?token=${encodeURIComponent(jwt)}`
  }
  return `${webOrigin()}/auth/callback?token=${encodeURIComponent(jwt)}`
}

export function redirectWithError(code: string, client: OAuthClient = 'web'): string {
  if (client === 'app') {
    return `${APP_SCHEME}://auth/callback?error=${encodeURIComponent(code)}`
  }
  return `${webOrigin()}/auth/callback?error=${encodeURIComponent(code)}`
}
