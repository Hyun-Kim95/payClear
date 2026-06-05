import type { LedgerEvent } from '../types'
import { formatKRW } from '../data/mock'

const typeLabel: Record<LedgerEvent['type'], string> = {
  opening: '개설',
  payment: '상환',
  adjustment: '조정',
}

export function Timeline({ events }: { events: LedgerEvent[] }) {
  const sorted = [...events].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))

  return (
    <ul className="timeline">
      {sorted.map((event) => (
        <li key={event.id} className="timeline__item">
          <div className="timeline__dot" data-type={event.type} />
          <div className="timeline__body">
            <div className="timeline__row">
              <span className="timeline__type">{typeLabel[event.type]}</span>
              <span className="timeline__date">{event.occurredOn}</span>
            </div>
            <p className="timeline__amount">
              {event.type === 'payment' ? '-' : event.type === 'adjustment' && event.amount < 0 ? '' : '+'}
              {formatKRW(event.amount)}
            </p>
            {event.memo && <p className="timeline__memo">{event.memo}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}
