import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isNativePlatform } from '../api/client'

/** 하단 탭 루트 — 여기서는 history.back 대신 두 번 눌러 종료 */
const TAB_ROOTS = new Set(['/', '/debts', '/contacts', '/settings'])

const EXIT_HINT_MS = 2000

function isTabRoot(pathname: string): boolean {
  return TAB_ROOTS.has(pathname)
}

/**
 * 상세·하위 화면의 부모 탭. history가 비어 있을 때 fallback으로 쓴다.
 */
function parentPath(pathname: string): string | null {
  if (pathname.startsWith('/settings/')) return '/settings'
  if (pathname.startsWith('/debts/')) return '/debts'
  if (pathname.startsWith('/contacts/')) return '/contacts'
  return null
}

/**
 * Android 하드웨어 뒤로가기.
 * - 탭 루트(홈·채무·상대·설정): 2초 안에 두 번 누르면 종료
 * - 그 외(상세·설정 하위 등): 이전 화면으로
 * 웹 브라우저에서는 동작하지 않는다.
 */
export function useHardwareBackButton() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const lastBackAt = useRef(0)
  const [hint, setHint] = useState(false)
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  useEffect(() => {
    if (!isNativePlatform()) return

    let removeListener: (() => void) | undefined
    let hintTimer: ReturnType<typeof setTimeout> | undefined

    void (async () => {
      const { App: CapApp } = await import('@capacitor/app')
      const handle = await CapApp.addListener('backButton', ({ canGoBack }) => {
        const path = pathnameRef.current

        // 확인 모달이 열려 있으면 화면 이탈 대신 모달만 닫는다.
        const dialog = document.querySelector('.modal-backdrop [role="dialog"]')
        if (dialog) {
          const backdrop = dialog.closest('.modal-backdrop')
          if (backdrop instanceof HTMLElement) {
            backdrop.click()
            return
          }
        }

        if (path === '/lock' || path === '/onboarding/pin' || path === '/login') {
          void CapApp.exitApp()
          return
        }

        // 약관·개인정보 등 레이아웃 밖 화면: 이전이 있으면 돌아가고, 없으면 종료
        if (
          path === '/terms' ||
          path === '/privacy' ||
          path === '/delete-account' ||
          path === '/delete-data' ||
          path === '/register-email' ||
          path.startsWith('/s/')
        ) {
          if (canGoBack) {
            navigate(-1)
            return
          }
          void CapApp.exitApp()
          return
        }

        if (isTabRoot(path)) {
          const now = Date.now()
          if (now - lastBackAt.current < EXIT_HINT_MS) {
            lastBackAt.current = 0
            setHint(false)
            void CapApp.exitApp()
            return
          }
          lastBackAt.current = now
          setHint(true)
          if (hintTimer) clearTimeout(hintTimer)
          hintTimer = setTimeout(() => setHint(false), EXIT_HINT_MS)
          return
        }

        lastBackAt.current = 0
        setHint(false)

        if (canGoBack) {
          navigate(-1)
          return
        }

        const parent = parentPath(path)
        navigate(parent ?? '/', { replace: true })
      })

      removeListener = () => {
        void handle.remove()
      }
    })()

    return () => {
      removeListener?.()
      if (hintTimer) clearTimeout(hintTimer)
    }
  }, [navigate])

  return hint
}

export function BackExitHint({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div className="back-exit-hint" role="status" aria-live="polite">
      한 번 더 누르면 종료됩니다
    </div>
  )
}
