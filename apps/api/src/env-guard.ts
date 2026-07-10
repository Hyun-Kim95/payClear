const WEAK_JWT_SECRETS = new Set([
  'change-me-in-local-dev-only',
  'replace-with-strong-random-secret',
])

export function isProductionEnv(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.RAILWAY_ENVIRONMENT === 'production' ||
    process.env.ALLOW_DEV_TOKEN === 'false'
  )
}

function fail(message: string): never {
  console.error(`[ENV_GUARD] ${message}`)
  process.exit(1)
}

/** 운영 환경에서 dev 플래그·약한 시크릿이 있으면 부팅을 중단한다. */
export function assertProductionEnv(): void {
  if (!isProductionEnv()) return

  const jwt = process.env.JWT_SECRET
  if (!jwt || WEAK_JWT_SECRETS.has(jwt)) {
    fail('JWT_SECRET must be set to a strong random value in production.')
  }
  if (jwt.length < 32) {
    fail('JWT_SECRET must be at least 32 characters in production.')
  }
  if (process.env.ALLOW_DEV_TOKEN !== 'false') {
    fail('ALLOW_DEV_TOKEN must be "false" in production.')
  }
  if (process.env.SEED_DEMO === 'true') {
    fail('SEED_DEMO must not be "true" in production.')
  }
  if (process.env.EMAIL_VERIFY_DEV === 'true') {
    fail('EMAIL_VERIFY_DEV must not be "true" in production.')
  }
}

const CAPACITOR_WEBVIEW_ORIGINS = [
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
]

export function corsAllowedOrigins(): string[] {
  const origins = [process.env.WEB_ORIGIN ?? 'http://localhost:5173']
  const extra = process.env.CORS_EXTRA_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
  return [...origins, ...CAPACITOR_WEBVIEW_ORIGINS, ...extra]
}
