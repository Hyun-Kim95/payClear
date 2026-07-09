# ADR-003: OAuth 콜백 JWT URL 제거 — 일회용 code 교환

| 항목 | 내용 |
|------|------|
| 상태 | **확정** |
| 날짜 | 2026-07-09 |
| 관련 | ADR-002, [`hardening-roadmap.md`](../security/hardening-roadmap.md) Phase 2 |

## 맥락

OAuth 콜백 후 JWT를 URL 쿼리(`?token=`)로 웹·앱에 전달하면 브라우저 히스토리·Referer·프록시 로그에 노출될 수 있다.

## 결정

1. IdP 콜백 처리 후 **일회용 opaque code**(TTL 60s)를 DB에 저장하고 `user_id`만 보관(JWT 미저장).
2. 클라이언트 redirect: `?code=` (웹 `/auth/callback`, 앱 `payclear://auth/callback`).
3. `POST /api/v1/auth/exchange` — `{ code }` → `{ token }` (JWT 재발급).
4. `?token=` 하위호환 **제거** (웹·API 동시 배포).

## 생체 unlock-session (Phase 3-C 연계)

`POST /me/security/unlock-session`은 네이티브 생체 통과를 **기기 신뢰(device-trust)** 로 간주해 `pin_unlock_until`만 갱신한다. 암호학적 attestation은 v0.1 범위 밖.

## 관련 문서

- [`docs/api/contract-v0.1.md`](../api/contract-v0.1.md) §3.9
- [`docs/contracts/app-railway-integration-v1.md`](../contracts/app-railway-integration-v1.md) §2
