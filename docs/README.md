# payClear 문서

PRD v0.2.4를 기준으로 한 **초기 문서 세트**입니다. 정합 점검: [qa/doc-alignment-v0.1.md](./qa/doc-alignment-v0.1.md). SSOT(단일 출처)는 요구사항 PRD이며, 아래 문서는 구현·목업·검수용으로 역할을 나눕니다.

## 문서 맵

| 경로 | 역할 | Gate |
|------|------|------|
| [requirements/payclear-prd-v0.1.md](./requirements/payclear-prd-v0.1.md) | 제품 요구·정책·범위 **SSOT** | 1 |
| [design/screen-spec-v0.1.md](./design/screen-spec-v0.1.md) | 화면·라우트·상태 UI | 1 |
| [api/contract-v0.1.md](./api/contract-v0.1.md) | REST API·오류·인증 | 1→2 |
| [domain/data-model-v0.1.md](./domain/data-model-v0.1.md) | 엔티티·잔액·상태 전이 | 1 |
| [product/glossary.md](./product/glossary.md) | 용어집 | — |
| [product/policies-index-v0.1.md](./product/policies-index-v0.1.md) | 정책·엣지·에러 색인 | — |
| [qa/acceptance-v0.1.md](./qa/acceptance-v0.1.md) | 인수 조건·시나리오 체크리스트 | 3 |
| [decisions/ADR-001-pwa-first.md](./decisions/ADR-001-pwa-first.md) | 플랫폼 결정 기록 | — |
| [decisions/ADR-002-sns-auth-local-postgres.md](./decisions/ADR-002-sns-auth-local-postgres.md) | SNS Auth + 로컬 Postgres | 2 |
| [infra/local-postgres.md](./infra/local-postgres.md) | 로컬 DB·OAuth 환경 변수 | 2 |
| [changelog/2026-06-04-initial-docs.md](./changelog/2026-06-04-initial-docs.md) | 문서 세트 도입 이력 | — |
| [product/user-flows-v0.1.md](./product/user-flows-v0.1.md) | 사용자 플로우 | — |
| [qa/doc-alignment-v0.1.md](./qa/doc-alignment-v0.1.md) | 문서 정합 점검 | — |
| [design/stitch-payclear.md](./design/stitch-payclear.md) | Stitch 2B 산출물 ID·화면 | 2 |
| [design/mock-comparison-v0.1.md](./design/mock-comparison-v0.1.md) | 2A vs 2B 비교·디자인 선택 | 2 |

## 버전 정렬

| 산출물 | 버전 | PRD 절 |
|--------|------|--------|
| PRD | v0.2.4 | 전체 |
| 화면 스펙 | v0.1.1 | §6 |
| API 계약 | v0.1.1 | §8 |
| 데이터 모델 | v0.1.1 | §4, §7 |
| 인수 조건 | v0.1 (+ P5b 항목) | §3, §5, §7 |

PRD가 갱신되면 위 문서의 `PRD 참조` 절을 먼저 맞춥니다.

## 다음 단계

1. ~~PRD 승인~~ **완료** (2026-06-04)
2. **2A·2B·디자인 선택 완료** — **Stitch(B)** [mock-comparison-v0.1.md](./design/mock-comparison-v0.1.md)
3. **Gate 2 구현 진행 중** — `apps/web` · `apps/api` · [stage3-entry-checklist.md](./qa/stage3-entry-checklist.md)
