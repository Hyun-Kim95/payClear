/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * API base URL (빌드타임 주입).
   * - 미설정(웹 빌드): 상대경로 '/api/v1' 사용(같은 오리진 / Vite proxy).
   * - 설정(앱 빌드): 'https://<railway-domain>/api/v1' 형태의 절대 URL.
   */
  readonly VITE_API_BASE?: string
  /**
   * 네이티브(안드로이드) FCM 푸시 활성화 플래그.
   * Firebase(google-services.json) 설정이 끝난 빌드에서만 'true'로 켠다.
   * 미설정/false면 네이티브 푸시 등록을 시도하지 않아 미설정 상태의 네이티브 크래시를 방지한다.
   */
  readonly VITE_FCM_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
