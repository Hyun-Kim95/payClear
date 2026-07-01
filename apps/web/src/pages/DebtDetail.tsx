import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError, formatKRW, type DebtDetail } from '../api/client'

type ModalKind = 'agreement' | 'archive' | 'delete-ledger' | null

export function DebtDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [debt, setDebt] = useState<DebtDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalKind>(null)
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const reload = () => {
    if (!id) return
    setLoading(true)
    api
      .debt(id)
      .then(setDebt)
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(reload, [id, location.key])

  const runStatus = async (action: 'complete_agreement' | 'archive' | 'unarchive') => {
    if (!id || !debt) return
    setActionLoading(true)
    setError(null)
    try {
      const updated = await api.patchDebtStatus(id, action, debt.updated_at)
      setDebt((prev) => (prev ? { ...prev, ...updated } : prev))
      setModal(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '처리에 실패했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  const deleteEntry = async () => {
    if (!id || !deleteEntryId) return
    setActionLoading(true)
    setError(null)
    try {
      const updated = await api.deleteLedgerEntry(id, deleteEntryId)
      setDebt((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              ledger_entries: prev.ledger_entries.filter((e) => e.id !== deleteEntryId),
            }
          : prev,
      )
      setModal(null)
      setDeleteEntryId(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '삭제에 실패했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="skeleton" style={{ height: '12rem' }} />
  if (error && !debt) return <div className="state-box state-box--error">{error}</div>
  if (!debt) return null

  const isArchived = debt.status === 'archived'
  const balanceText = debt.balance < 0 ? `초과 상환 ${formatKRW(debt.balance)}` : formatKRW(debt.balance)

  return (
    <div>
      <Link to="/debts" className="back">
        ← 목록
      </Link>

      {isArchived && (
        <div className="state-box" style={{ marginBottom: '1rem', background: 'var(--pc-surface-2)' }}>
          보관된 채무입니다. 상환·조정·편집이 제한됩니다.
          <button
            type="button"
            className="btn btn--secondary"
            style={{ marginTop: '0.5rem' }}
            disabled={actionLoading}
            onClick={() => void runStatus('unarchive')}
          >
            보관 해제
          </button>
        </div>
      )}

      <div className="detail-hero">
        <div className="debt-card__row">
          <h1 className="page-title" style={{ margin: 0 }}>
            {debt.contact.display_name}
          </h1>
          <span className={`badge badge--dir-${debt.direction}`}>
            {debt.direction === 'lent' ? '빌려줌' : '빌림'}
          </span>
        </div>
        <div className="detail-balance">{balanceText}</div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {debt.is_overdue && debt.status === 'active' && <span className="badge badge--overdue">연체</span>}
          {debt.display_label && (
            <span className={`badge ${debt.display_label === '합의 종료' ? 'badge--agreement' : 'badge--done'}`}>
              {debt.display_label}
            </span>
          )}
        </div>
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          {debt.reason}
        </p>
      </div>

      {debt.is_split && debt.participants && debt.participants.length > 0 && (
        <>
          <div className="section-head">
            <h2>참여자별 진행</h2>
          </div>
          {debt.participants.map((p) => {
            const pct =
              p.share_amount > 0
                ? Math.min(100, Math.round((p.paid_amount / p.share_amount) * 100))
                : 0
            const insts = (debt.installments ?? []).filter((i) => i.participant_id === p.id)
            return (
              <div key={p.id} className="participant-card">
                <div className="participant-card__head">
                  <span className="participant-card__name">{p.label}</span>
                  <span className={p.completed ? 'badge-done' : 'badge-pending'}>
                    {p.completed ? '완료' : `잔액 ${formatKRW(p.balance)}`}
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="muted" style={{ fontSize: '0.8125rem' }}>
                  분담 {formatKRW(p.share_amount)} · 납입 {formatKRW(p.paid_amount)}
                </div>
                {insts.length > 0 && (
                  <ul className="preview-list" style={{ marginTop: '0.5rem' }}>
                    {insts.map((i) => (
                      <li key={i.id} className="installment-row">
                        <span>
                          {i.seq}회차 · {i.due_on}
                        </span>
                        <span>{formatKRW(i.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </>
      )}

      <div className="section-head">
        <h2>타임라인</h2>
      </div>
      <ul className="timeline">
        <li>
          <div className="timeline__dot timeline__dot--opening" />
          <div>
            <strong>개설</strong>
            <div className="muted">{debt.opening.occurred_on}</div>
            <div>{formatKRW(debt.opening.principal)}</div>
          </div>
        </li>
        {debt.ledger_entries.map((e) => (
          <li key={e.id}>
            <div className={`timeline__dot timeline__dot--${e.type}`} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div>
                  <strong>{e.type === 'payment' ? '상환' : '조정'}</strong>
                  <div className="muted">{e.occurred_on}</div>
                  <div>
                    {e.type === 'payment' ? '-' : e.amount > 0 ? '+' : ''}
                    {formatKRW(e.amount)}
                  </div>
                  {e.note && <div className="muted">{e.note}</div>}
                </div>
                {!isArchived && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    onClick={() => {
                      setDeleteEntryId(e.id)
                      setModal('delete-ledger')
                    }}
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {error && <p className="form-error">{error}</p>}

      <div className="action-row" style={{ marginTop: '1.5rem' }}>
        <button
          type="button"
          className="btn btn--primary"
          disabled={isArchived}
          onClick={() => navigate(`/debts/${id}/payment`)}
        >
          상환
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={isArchived}
          onClick={() => navigate(`/debts/${id}/adjustment`)}
        >
          조정
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={isArchived}
          onClick={() => navigate(`/debts/${id}/share`)}
        >
          공유
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={isArchived}
          onClick={() => navigate(`/debts/${id}/edit`)}
        >
          편집
        </button>
        {!isArchived && debt.status === 'active' && !debt.agreement_closed && (
          <button type="button" className="btn btn--ghost" onClick={() => setModal('agreement')}>
            합의 종료
          </button>
        )}
        {!isArchived && debt.status !== 'archived' && (
          <button type="button" className="btn btn--ghost" onClick={() => setModal('archive')}>
            보관
          </button>
        )}
      </div>

      {modal === 'agreement' && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>합의 종료</h2>
            <p>잔액이 남아 있어도 합의 종료로 표시합니다. 계속할까요?</p>
            <div className="action-row">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>
                취소
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={actionLoading}
                onClick={() => void runStatus('complete_agreement')}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'archive' && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>보관</h2>
            <p>이 채무를 보관할까요? 보관 후 상환·조정·편집이 제한됩니다.</p>
            <div className="action-row">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>
                취소
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={actionLoading}
                onClick={() => void runStatus('archive')}
              >
                보관
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'delete-ledger' && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>기록 삭제</h2>
            <p>이 상환·조정 기록을 삭제할까요? 잔액과 상태가 다시 계산됩니다.</p>
            <div className="action-row">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>
                취소
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={actionLoading}
                onClick={() => void deleteEntry()}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
