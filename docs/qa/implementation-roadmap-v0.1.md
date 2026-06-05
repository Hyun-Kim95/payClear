# payClear v0.1 구현 로드맵

| 항목 | 내용 |
|------|------|
| 갱신 | 2026-06-05 |
| 인프라 | [ADR-002](../decisions/ADR-002-sns-auth-local-postgres.md) |
| 인수 | [acceptance-v0.1.md](./acceptance-v0.1.md) |

---

## 확정 전제 (2026-06-05)

| 항목 | 결정 |
|------|------|
| 로그인 | **SNS OAuth** (Google·Kakao 우선) |
| DB | **로컬 PostgreSQL** → 이후 운영 Postgres |
| 미사용 | **Supabase** (Auth·DB 모두) |
| 프론트/백 | `apps/web` + `apps/api` (Fastify) |

---

## 순서 0 — Postgres 전환 (1단계 전)

| # | 작업 | 완료 기준 |
|---|------|-----------|
| 0.1 | 로컬 Postgres 기동 | `docs/infra/local-postgres.md` — **완료** |
| 0.2 | `migrations/` 스키마 | data-model v0.1.1 테이블 — **완료** |
| 0.3 | API DB 레이어 (`pg`) | SQLite 제거, 시드·CRUD 동작 — **완료** |
| 0.4 | `.env` + health DB ping | `apps/api/.env.example` — **완료** |

> OAuth(순서 3) 전까지 `ALLOW_DEV_TOKEN=true`로 개발 가능.

---

## 순서 1 — 도메인 1단계 (Must 핵심)

Postgres 기준으로 구현.

| # | 기능 | API | UI |
|---|------|-----|-----|
| 1.1 | 조정 F4 | `POST …/ledger` (adjustment) — **완료** | `/debts/:id/adjustment` — **완료** |
| 1.2 | 채무 수정 | `PATCH /debts/:id` — **완료** | `/debts/:id/edit` — **완료** |
| 1.3 | 합의 종료·보관 | `PATCH /debts/:id/status` — **완료** | 상세 모달 — **완료** |
| 1.4 | ledger 삭제 | `DELETE …/ledger/:id` — **완료** | 타임라인 — **완료** |
| 1.5 | 상대 CRUD F1 | `PATCH/DELETE /contacts` — **완료** | 상대 등록·상세 — **완료** |
| 1.6 | 상세 액션 | — | 조정·편집 라우트 연결 — **완료** |

---

## 순서 2~4 (요약)

| 순서 | 범위 |
|------|------|
| 2 | 공유 F16 — share API + `/s/:token` — **완료** |
| 3 | SNS OAuth + `/register-email` + JWT — **완료** (IdP 앱 등록은 HUMAN) |
| 4 | PIN F15, 알림 F11, PWA manifest — **완료** |

---

## 현재 완료

- **순서 0:** 로컬 Postgres, 마이그레이션·시드, `pg` 레이어, SQLite 제거
- **순서 1:** 조정·수정·합의종료·보관·ledger 삭제·상대 CRUD (API + Web)
- **순서 2:** 공유 링크 생성·회수·공개 `/s/:token` (PIN·익명·만료)
- **순서 3:** JWT 미들웨어, Google/Kakao OAuth, `/register-email`
- 홈·목록·상세·등록·상환·조정·편집·상대·공유, Stitch UI
- **순서 4:** F15 PIN 잠금(온보딩·/lock·설정), F11 알림(Push·이메일·cron), PWA(manifest·SW)
- API 스모크: `smoke:phase1` · `smoke:phase2` · `smoke:phase3` · `smoke:phase4`

---

## 다음 액션

**v0.1 Gate 3:** acceptance 수동 QA · 배포 준비
