import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { initAuth } from './api/client'
import './index.css'

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

// 네이티브(앱)에서는 토큰을 Preferences에서 메모리 캐시로 로드한 뒤 렌더한다.
// 웹은 initAuth가 즉시 resolve되므로 동작/타이밍 변화가 없다.
void initAuth().finally(render)
