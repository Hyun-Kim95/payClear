import { Link } from 'react-router-dom'

export function DebtNewPage() {
  return (
    <div className="page">
      <Link to="/debts" className="back-link">
        ← 취소
      </Link>
      <h1 className="page-title">채무 등록</h1>
      <form className="form-stack" onSubmit={(e) => e.preventDefault()}>
        <label className="field">
          <span>상대</span>
          <input placeholder="이름 입력" required />
        </label>
        <fieldset className="field">
          <legend>방향</legend>
          <label>
            <input type="radio" name="dir" defaultChecked /> 빌려줌
          </label>
          <label>
            <input type="radio" name="dir" /> 빌림
          </label>
        </fieldset>
        <label className="field">
          <span>원금 (원)</span>
          <input type="number" min={1} placeholder="100000" required />
        </label>
        <label className="field">
          <span>발생일</span>
          <input type="date" required />
        </label>
        <label className="field">
          <span>사유</span>
          <textarea rows={3} maxLength={500} placeholder="1~500자" required />
        </label>
        <label className="field">
          <span>예정일 (선택)</span>
          <input type="date" />
        </label>
        <button type="submit" className="btn btn--primary btn--block">
          등록 (목업)
        </button>
      </form>
    </div>
  )
}
