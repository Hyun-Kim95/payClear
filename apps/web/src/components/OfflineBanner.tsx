import { useOnlineStatus } from '../hooks/useOnlineStatus'

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div className="offline-banner" role="status">
      연결 필요 — 인터넷 연결을 확인해 주세요.
    </div>
  )
}
