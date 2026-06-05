# ADR-002: SNS 로그인 + 로컬 PostgreSQL (Supabase 미사용)

| 항목 | 내용 |
|------|------|
| 상태 | **확정** |
| 날짜 | 2026-06-05 |
| PRD | F9, F10, §8.4 구현 스택 |
| 대체 | PRD §8.4「Supabase BaaS / Supabase Auth」추천안 |

## 맥락

- v0.1은 **로그인 + 클라우드 저장**(U2) 필수이나, 호스팅·Auth를 Supabase에 묶지 않기로 함.
- 개발·검증은 **로컬 PostgreSQL**에서 진행.
- 로그인은 **SNS(소셜) OAuth** 중심(PRD F9·§7.3 이메일 보조 정책 유지).

## 결정

| 레이어 | 선택 | 비고 |
|--------|------|------|
| DB | **PostgreSQL** (로컬 → 이후 운영 DB) | Supabase **미사용** |
| 백엔드 | **Node + Fastify** (`apps/api`) | 자체 REST, 도메인·잔액 계산 서버 단일화 |
| 인증 | **SNS OAuth 2.0 / OIDC** → **자체 JWT 세션** | Supabase Auth / Clerk **미사용** |
| 프론트 | React + Vite (`apps/web`) | OAuth는 **백엔드 콜백** 또는 BFF 패턴 |
| 개발 DB | 로컬 Postgres (`DATABASE_URL`) | 현재 SQLite 프로토타입은 **이전 대상** |

### SNS 제공자 (v0.1)

| 우선순위 | 제공자 | 상태 |
|----------|--------|------|
| 1 | **Google** | 구현 예정 |
| 2 | **Kakao** | 구현 예정 (국내 사용자) |
| — | Apple | v0.1 선택(미확정) |

> 최종 제공자 목록은 OAuth 클라이언트 등록 후 `docs/infra/local-postgres.md`에 갱신.

### 인증 흐름 (개념)

```
[웹] SNS 버튼 → [API] GET /auth/{provider}/start
              → IdP 로그인
              → [API] GET /auth/{provider}/callback
              → users·oauth_accounts upsert
              → JWT 발급 → [웹] Bearer 저장

소셜만·이메일 없음 → /register-email (PRD §7.3, 알림 전 필수)
```

- API 보호: `Authorization: Bearer <JWT>` (기존 contract v0.1.1 유지).
- `dev-token` 목업: Postgres·OAuth 착수 전까지 **개발용만** 유지, 운영 제거.

### 이메일 정책 (PRD 유지)

- 소셜만 가입 시 **이메일 등록·인증** 플로우 필수(F11·복구).
- 미인증 시: 채무·ledger **쓰기 허용**, 알림 API는 `403 EMAIL_REQUIRED`.

## 대안

| 대안 | 기각 이유 |
|------|-----------|
| Supabase Auth + DB | 사용자 결정: 미사용 |
| SQLite 장기 사용 | 클라우드·동시성·운영 이전 부담 |
| 이메일/비밀번호만 | SNS 로그인 요구 |

## 결과

- 스키마·마이그레이션: PostgreSQL 단일 (`docs/domain/data-model-v0.1.md` 기준).
- `apps/api`: `pg` + SQL 마이그레이션(또는 경량 ORM)으로 전환.
- 환경 변수: `docs/infra/local-postgres.md`, `apps/api/.env.example`.
- Gate 2: OAuth 엔드포인트·`users` 매핑을 contract 보완 후 OpenAPI 승격.

## 구현 순서 (합의)

| 순서 | 트랙 | 산출 |
|------|------|------|
| **0** | 인프라 | 로컬 Postgres, 스키마, API DB 레이어, `dev-token`→JWT 준비 |
| **1** | 도메인 1단계 | 조정·수정·합의종료·보관·ledger 삭제·상대 CRUD (**Postgres 기준**) |
| **2** | 공유 F16 | share_tokens·공개 `/s/:token` |
| **3** | SNS OAuth | Google/Kakao, `/register-email` |
| **4** | PIN·알림·PWA | F15, F11, manifest |

**1단계 착수 전:** 순서 **0**(Postgres 전환) 최소 완료 권장. SQLite에 1단계만 추가 후 이중 이전은 피함.

## 관련

- [local-postgres.md](../infra/local-postgres.md)
- [contract-v0.1.md](../api/contract-v0.1.md)
- [stage3-entry-checklist.md](../qa/stage3-entry-checklist.md)
