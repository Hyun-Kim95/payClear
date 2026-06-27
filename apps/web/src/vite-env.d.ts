/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * API base URL (빌드타임 주입).
   * - 미설정(웹 빌드): 상대경로 '/api/v1' 사용(같은 오리진 / Vite proxy).
   * - 설정(앱 빌드): 'https://<railway-domain>/api/v1' 형태의 절대 URL.
   */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
