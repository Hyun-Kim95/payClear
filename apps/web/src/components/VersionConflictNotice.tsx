export function VersionConflictNotice({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="state-box state-box--error" role="alert">
      <p style={{ margin: 0 }}>다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해 주세요.</p>
      <button type="button" className="btn btn--secondary" style={{ marginTop: '0.75rem' }} onClick={onRefresh}>
        새로고침
      </button>
    </div>
  )
}
