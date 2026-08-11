---
name: start-feature
description: Gate 1 확인 후 구현·검증·문서화; 필요 시 parallel-delivery로 병렬 구현을 연결한다.
---

# start-feature

## 목적
신규 기능 요청을 안정적으로 구현하기 위한 기본 플로우를 제공한다.

## 왜 이 순서인가 (짧게)
- **Gate 1 선행:** 목표·범위·AC·화면/계약 초안 없이 구현하면 되돌리기 비용이 커진다.
- **ATDD-lite RED 선행:** 구현 전에 “무엇이 완료인지”를 실패하는 테스트로 고정해, 완료 선언이 모호해지는 것을 막는다.
- **생성·검증 분리:** 만든 쪽이 스스로 “검증 완료”를 선언하면 self-bias로 누락을 놓치기 쉽다. `qa-agent`가 산출물·루브릭만으로 판정한다.
- **소비 증거(횡단 자산):** 패키지/kit를 “만들기만” 하고 제품이 안 쓰면 Gate 3 완료로 보지 않는다.

## 사용 시점
- 새로운 화면 추가
- 새로운 기능 추가
- 기존 기능의 의미 있는 확장
- UI와 API가 함께 바뀌는 작업

## 절차
1. `.cursor/rules/60-delivery-gates.mdc` Gate 1을 점검한다. 미충족이면 구현을 시작하지 않고 `plan-feature` 또는 `prd-agent`로 돌아간다. 모바일 앱에 버전 업데이트 정책을 도입·보완할 때 brownfield면 `docs/mobile/app-update/brownfield-checklist.md` Phase 0 인벤토리를 먼저 수행한다. PRD **측정=예**이고 기존 analytics가 혼재·부분 구현이면 `docs/product-analytics/brownfield-checklist.md` Phase 0 인벤토리를 먼저 수행한다. PRD **성능 게이트=예**이고 기존 성능 CI·지표가 혼재·부분 구현이면 `docs/performance/brownfield-checklist.md` Phase 0 인벤토리를 먼저 수행한다. PRD **보안 게이트=예**이고 기존 스캔·정책이 혼재·부분 구현이면 `docs/security/brownfield-checklist.md` Phase 0 인벤토리를 먼저 수행한다. 보안 게이트≠예·미명시여도 [`docs/security/vibe-coding-baseline.md`](../../../docs/security/vibe-coding-baseline.md) 링크·BaaS/LLM 해당 시 [`baas-checklist.md`](../../../docs/security/baas-checklist.md)·[`llm-and-agents.md`](../../../docs/security/llm-and-agents.md) 확인을 **권장**한다(차단 아님).
2. **고객 E2E(`client-project-lifecycle`)**에서 **디자인 HUMAN 선택이 이미 끝난** 경우: 단계 2A 목업 전용 작업은 **생략**하고, `docs/qa/stage3-entry-checklist.md` → Gate 2 → **ATDD-lite RED** → (필요 시) `parallel-delivery` 또는 본 스킬의 구현 절차로 **단계 3 제품 구현**을 따른다. [`docs/qa/atdd-lite.md`](../../../docs/qa/atdd-lite.md). 선택 후 mock-only 재구축은 `65-design-gate`·lifecycle 단계 3 금지 규칙을 따른다.
3. 요청을 기능 단위로 분해한다.
4. 요구사항이 모호하면 `prd-agent`를 사용해 범위와 정책을 먼저 정리한다.
5. UI+API가 모두 필요하고 Gate 2를 이미 충족했다면 `parallel-delivery`로 병렬 진행을 우선 고려한다.
6. **ATDD-lite:** Gate 2 충족 **후**·제품 구현 **전**에 PRD AC를 기준으로 acceptance test 스켈레톤을 **RED**로 둔다. `docs/qa/stage3-entry-checklist.md` §3d·[`docs/qa/atdd-lite.md`](../../../docs/qa/atdd-lite.md). AC ID ↔ 테스트 매핑 필수.
7. 그 외에는 UI 작업에 `frontend-agent`, API/DB/서비스에 `backend-agent`를 순차·병렬에 맞게 사용한다. UI 작업 시 `20-web-vs-app`·`30-table-pagination`(해당 시)·`40-dark-mode`·`50-index-css-contract`를 읽고 적용한다(`alwaysApply: false`). 분담·Task 호출은 `working-principles` **분담 임계치**(한 턴 Task 기본 ≤2; FE/BE 병렬은 Gate 2 예외)를 따른다.
8. 디자인 토큰, 테마, 다크모드 일관성이 중요하면 `design-system-agent`를 사용한다.
9. **생성·검증 분리**는 [`verify-change`](../verify-change/SKILL.md) **독립 검증 계약**을 따른다. 구현·문서 산출 후 `qa-agent` handoff → `verify-change`로 Gate 3 마무리.
10. 마지막으로 `docs-agent`를 사용해 변경사항을 정리한다. (Gate 3의 일부)
11. 공유 패키지·횡단 모듈·kit 연동 범위는 Gate 3 전 [`docs/qa/integration-consumption-gate.md`](../../../docs/qa/integration-consumption-gate.md)의 **소비 증거**를 확인한다(생성-only 완료 금지).

## 생성·검증 분리

SSOT: [`verify-change`](../verify-change/SKILL.md) **독립 검증 계약**. 요약만:

1. 산출물 경로 정리 → 메인 self-verify 금지 → `qa-agent`에 [`agent-brief.md`](../../../docs/agent/agent-brief.md) **9) 고정 블록** handoff → `docs/qa/verify-*.md` 저장(BLOCKER 0) → `verify-change`로 판정 인용 후 Gate 3.

검증 산출 저장: `docs/qa/verify-{날짜 또는 slug}.md` (**Gate 3 필수**, 예외는 `AGENTS.md` **직접 처리 가능한 예외**)

## 출력/보고 형식
- 사용자 입력은 문장형 지시를 기본으로 해석한다.
- 결과 보고 형식(요약/실행/리스크/다음 액션)과 승인 대기 표기는 User-level 출력/승인 규칙을 따른다.
- 완료/검증 완료/출시 준비 판정 보고는 User-level 완료 판정 규칙을 따른다.

## 결과물
- 구현 코드
- acceptance test (RED→GREEN, 해당 범위)
- 필요한 경우 요구사항 정리 메모
- 검증 결과 요약
- 변경사항 문서

## 예외
- `AGENTS.md` **직접 처리 가능한 예외** 섹션에 해당하는 매우 작은 단일 파일 수정은 메인 에이전트가 직접 처리할 수 있다.
- 요구사항이 명백히 불충분하면 구현보다 범위 정리를 우선한다.