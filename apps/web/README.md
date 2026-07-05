# payClear Web (제품)

Stitch(B) 디자인 토큰 기반 PWA 프론트엔드.

## 실행

```bash
# 터미널 1 — API
cd apps/api && npm run dev

# 터미널 2 — Web
cd apps/web && npm run dev
```

1. http://localhost:5173 접속
2. 「데모 계정으로 시작」→ API `dev-token` 연동

## Stitch 토큰

- Primary `#1a56db`
- Font Plus Jakarta Sans + Noto Sans KR
- [stitch-payclear.md](../../docs/design/stitch-payclear.md)

## v0.1 진행 상태

- [x] 홈·목록·상세·상대·설정 (읽기)
- [x] **채무 등록** · **상환** (초과 상환 확인 모달)
- [x] 로딩·오류·빈·폼 검증
- [x] 다크모드
- [ ] 조정·공유
- [ ] PWA manifest·서비스워커
- [ ] SNS OAuth (Google/Kakao) — [ADR-002](../../docs/decisions/ADR-002-sns-auth-local-postgres.md)

---

## 안드로이드 앱 (Capacitor)

같은 `apps/web` 코드를 Capacitor로 감싸 안드로이드 앱으로 빌드한다. 통합 규약은
[`app-railway-integration-v1.md`](../../docs/contracts/app-railway-integration-v1.md)를 따른다.

- appId: `com.payclear.app` / appName: `payClear` / webDir: `dist`
- 네이티브 프로젝트: `apps/web/android/**` (Capacitor 생성물, 빌드 산출물은 git 제외)
- 서버 URL은 앱에 하드코딩하지 않는다. 번들된 정적 자산을 로드하고 API는 `VITE_API_BASE`(절대 URL)로 호출한다.

### 1) API base 주입 (`VITE_API_BASE`)

빌드타임 환경변수로 API base를 정한다. [`.env.example`](./.env.example) 참고.

| 빌드 | `VITE_API_BASE` | 결과 |
|------|------|------|
| 웹(기본) | 미설정 | 상대경로 `/api/v1` (같은 오리진 / dev proxy) — **기존 동작 무변경** |
| 앱 | `https://<railway-domain>/api/v1` | 절대 URL로 API 호출 |

```bash
# 앱 빌드용 예시 (apps/web)
echo "VITE_API_BASE=https://payclear-api.up.railway.app/api/v1" > .env.production
```

> `request`/`publicRequest`/`API_BASE`/`oauthStartUrl` 모두 이 base를 사용한다.

### 2) 빌드 · 실행 순서

사전 준비: Android Studio(+ Android SDK / JDK 17 / Gradle). SDK가 없으면 아래 4)까지의 생성·문서는 가능하나 네이티브 빌드는 수행할 수 없다.

```bash
cd apps/web

# (1) 웹 빌드 + 네이티브 동기화 (dist → android, 플러그인 갱신)
npm run cap:sync          # = vite build && cap sync

# (2) 아이콘/스플래시 재생성이 필요할 때 (assets/logo.png 기반)
npm run cap:assets

# (3) Android Studio 열기 → Run ▶ (에뮬레이터/실기기)
npm run android:open

# 또는 CLI로 바로 실행 (연결된 기기/에뮬레이터 필요)
npm run android:run
```

최초 1회 네이티브 프로젝트 생성은 이미 완료되어 있다(`android/`). 재생성이 필요하면:

```bash
# android/ 삭제 후
npm run android:add       # = cap add android
```

### 3) OAuth 딥링크 (커스텀 스킴)

- 앱은 로그인 시 시스템 브라우저로 `GET {API}/auth/{provider}/start?client=app`을 연다.
- 서버는 콜백 후 `payclear://auth/callback?token=...`(실패 시 `?error=...`)로 redirect한다.
- 앱은 `App.addListener('appUrlOpen')`로 이를 가로채 토큰 저장 후 홈으로 이동한다.
- 스킴은 `AndroidManifest.xml`의 intent-filter(`android:scheme="payclear"`)로 등록되어 있다.
- 웹은 기존 `/auth/callback` 쿼리 흐름을 그대로 사용한다.
- Google/Kakao 콘솔의 redirect URI는 **서버 콜백**이므로 변경 없음. 단, 운영 API 도메인을 허용 목록에 추가해야 한다(계약 §2).

### 4) FCM 푸시 (`google-services.json`)

코드/매니페스트는 준비되어 있으나 Firebase 자격증명 파일은 아직 없다. 파일이 없어도 앱은 크래시하지 않는다(네이티브에서만 try/catch로 실행).

활성화 절차:

1. Firebase Console → 프로젝트 → Android 앱 등록(패키지명 `com.payclear.app`).
2. 받은 `google-services.json`을 **`apps/web/android/app/google-services.json`**에 배치한다.
3. Gradle 설정은 이미 조건부로 적용된다:
   - 루트 `android/build.gradle`: `com.google.gms:google-services` classpath 포함.
   - `android/app/build.gradle`: `google-services.json`이 존재할 때만 plugin 적용(파일 없으면 skip).
4. `npm run cap:sync` 후 다시 빌드.
5. 앱 내 **설정 → 알림 → 「앱 알림」 켜기**: 권한 요청 → FCM 토큰을 `POST /api/v1/me/fcm-token`(`{token, platform:'android'}`)으로 전송한다. 웹은 **설정 → 알림 → 「브라우저 알림」** 토글로 web-push를 등록한다.

> 서버 측 FCM 발송 자격증명(`FIREBASE_*`)이 없으면 발송은 skip되며, 토큰 등록/UI는 정상 동작한다(계약 §3·§4).

### 토큰 영속화

- 웹: `sessionStorage`(기존 동작 유지).
- 앱: `@capacitor/preferences`에 저장하고, 앱 시작 시 `initAuth()`로 메모리 캐시에 로드해 동기 `getToken()` 시그니처를 유지한다(`main.tsx`에서 렌더 전 await).

### 추가된 npm 스크립트

| 스크립트 | 설명 |
|------|------|
| `cap:sync` | `vite build && cap sync` (웹 빌드 후 네이티브 동기화) |
| `cap:assets` | `assets/logo.png` 기반 아이콘/스플래시 생성 |
| `android:add` | 네이티브 android 프로젝트 생성 |
| `android:open` | Android Studio로 열기 |
| `android:run` | 연결된 기기/에뮬레이터에서 실행 |
