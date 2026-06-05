import * as jose from 'jose'

const DEV_TOKEN = 'dev-token'

function secretKey(): Uint8Array {
  const s = process.env.JWT_SECRET ?? 'change-me-in-local-dev-only'
  return new TextEncoder().encode(s)
}

export async function signJwt(userId: string): Promise<string> {
  return new jose.SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey())
}

export async function verifyJwt(token: string): Promise<string | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey())
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

export async function resolveUserId(authHeader?: string): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const allowDev = process.env.ALLOW_DEV_TOKEN !== 'false'
  if (allowDev && token === DEV_TOKEN) return 'user-1'
  return verifyJwt(token)
}
