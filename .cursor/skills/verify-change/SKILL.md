---
name: verify-change
description: 구현 결과를 요구사항, 상태 처리, 회귀 위험 기준으로 검증한다.
---

# verify-change

## 목적
구현이 끝난 변경사항을 품질 관점에서 점검한다.

## 사용 시점
- 기능 구현 직후
- 버그 수정 직후
- PR 전 셀프 리뷰
- 사용자 전달 전 점검

## 절차
1. `.cursor/rules/60-delivery-gates.mdc` Gate 3(DoD) 관점에서 완료 조건을 충족하는지 확인한다.
2. 요구사항 대비 구현 누락이 없는지 확인한다.
3. 기본 상태, 로딩, 빈 상태, 오류 상태를 점검한다.
4. 모바일 앱이면 `docs/mobile/app-update/policy-and-contract.md` 4케이스(none / recommended / required / API down)를 점검한다.
4b. PRD **측정=예**이면 North Star 퍼널 대비 핵심 이벤트 발화·properties(PII 없음) spot check를 한다.
4c. PRD **성능 게이트=예**이면 `.cursor/state/perf-last.json`(또는 팀 경로)과 활성 플랫폼(web/app/api) budget 대비 spot check를 한다.
5. 모바일/웹 분기와 반응형을 점검한다.
6. 다크모드 영향을 점검한다.
7. 기존 기능에 영향이 없는지 회귀 위험을 확인한다.
8. `shared/rules`, `shared/skills`, `shared/agents`, `shared/hooks` SSOT를 수정했다면 `scripts/sync-kit.ps1`(또는 해당 `sync-*.ps1`)를 실행하고 결과를 검증 보고에 한 줄 남긴다.
9. `.cursor/state/quality-gate-last.json`이 있으면 `ok`가 `true`인지 확인한다. `false`이면 완료·검증 완료 선언을 하지 않는다 ([`docs/agent/harness-layer1.md`](../../docs/agent/harness-layer1.md)).
10. 텍스트·문서·설정 파일을 추가·수정했다면 diff/미리보기에서 한글이 깨지지 않았는지 확인한다 (`encoding-utf8-global`).
11. 다단계·병렬 작업을 마무리할 때 **완료 항목 / 미완 항목 / 다음 액션**을 한 블록으로 보고하고, 실행 계획·todo와 불일치가 없는지 확인한다.
12. 완료·검증 완료를 선언하기 전, 사용자가 「여전히」「아직」「다시 확인」이라고 하기 쉬운 항목(요구 대비 구현, 상태 UI, sync·문서, 인코딩)을 체크리스트로 짚고, 빈 항목이 있으면 완료 선언하지 않는다.
13. 필요하면 `qa-agent`를 사용해 체크리스트 방식으로 정리한다.
14. 수정이 필요하면 다시 적절한 Skill 또는 Agent로 되돌린다.

(8~12: 과거 대화 마이닝 반영 — [`docs/agent/rule-candidates.md`](../../docs/agent/rule-candidates.md), [`rule-candidates-promotion-preview.md`](../../docs/agent/rule-candidates-promotion-preview.md))

## 결과물
- 검증 결과 요약
- 발견된 이슈 목록
- 수정 필요 항목