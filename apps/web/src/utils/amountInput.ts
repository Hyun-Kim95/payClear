/** 금액 입력에서 숫자만 남깁니다. */
export function sanitizeAmountDigits(raw: string): string {
  return raw.replace(/[^\d]/g, '')
}

/** 숫자 문자열을 천 단위 쉼표 포맷으로 표시합니다. */
export function formatAmountDigits(digits: string): string {
  if (!digits) return ''
  return Number(digits).toLocaleString('ko-KR')
}

/** 쉼표가 포함된 금액 입력값을 숫자로 파싱합니다. */
export function parseAmountInput(value: string): number {
  return Number(value.replace(/,/g, '')) || 0
}

/** 잔액 비율로 금액을 계산합니다(원 단위 내림). */
export function amountFromBalanceRatio(balance: number, ratio: number): number {
  if (balance <= 0 || ratio <= 0) return 0
  return Math.floor(balance * ratio)
}
