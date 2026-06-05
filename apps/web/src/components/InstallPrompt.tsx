import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('payclear-install-dismissed') === '1',
  )

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferred || dismissed) return null

  return (
    <div className="install-banner">
      <p>payClear를 홈 화면에 추가하면 앱처럼 사용할 수 있습니다.</p>
      <div className="action-row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            void deferred.prompt()
            void deferred.userChoice.then(() => setDeferred(null))
          }}
        >
          설치
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            localStorage.setItem('payclear-install-dismissed', '1')
            setDismissed(true)
          }}
        >
          나중에
        </button>
      </div>
    </div>
  )
}
