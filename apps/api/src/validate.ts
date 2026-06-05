const MAX_AMOUNT = 999_999_999_999

export function todayKST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

export function validateAmount(amount: unknown, field = 'amount'): string | null {
  if (typeof amount !== 'number' || !Number.isInteger(amount)) return `${field}는 정수여야 합니다.`
  if (amount < 1 || amount > MAX_AMOUNT) return `${field}는 1~${MAX_AMOUNT.toLocaleString()} 사이여야 합니다.`
  return null
}

export function validatePaymentAmount(amount: unknown): string | null {
  return validateAmount(amount, 'amount')
}

export function validateAdjustmentAmount(amount: unknown): string | null {
  if (typeof amount !== 'number' || !Number.isInteger(amount)) return '금액은 정수여야 합니다.'
  if (amount === 0) return '금액은 0이 될 수 없습니다.'
  if (Math.abs(amount) > MAX_AMOUNT) return `금액 절대값은 ${MAX_AMOUNT.toLocaleString()} 이하여야 합니다.`
  return null
}

export function validateAdjustmentNote(note: unknown): string | null {
  return validateReason(note)
}

export function validatePrincipal(amount: unknown): string | null {
  return validateAmount(amount, 'principal')
}

export function validateReason(reason: unknown): string | null {
  if (typeof reason !== 'string') return '사유를 입력해 주세요.'
  const t = reason.trim()
  if (t.length < 1 || t.length > 500) return '사유는 1~500자입니다.'
  return null
}

export function validateDateOnOrBeforeToday(date: unknown, field: string): string | null {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return `${field} 형식이 올바르지 않습니다.`
  if (date > todayKST()) return `${field}는 오늘 이전이어야 합니다.`
  return null
}

export function validationError(fields: Record<string, string>) {
  return {
    statusCode: 400,
    error: {
      code: 'VALIDATION_ERROR',
      message: '입력값을 확인해 주세요.',
      fields,
    },
  }
}
