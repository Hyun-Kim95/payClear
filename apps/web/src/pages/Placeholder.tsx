import { Link } from 'react-router-dom'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <Link to="/debts" className="back">
        ← 뒤로
      </Link>
      <h1 className="page-title">{title}</h1>
      <p className="muted">v0.1 구현 예정</p>
    </div>
  )
}
