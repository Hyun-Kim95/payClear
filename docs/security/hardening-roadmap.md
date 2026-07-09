# payClear 보안 하드닝 로드맵

| 항목 | 내용 |
|------|------|
| 상태 | Phase 2+3 완료 |
| 범위 | `apps/api`, `apps/web` (Capacitor Android) |
| 전제 | 비사업자 · 광고/후원 수준 (결제·정산 미포함) |

---

## Phase 1 (P0+P1) — 완료

| 항목 | 설명 | 상태 |
|------|------|------|
| 운영 부팅 가드 | `NODE_ENV=production` 시 dev 플래그·약한 JWT 차단 | 완료 |
| CORS 화이트리스트 | `WEB_ORIGIN` + `CORS_EXTRA_ORIGINS`; Origin 없음(네이티브) 허용 | 완료 |
| 공유 PIN POST | `GET ?pin=` deprecate → `POST /public/share/:token` body | 완료 |
| FCM/push 소유권 | 타 사용자 token/endpoint 등록 시 409 | 완료 |
| Rate limit | auth·공유·verify-pin 경로 | 완료 |
| nodemailer 업그레이드 | audit High 해소 | 완료 |
| Android 백업·토큰 | `allowBackup=false`, Secure Storage | 완료 |

---

## Phase 2 — OAuth URL token 제거 (완료)

| 항목 | 설명 | 상태 |
|------|------|------|
| 일회용 code | OAuth 콜백 → `?code=` (TTL 60s, 단일 사용) | 완료 |
| `POST /auth/exchange` | `{ code }` → `{ token }`, rate limit | 완료 |
| 클라이언트 | `exchangeAuthCode`, AuthCallback, 앱 딥링크 | 완료 |
| ADR | [ADR-003](../decisions/ADR-003-oauth-code-exchange.md) | 완료 |

**Breaking:** `?token=` 하위호환 없음 — 웹·API·앱 동시 배포 필요.

---

## Phase 3 — 인프라·잠금 서버 연동 (완료)

| 항목 | 설명 | 상태 |
|------|------|------|
| DB SSL | `DATABASE_SSL_REJECT_UNAUTHORIZED`, `DATABASE_SSL_CA` | 완료 |
| Health 분리 | 공개 `/health` → `{ ok }` only; `/internal/health` + `HEALTH_SECRET` | 완료 |
| PIN 서버 세션 | `pin_unlock_until`, 423 `APP_PIN_REQUIRED`, `unlock-session` | 완료 |
| 생체 unlock | device-trust 모델 — `POST /me/security/unlock-session` | 완료 |

---

## 앱 잠금 한계 (의도적)

- 클라이언트 `LockProvider`·생체인증은 **UI 게이트**에 더해, 서버 `pin_unlock_until`로 API도 보호한다.
- JWT가 탈취되고 `pin_unlock_until`이 유효하면 우회 가능 — TTL은 `lock_timeout_minutes`와 동기화.
- 생체 `unlock-session`은 암호학적 증명 없음(device-trust). ADR-003 참고.

---

## 관련 문서

- [API 계약 §3.8–3.10](../api/contract-v0.1.md)
- [Railway 통합 계약](../contracts/app-railway-integration-v1.md)
- [ADR-002 SNS auth](../decisions/ADR-002-sns-auth-local-postgres.md)
- [ADR-003 OAuth code exchange](../decisions/ADR-003-oauth-code-exchange.md)
