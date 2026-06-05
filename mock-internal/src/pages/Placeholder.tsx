import { Link, useParams } from 'react-router-dom'

export function PlaceholderPage({ title }: { title: string }) {
  const { id } = useParams()
  return (
    <div className="page">
      <Link to={id ? `/debts/${id}` : '/debts'} className="back-link">
        ← 뒤로
      </Link>
      <h1 className="page-title">{title}</h1>
      <p className="muted">2A 목업: 폼·모달 UI는 디자인 선택 후 본 구현에서 완성합니다.</p>
    </div>
  )
}
