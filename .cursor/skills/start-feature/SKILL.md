---
name: start-feature
description: Gate 1 확인 후 구현·검증·문서화; 필요 시 parallel-delivery로 병렬 구현을 연결한다.
---

# start-feature

## 목적
신규 기능 요청을 안정적으로 구현하기 위한 기본 플로우를 제공한다.

## 사용 시점
- 새로운 화면 추가
- 새로운 기능 추가
- 기존 기능의 의미 있는 확장
- UI와 API가 함께 바뀌는 작업

## 절차
1. `.cursor/rules/60-delivery-gates.mdc` Gate 1을 점검한다. 미충족이면 구현을 시작하지 않고 `plan-feature` 또는 `prd-agent`로 돌아간다. 모바일 앱에 버전 업데이트 정책을 도입·보완할 때 brownfield면 `docs/mobile/app-update/brownfield-checklist.md` Phase 0 인벤토리를 먼저 수행한다. PRD **측정=예**이고 기존 analytics가 혼재·부분 구현이면 `docs/product-analytics/brownfield-checklist.md` Phase 0 인벤토리를 먼저 수행한다. PRD **성능 게이트=예**이고 기존 성능 CI·지표가 혼재·부분 구현이면 `docs/performance/brownfield-checklist.md` Phase 0 인벤토리를 먼저 수행한다.
2. **고객 E2E(`client-project-lifecycle`)**에서 **디자인 HUMAN 선택이 이미 끝난** 경우: 단계 2A 목업 전용 작업은 **생략**하고, `docs/qa/stage3-entry-checklist.md` → Gate 2 → (필요 시) `parallel-delivery` 또는 본 스킬의 구현 절차로 **단계 3 제품 구현**을 따른다. 선택 후 mock-only 재구축은 `65-design-gate`·lifecycle 단계 3 금지 규칙을 따른다.
3. 요청을 기능 단위로 분해한다.
4. 요구사항이 모호하면 `prd-agent`를 사용해 범위와 정책을 먼저 정리한다.
5. UI+API가 모두 필요하고 Gate 2를 이미 충족했다면 `parallel-delivery`로 병렬 진행을 우선 고려한다.
6. 그 외에는 UI 작업에 `frontend-agent`, API/DB/서비스에 `backend-agent`를 순차·병렬에 맞게 사용한다.
7. 디자인 토큰, 테마, 다크모드 일관성이 중요하면 `design-system-agent`를 사용한다.
8. 구현 후 `qa-agent`로 요구사항 충족 여부와 회귀 위험을 검토한다. (Gate 3의 일부)
9. 마지막으로 `docs-agent`를 사용해 변경사항을 정리한다. (Gate 3의 일부)
10. 공유 패키지·횡단 모듈·kit 연동 범위는 Gate 3 전 [`docs/qa/integration-consumption-gate.md`](../../../docs/qa/integration-consumption-gate.md)의 **소비 증거**를 확인한다(생성-only 완료 금지).

## 출력/보고 형식
- 사용자 입력은 문장형 지시를 기본으로 해석한다.
- 결과 보고 형식(요약/실행/리스크/다음 액션)과 승인 대기 표기는 User-level 출력/승인 규칙을 따른다.
- 완료/검증 완료/출시 준비 판정 보고는 User-level 완료 판정 규칙을 따른다.

## 결과물
- 구현 코드
- 필요한 경우 요구사항 정리 메모
- 검증 결과 요약
- 변경사항 문서

## 예외
- `AGENTS.md` **직접 처리 가능한 예외** 섹션에 해당하는 매우 작은 단일 파일 수정은 메인 에이전트가 직접 처리할 수 있다.
- 요구사항이 명백히 불충분하면 구현보다 범위 정리를 우선한다.