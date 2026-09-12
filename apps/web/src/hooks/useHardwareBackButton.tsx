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
 * 화면 「←」 버튼과 맞춘 한 단계 위 경로.
 * history.back() 대신 쓰면 홈→상세에서 하드웨어 뒤로가기가 홈으로 가는 어색함을 줄인다.
 */
function structuralBack(pathname: string): string | null {
  if (pathname.startsWith('/settings/')) return '/settings'
  if (pathname === '/debts/new') return '/debts'

  const debtChild = pathname.match(/^\/debts\/([^/]+)\/(payment|adjustment|edit|share)$/)
  if (debtChild) return `/debts/${debtChild[1]}`

  if (/^\/debts\/[^/]+$/.test(pathname)) return '/debts'

  const contactPay = pathname.match(/^\/contacts\/([^/]+)\/payment$/)
  if (contactPay) return `/contacts/${contactPay[1]}`

  if (/^\/contacts\/[^/]+$/.test(pathname) && pathname !== '/contacts/new') return '/contacts'

  return null
}

/**
 * Android 하드웨어 뒤로가기.
 * - 탭 루트(홈·채무·상대·설정): 2초 안에 두 번 누르면 종료
 * - 상세·하위 화면: 화면 「←」와 같은 상위 경로로 (history.back 대신)
 * 웹 브라우저에서는 동작하지 않는다.
 */
export function useHardwareBackButton() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const lastBackAt = useRef(0)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigateRef = useRef(navigate)
  const pathnameRef = useRef(pathname)
  const [hint, setHint] = useState(false)

  navigateRef.current = navigate
  pathnameRef.current = pathname

  function clearHintTimer() {
    if (hintTimerRef.current != null) {
      clearTimeout(hintTimerRef.current)
      hintTimerRef.current = null
    }
  }

  function hideHint() {
    clearHintTimer()
    setHint(false)
  }

  // 화면이 바뀌면 종료 안내를 즉시 닫는다.
  useEffect(() => {
    lastBackAt.current = 0
    hideHint()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathname 변경 시에만
  }, [pathname])

  useEffect(() => {
    if (!isNativePlatform()) return

    let cancelled = false
    let removeListener: (() => void) | undefined

    void (async () => {
      const { App: CapApp } = await import('@capacitor/app')
      if (cancelled) return

      const handle = await CapApp.addListener('backButton', ({ canGoBack }) => {
        if (cancelled) return

        const path = pathnameRef.current
        const go = navigateRef.current

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
            go(-1)
            return
          }
          void CapApp.exitApp()
          return
        }

        if (isTabRoot(path)) {
          const now = Date.now()
          if (now - lastBackAt.current < EXIT_HINT_MS) {
            lastBackAt.current = 0
            hideHint()
            void CapApp.exitApp()
            return
          }
          lastBackAt.current = now
          setHint(true)
          clearHintTimer()
          hintTimerRef.current = setTimeout(() => {
            hintTimerRef.current = null
            lastBackAt.current = 0
            setHint(false)
          }, EXIT_HINT_MS)
          return
        }

        lastBackAt.current = 0
        hideHint()

        const up = structuralBack(path)
        if (up) {
          go(up, { replace: true })
          return
        }

        if (canGoBack) {
          go(-1)
          return
        }

        go('/', { replace: true })
      })

      if (cancelled) {
        void handle.remove()
        return
      }

      removeListener = () => {
        void handle.remove()
      }
    })()

    return () => {
      cancelled = true
      removeListener?.()
      if (hintTimerRef.current != null) {
        clearTimeout(hintTimerRef.current)
        hintTimerRef.current = null
      }
      setHint(false)
    }
  }, [])

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
