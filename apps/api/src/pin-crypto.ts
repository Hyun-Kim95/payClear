import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

export function hashPin(pin: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(pin, salt, 32)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPinHash(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(pin, salt, 32)
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}

export function validateAppPin(pin: unknown): string | null {
  if (typeof pin !== 'string' || !/^\d{4,6}$/.test(pin)) {
    return 'PIN은 4~6자리 숫자입니다.'
  }
  return null
}
