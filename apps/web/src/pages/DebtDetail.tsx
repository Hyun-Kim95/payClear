import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { VersionConflictNotice } from '../components/VersionConflictNotice'
import {
  api,
  ApiError,
  formatKRW,
  isVersionConflictError,
  type DebtDetail,
} from '../api/client'

type ModalKind = 'delete-ledger' | 'complete-agreement' | 'reopen-agreement' | 'archive' | null

export function DebtDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [debt, setDebt] = useState<DebtDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [versionConflict, setVersionConflict] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalKind>(null)
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const reload = () => {
    if (!id) return
    setLoading(true)
    setVersionConflict(false)
    setError(null)
    api
      .debt(id)
      .then(setDebt)
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(reload, [id, location.key])

  const handleActionError = (err: unknown) => {
    if (isVersionConflictError(err)) {
      setVersionConflict(true)
      setModal(null)
      setError(null)
      return
    }
    setError(err instanceof ApiError ? err.message : '처리에 실패했습니다.')
  }

  const runUnarchive = async () => {
    if (!id || !debt) return
    setActionLoading(true)
    setError(null)
    setVersionConflict(false)
    try {
      const updated = await api.patchDebtStatus(id, 'unarchive', debt.updated_at)
      setDebt((prev) => (prev ? { ...prev, ...updated } : prev))
    } catch (err) {
      handleActionError(err)
    } finally {
      setActionLoading(false)
    }
  }

  const runCompleteAgreement = async () => {
    if (!id || !debt) return
    setActionLoading(true)
    setError(null)
    setVersionConflict(false)
    try {
      const updated = await api.patchDebtStatus(id, 'complete_agreement', debt.updated_at)
      setDebt((prev) => (prev ? { ...prev, ...updated } : prev))
      setModal(null)
    } catch (err) {
      handleActionError(err)
    } finally {
      setActionLoading(false)
    }
  }

  const runReopenAgreement = async () => {
    if (!id || !debt) return
    setActionLoading(true)
    setError(null)
    setVersionConflict(false)
    try {
      const updated = await api.patchDebtStatus(id, 'reopen_agreement', debt.updated_at)
      setDebt((prev) => (prev ? { ...prev, ...updated } : prev))
      setModal(null)
    } catch (err) {
      handleActionError(err)
    } finally {
      setActionLoading(false)
    }
  }

  const runArchive = async () => {
    if (!id || !debt) return
    setActionLoading(true)
    setError(null)
    setVersionConflict(false)
    try {
      const updated = await api.patchDebtStatus(id, 'archive', debt.updated_at)
      setDebt((prev) => (prev ? { ...prev, ...updated, ledger_entries: prev.ledger_entries } : prev))
      setModal(null)
    } catch (err) {
      handleActionError(err)
    } finally {
      setActionLoading(false)
    }
  }

  const deleteEntry = async () => {
    if (!id || !deleteEntryId) return
    setActionLoading(true)
    setError(null)
    setVersionConflict(false)
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
      handleActionError(err)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="skeleton" style={{ height: '12rem' }} />
  if (error && !debt) return <div className="state-box state-box--error">{error}</div>
  if (!debt) return null

  const isArchived = debt.status === 'archived'
  const isAgreementLocked = debt.agreement_closed && !isArchived
  const isEditLocked = isArchived || isAgreementLocked
  const canCompleteAgreement = !isEditLocked
  const canArchive = !isArchived
  const balanceText = debt.balance < 0 ? `초과 상환 ${formatKRW(debt.balance)}` : formatKRW(debt.balance)

  return (
    <div>
      <Link to="/debts" className="back">
        ← 목록
      </Link>

      {versionConflict && <VersionConflictNotice onRefresh={reload} />}

      {isAgreementLocked && (
        <div className="state-box" style={{ marginBottom: '1rem', background: 'var(--pc-surface-2)' }}>
          합의 종료된 채무입니다. 상환·조정·편집이 제한됩니다.
          <button
            type="button"
            className="btn btn--secondary"
            style={{ marginTop: '0.5rem' }}
            disabled={actionLoading}
            onClick={() => setModal('reopen-agreement')}
          >
            합의 재개
          </button>
        </div>
      )}

      {isArchived && (
        <div className="state-box" style={{ marginBottom: '1rem', background: 'var(--pc-surface-2)' }}>
          보관된 채무입니다. 상환·조정·편집이 제한됩니다.
          <button
            type="button"
            className="btn btn--secondary"
            style={{ marginTop: '0.5rem' }}
            disabled={actionLoading}
            onClick={() => void runUnarchive()}
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
                {!isEditLocked && (
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
          disabled={isEditLocked}
          onClick={() => navigate(`/debts/${id}/payment`)}
        >
          상환
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={isEditLocked}
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
          disabled={isEditLocked}
          onClick={() => navigate(`/debts/${id}/edit`)}
        >
          편집
        </button>
      </div>

      {(canCompleteAgreement || canArchive) && (
        <div className="action-row" style={{ marginTop: '0.75rem' }}>
          {canCompleteAgreement && (
            <button
              type="button"
              className="btn btn--ghost"
              disabled={actionLoading}
              onClick={() => setModal('complete-agreement')}
            >
              합의 종료
            </button>
          )}
          {canArchive && (
            <button
              type="button"
              className="btn btn--ghost"
              disabled={actionLoading}
              onClick={() => setModal('archive')}
            >
              보관
            </button>
          )}
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

      {modal === 'complete-agreement' && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>합의 종료</h2>
            <p>
              잔액이 남아 있어도 「합의 종료」로 표시됩니다. 종료 후에는 상환·조정·편집이 제한되며, 합의
              재개 후에만 다시 수정할 수 있습니다. 계속할까요?
            </p>
            <div className="action-row">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>
                취소
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={actionLoading}
                onClick={() => void runCompleteAgreement()}
              >
                합의 종료
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'reopen-agreement' && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>합의 재개</h2>
            <p>합의 종료를 해제하고 상환·조정·편집을 다시 할 수 있습니다. 계속할까요?</p>
            <div className="action-row">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>
                취소
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={actionLoading}
                onClick={() => void runReopenAgreement()}
              >
                합의 재개
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'archive' && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>채무 보관</h2>
            <p>보관하면 공유 링크가 무효화됩니다. 목록에서 숨기고 상환·조정을 막을까요?</p>
            <div className="action-row">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>
                취소
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={actionLoading}
                onClick={() => void runArchive()}
              >
                보관
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
