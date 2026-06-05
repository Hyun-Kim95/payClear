# Stage 3 진입 체크리스트 (착수 전)

> 디자인 선택·목업 완료 **후** 제품 구현 착수 시 작성. `client-project-lifecycle` 단계 3.

| 항목 | 값 |
|------|-----|
| 상태 | **착수** — Stitch(B) 선택, Gate 2 병렬 구현 진행 |
| 선택일 | 2026-06-05 |

## Gate 2 전제

- [x] 확정 PRD: [payclear-prd-v0.1.md](../requirements/payclear-prd-v0.1.md) v0.2.4 (승인 2026-06-04)
- [x] 선택 디자인: **Stitch (2B)** — [stitch-payclear.md](../design/stitch-payclear.md) · projectId `4769319954386668817`
- [x] 비교·선택 기록: [mock-comparison-v0.1.md](../design/mock-comparison-v0.1.md)
- [x] 화면 스펙: [screen-spec-v0.1.md](../design/screen-spec-v0.1.md) v0.1.1
- [x] API 계약: [contract-v0.1.md](../api/contract-v0.1.md) v0.1.1
- [x] 제품 구현 경로: `apps/web`(PWA 프론트), `apps/api`(REST). **mock-internal은 비교용 유지, 제품에 재사용 안 함**
- [x] v0.1 구현 착수: 채무 등록 `POST /debts`, 상환 `POST /debts/:id/ledger`
- [ ] OpenAPI YAML: `docs/api/openapi.yaml` (구현 중 승격)
- [x] **인프라 결정:** SNS OAuth + **로컬 PostgreSQL** — [ADR-002](../decisions/ADR-002-sns-auth-local-postgres.md), Supabase 미사용
- [x] Postgres 전환(순서 0): 마이그레이션·`DATABASE_URL`·SQLite 제거 — 2026-06-05
- [x] 순서 1 도메인: 조정·수정·합의종료·보관·ledger 삭제·상대 CRUD — 2026-06-05
- [x] 순서 2 공유 F16: share API + `/s/:token` — 2026-06-05
- [x] SNS OAuth: Google/Kakao start/callback, JWT, `/register-email` — 2026-06-05 (IdP 클라이언트 등록은 로컬 HUMAN)
- [ ] 미확정·리스크: Apple 로그인 포함 여부, 약관, F12~14, Share PIN 쿠키 방식

## 디자인 이전 (Stitch → 제품)

| 토큰 | 값 |
|------|-----|
| primary | `#1a56db` |
| font | Plus Jakarta Sans + Noto Sans KR |
| roundness | 8~16px (카드 xl) |
| 참고 화면 | 홈 `2c9f0b8a…`, 목록 `a987268d…`, 상세 `6c87db36…` |

2A [mock-internal](../../mock-internal/)는 라우트·상태·`display_label` 동작 참고만.

## 병렬 분담

| 트랙 | 담당 | 경로 | Gate 2 조건 |
|------|------|------|-------------|
| 프론트 | frontend-agent 성격 | `apps/web` | 화면 스펙·Stitch 토큰·로딩/빈/오류 UI |
| 백엔드 | backend-agent 성격 | `apps/api` | contract v0.1.1 엔드포인트·오류 포맷 |
| 통합 | 본 세션 Owner | API base `/api/v1` | 계약·스키마 일치 후 연동 |

**충돌 주의:** `Debt`/`display_label` 계산은 **서버 단일화**(data-model §4.2). 프론트는 표시만.

## PRD 승인 기록

| 일자 | 결과 |
|------|------|
| 2026-06-04 | **승인** — PWA, 클라우드, 공유·알림·잠금, 합의 종료 유지(X17) |

## 디자인 선택 기록

| 일자 | 결과 |
|------|------|
| 2026-06-05 | **Stitch(B)** — 비주얼·카드·타이포 기준. 구현 착수 승인 |
