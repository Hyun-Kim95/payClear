import type { Debt } from '../types'
import { getDisplayLabel } from '../data/mock'

const variants: Record<string, string> = {
  overdue: 'badge badge--overdue',
  completed: 'badge badge--completed',
  agreement: 'badge badge--agreement',
  lent: 'badge badge--direction',
  borrowed: 'badge badge--direction borrowed',
}

export function StatusBadge({ debt }: { debt: Debt }) {
  const label = getDisplayLabel(debt)
  if (!label) return null
  const cls =
    label === '연체' ? variants.overdue : label === '합의 종료' ? variants.agreement : variants.completed
  return <span className={cls}>{label}</span>
}

export function DirectionBadge({ direction }: { direction: Debt['direction'] }) {
  return (
    <span className={direction === 'lent' ? variants.lent : variants.borrowed}>
      {direction === 'lent' ? '빌려줌' : '빌림'}
    </span>
  )
}
