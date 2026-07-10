import type { CapacitorConfig } from '@capacitor/cli'

/**
 * payClear 안드로이드 앱 Capacitor 설정.
 *
 * - 서버 URL은 여기에 하드코딩하지 않는다. 앱은 번들된 정적 자산(webDir: dist)을 로드하고,
 *   API 호출은 빌드타임 환경변수 VITE_API_BASE(절대 URL)로 수행한다.
 * - OAuth 콜백용 커스텀 스킴 'payclear://' 는 AndroidManifest.xml 의 intent-filter 로 등록한다
 *   (android 폴더 생성 후 자동 패치되며, 누락 시 docs/android-build.md 참고).
 */
const config: CapacitorConfig = {
  appId: 'com.khyun.payclear',
  appName: 'payClear',
  webDir: 'dist',
}

export default config
