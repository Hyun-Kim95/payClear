import type { Debt } from '../api/client'

export type DebtSortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'

export const DEBT_SORT_OPTIONS: { value: DebtSortOption; label: string }[] = [
  { value: 'date_desc', label: '날짜 최신순' },
  { value: 'date_asc', label: '날짜 오래된순' },
  { value: 'amount_desc', label: '금액 높은순' },
  { value: 'amount_asc', label: '금액 낮은순' },
]

export function sortDebts<T extends Pick<Debt, 'occurred_on' | 'balance'>>(
  items: T[],
  sort: DebtSortOption,
): T[] {
  const sorted = [...items]
  switch (sort) {
    case 'date_desc':
      return sorted.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
    case 'date_asc':
      return sorted.sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))
    case 'amount_desc':
      return sorted.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    case 'amount_asc':
      return sorted.sort((a, b) => Math.abs(a.balance) - Math.abs(b.balance))
  }
}
