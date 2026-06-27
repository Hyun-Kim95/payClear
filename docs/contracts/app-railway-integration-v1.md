# 계약: 안드로이드 앱화 + Railway 배포 (v1)

| 항목 | 내용 |
|------|------|
| 상태 | 확정 (Gate 2 병렬 착수 기준) |
| 날짜 | 2026-06-27 |
| 범위 | `apps/api`(Railway 배포) + `apps/web`(Capacitor Android) |
| 전제 | 비사업자 · 광고/후원 수준 수익(결제·정산 미포함) |

이 문서는 백엔드(Track A)와 프론트/앱(Track B) **병렬 작업의 통합 계약**이다.
양 트랙은 아래 4개 계약만 고정하면 디렉터리 분리(`apps/api` ↔ `apps/web`)로 충돌 없이 병렬 진행한다.

---

## 1. 운영 API URL / API base

- 운영 API는 Railway 도메인(예: `https://payclear-api.up.railway.app`)으로 노출한다. 최종 도메인은 배포 후 확정해 프론트 빌드에 주입한다.
- 프론트는 API base를 **빌드타임 환경변수 `VITE_API_BASE`**로 받는다.
  - 웹 빌드(기본): `VITE_API_BASE` 미설정 → 기존 상대경로 `/api/v1` 유지(Vite proxy/같은 오리진).
  - 앱 빌드: `VITE_API_BASE=https://<railway-domain>/api/v1`.
- `client.ts`의 `request`/`publicRequest`/`API_BASE`/`oauthStartUrl`는 모두 이 base를 통해 절대 URL을 구성한다.
- CORS: 백엔드는 현행 `origin: true` 유지(토큰은 Authorization 헤더, 쿠키 미사용이라 credentials 불필요).

## 2. OAuth 앱 redirect 계약 (딥링크)

- 앱 패키지(appId): `com.payclear.app`, 커스텀 스킴: `payclear`.
- 앱 로그인 흐름:
  1. 앱이 시스템 브라우저(`@capacitor/browser`)로 `GET {API}/api/v1/auth/{provider}/start?client=app` 호출.
  2. 서버는 OAuth state에 `client`(`app` | `web`)를 담는다.
  3. 콜백 처리 후 서버 redirect 분기:
     - `client=app` → `payclear://auth/callback?token=<jwt>` (실패 시 `payclear://auth/callback?error=<code>`)
     - `client=web`(기본) → 기존 `{WEB_ORIGIN}/auth/callback?token=...` 유지.
  4. 앱은 `App.addListener('appUrlOpen')`로 `payclear://auth/callback`을 가로채 `token`/`error`를 파싱 → 기존 `setToken` 로직 재사용.
- 서버 변경 지점: `auth/oauth.ts`의 `createOAuthState`(client 포함), `verifyOAuthState`(client 반환), `redirectWithToken`/`redirectWithError`(client별 분기). `server.ts`의 `/auth/*/start`가 `?client=app` 쿼리를 state로 전달.
- 호환성: `client` 미지정 시 `web`으로 동작(기존 웹 로그인 무변경).
- 사전조건: Google/Kakao 콘솔의 **redirect URI**는 서버 콜백(`{API}/api/v1/auth/{provider}/callback`)이므로 변경 없음. 단, 운영 API 도메인을 redirect URI 허용 목록에 추가 필요.

## 3. FCM 토큰 등록/삭제 계약

신규 엔드포인트(인증 필요, 기존 onRequest 훅 통과):

```
POST /api/v1/me/fcm-token
  body: { "token": string, "platform": "android" }
  201 -> { "ok": true }
  400 -> { "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": {...} } }

DELETE /api/v1/me/fcm-token
  body: { "token": string }
  204 (no content)
  400 -> { "error": { "code": "VALIDATION_ERROR", ... } }
```

- 신규 테이블 마이그레이션 `apps/api/migrations/005_fcm_tokens.sql`:
  - `fcm_tokens(id uuid pk, user_id text/uuid fk users, token text unique, platform text, created_at timestamptz, updated_at timestamptz)`
  - `token` UNIQUE, `ON CONFLICT (token) DO UPDATE`로 user_id 갱신(기존 push_subscriptions 패턴 동일).
- 에러 형식은 기존 규약 `{ error: { code, message, fields? } }` 준수.

## 4. 푸시 발송 (FCM)

- `notify/send.ts`의 `runDueReminders`에 FCM 전송 경로 추가.
- 기존 설정 재사용: `notification_settings.push_enabled`가 true인 사용자에게 web-push(기존)와 FCM(신규)를 함께 시도한다.
- FCM 전송은 `firebase-admin` 사용. **서버 자격증명(`FIREBASE_*` 또는 서비스계정 JSON) env 미설정 시 skip**(VAPID 미설정 시 skip과 동일 패턴) → Firebase 자격증명 준비 전에도 배포·동작 가능.
- 알림 payload는 기존 `{ title, body }` 동일.

---

## 운영 환경변수 (Railway 주입)

| 변수 | 운영값 / 비고 |
|------|------|
| `DATABASE_URL` | Railway Postgres 플러그인이 주입(내부 네트워크) |
| `PORT` | Railway가 주입 |
| `JWT_SECRET` | **신규 강한 값으로 재발급**(로컬 .env 값 회전) |
| `WEB_ORIGIN` | 운영 웹 오리진(웹 호스팅 시) |
| `API_PUBLIC_URL` | `https://<railway-domain>` |
| `ALLOW_DEV_TOKEN` | `false` (운영 필수) |
| `EMAIL_VERIFY_DEV` | `false` (운영 필수) |
| `SEED_DEMO` | `false` (운영 필수 — 데모 데이터 시드 차단) |
| `OAUTH_GOOGLE_*`, `OAUTH_KAKAO_*` | **재발급 권장**(현재 로컬 .env에 평문 노출) |
| `VAPID_*` | 웹 푸시 사용 시 |
| `FIREBASE_*` | FCM 자격증명(준비 후 주입; 미설정 시 FCM skip) |
| `SMTP_*`, `NOTIFY_EMAIL_DEV` | 이메일 리마인더 운영값 |

## 보안 주의

- `apps/api/.env`에 OAuth client secret·JWT_SECRET이 평문 존재(현재 git 미추적). 운영 전 **재발급/회전**하고 Railway 변수로만 주입한다.
- 운영 DB에 데모 시드(`user-1`, 김민수 등) 유입 방지를 위해 `SEED_DEMO` 게이팅 필수.

## DoD (Gate 3)

- [ ] 웹: 기존 동작 무변경(상대경로 base, 웹 OAuth redirect)
- [ ] 앱: Railway API에 연결, OAuth 딥링크 로그인 성공, 토큰 영속 저장
- [ ] FCM: 토큰 등록/삭제 + 리마인더 발송(자격증명 준비 시) e2e
- [ ] 운영 하드닝: dev token off, seed off, SSL 정상
- [ ] 문서: ADR·배포/빌드 가이드 갱신
