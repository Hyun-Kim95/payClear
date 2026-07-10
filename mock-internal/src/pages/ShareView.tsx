import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatKRW, getDebtById } from '../data/mock'
import { DirectionBadge } from '../components/Badge'
import { Timeline } from '../components/Timeline'

export function ShareViewPage() {
  const { token } = useParams()
  const [unlocked, setUnlocked] = useState(token !== 'demo-pin')
  const [pin, setPin] = useState('')

  if (token === 'expired') {
    return (
      <div className="share-page">
        <div className="share-card">
          <h1>링크를 사용할 수 없습니다</h1>
          <p className="muted">만료되었거나 회수된 공유 링크입니다. (SHARE_INVALID)</p>
        </div>
      </div>
    )
  }

  const debt = getDebtById('d1')

  if (!debt) return null

  if (!unlocked) {
    return (
      <div className="share-page">
        <form
          className="share-card"
          onSubmit={(e) => {
            e.preventDefault()
            if (pin === '1234') setUnlocked(true)
          }}
        >
          <h1>공유 보기</h1>
          <p className="muted">PIN을 입력하세요 (목업: 1234)</p>
          <input
            className="search-input"
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
          />
          <button type="submit" className="btn btn--primary btn--block">
            확인
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="share-page">
      <div className="share-card">
        <p className="share-kicker">payClear 공유 보기</p>
        <div className="detail-header__row">
          <h1>{debt.counterparty}</h1>
          <DirectionBadge direction={debt.direction} />
        </div>
        <p className="detail-balance">{formatKRW(debt.balance)}</p>
        <Timeline events={debt.timeline} />
        <footer className="share-footer">
          <p>payClear에서 생성된 읽기 전용입니다.</p>
          <p className="muted">토큰: {token}</p>
        </footer>
      </div>
    </div>
  )
}
