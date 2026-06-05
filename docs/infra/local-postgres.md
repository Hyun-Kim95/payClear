# 로컬 PostgreSQL 개발 환경

| 항목 | 내용 |
|------|------|
| 결정 | [ADR-002](../decisions/ADR-002-sns-auth-local-postgres.md) |
| 용도 | v0.1 API·도메인 개발 DB (Supabase 미사용) |

---

## 1. 전제

- DB 엔진: **PostgreSQL 15+** (로컬 설치 또는 Docker)
- 앱 연결: `apps/api` → `DATABASE_URL`
- 타임존: 비즈니스 일자 **Asia/Seoul** (API·DB `timestamptz` 저장)

---

## 2. 로컬 기동 (예시)

### Docker

```bash
docker run -d --name payclear-pg \
  -e POSTGRES_USER=payclear \
  -e POSTGRES_PASSWORD=payclear \
  -e POSTGRES_DB=payclear \
  -p 5432:5432 \
  postgres:16-alpine
```

### 연결 문자열

```env
DATABASE_URL=postgresql://payclear:payclear@localhost:5432/payclear
```

`apps/api/.env.example` 참고. 실제 비밀번호는 `.env`에만 두고 **커밋 금지**.

---

## 3. 스키마

- SSOT: [data-model-v0.1.md](../domain/data-model-v0.1.md)
- 테이블: `users`, `oauth_accounts`, `contacts`, `debts`, `ledger_entries`, `share_tokens`
- `users` (ADR-002):

| 컬럼 | 설명 |
|------|------|
| `id` | UUID PK |
| `email` | nullable, 인증 후 설정 |
| `email_verified_at` | nullable |
| `created_at` / `updated_at` | timestamptz |

| `oauth_accounts` | |
|------|------|
| `provider` | `google` \| `kakao` \| … |
| `provider_user_id` | IdP subject |
| `user_id` | FK → users |

- 마이그레이션 경로(예정): `apps/api/migrations/`
- **SQLite(`apps/api/data/`)**: 프로토타입용. Postgres 전환 후 제거 예정.

---

## 4. API 전환 체크리스트

- [ ] `pg` 드라이버·연결 풀
- [ ] 마이그레이션 001_initial.sql (또는 도구)
- [ ] 기존 시드·도메인 로직 SQLite → SQL 이전
- [ ] `dev-token` → JWT 미들웨어 (OAuth 전까지 병행 가능)
- [ ] health에 DB ping (`SELECT 1`)

---

## 5. SNS OAuth (로컬)

| 변수 (예정) | 용도 |
|-------------|------|
| `OAUTH_GOOGLE_CLIENT_ID` / `SECRET` | Google |
| `OAUTH_KAKAO_CLIENT_ID` / `SECRET` | Kakao |
| `JWT_SECRET` | API 세션 서명 |
| `WEB_ORIGIN` | `http://localhost:5173` 콜백·CORS |
| `API_PUBLIC_URL` | `http://localhost:3910` |

Redirect URI 예: `{API_PUBLIC_URL}/api/v1/auth/google/callback`

---

## 6. 운영 이전 (v0.1 이후)

- 동일 스키마로 호스팅 Postgres(Railway, RDS 등)에 `DATABASE_URL`만 교체.
- Supabase는 **사용하지 않음**(ADR-002).

---

## 7. 관련

- [ADR-002-sns-auth-local-postgres.md](../decisions/ADR-002-sns-auth-local-postgres.md)
- [contract-v0.1.md](../api/contract-v0.1.md) §3.8, Gate 2 Auth
