---
name: client-project-lifecycle
description: 고객사 요구 붙여넣기부터 PRD 승인, 이중 목업, 디자인 선택, 병렬 구현, 검증, 테스트·성능까지의 전체 프로젝트(엔드투엔드) 흐름을 단계별로 진행한다.
---

# client-project-lifecycle

## 목적
프로젝트 폴더에 템플릿(서브에이전트·스킬·rules)을 붙여 넣은 뒤, **고객 요구사항을 붙여 넣고** 끝까지 완료하기 위한 **표준 라이프사이클**을 제공한다.  
사람 승인 구간과 되돌림(루프)을 명시한다.

## 사용 시점
- 고객사 신규 프로젝트를 **처음부터** 체계적으로 진행할 때
- PRD 확정 전에는 구현하지 않고, **이중 목업(자체 + Stitch)** 후 디자인을 고르고 싶을 때
- 구현 후 **PRD 재검증 → (선택) 다축 검증·BLOCKER 루프·리뷰어 GATE → 테스트 문서 → 기능/성능 테스트 → 성능 목표까지 리팩터**까지 포함하고 싶을 때

## 전제
- `.cursor/agents/`, `.cursor/skills/`, `.cursor/rules/`, `AGENTS.md` 등 템플릿이 이미 워크스페이스에 있다.
- 고객 요구사항 원문이 채팅 또는 `docs/requirements/` 등에 붙어 있다.
- **수익·사업자:** `.cursor/rules/product-monetization-default.mdc` — 사업자 없음, 수익은 광고·후원만 기본. PRD·계획 초안부터 반영(`docs/agent/product-assumptions.md`). 유료·사업자는 사용자가 명시할 때만.

## 사람 승인(HUMAN) 규칙
아래 단계에서 **HUMAN**이 표시되면, 에이전트는 **다음 단계로 넘어가지 않고** 사용자의 명시적 응답(승인 / 수정 지시 / 선택)을 기다린다.  
사용자가 채팅에 “진행해”, “A안 선택”, “PRD 수정: …”처럼 답한다.  
**단계 4D**의 HUMAN은 팀이 **리뷰어 GATE를 사람 승인**으로 둘 때만 적용한다.

## 출력/보고 형식
- 사용자 입력은 문장형 지시를 기본으로 처리한다.
- 단계별 결과 보고 형식과 승인 대기 표기는 `shared/rules/working-principles.mdc` 출력/승인 규칙을 따른다.
- 완료 상태 판정 보고는 동일 파일의 완료 판정(DoD) 규칙을 따른다.

---

## 단계 0 — 요구사항 반입
1. 사용자가 고객 요구사항을 채팅에 붙여 넣거나, 파일로 두었으면 경로를 알린다.
2. `plan-feature`로 1차 구조화하고, 필요하면 `prd-agent`를 사용한다.
3. 산출: 요구 분석 메모, 미확정·가정 목록.

## 단계 1 — PRD 초안
1. `prd-agent`로 PRD 초안을 작성한다. 저장 위치는 `docs/requirements/` 등 팀 규칙에 따른다.
2. Gate 1 항목(목표, 흐름, 범위, 정책·예외, 미확정)을 PRD에 반영한다. **「전제·가정」**에 수익·사업자 기본값(사업자 없음, 광고·후원)을 명시한다.
3. **모바일 앱**이 범위에 포함되면 `docs/mobile/app-update/policy-and-contract.md` PRD 절을 반영하고, Gate 1 화면 스펙에 `ux-states.md`(권장·강제)를 포함한다.
4. PRD **측정·분석=예**이면 `docs/product-analytics/policy-and-contract.md` PRD 「측정·분석」절을 반영한다.

### HUMAN — PRD 승인
5. **구현·목업 코드 작업을 시작하지 않는다.** PRD 초안을 사용자에게 제시하고 승인 또는 수정 요청을 받는다.
6. 수정 요청이 있으면 PRD를 갱신하고 **다시 HUMAN**으로 돌아간다.
7. 사용자가 **진행 허가**하면 단계 2로 진행한다.

## 단계 2 — 이중 목업 (자체 디자인 + Stitch)
PRD가 확정된 뒤에만 진행한다.
- 단계 2A/2B는 **기본값으로 병렬·동시 착수**한다. 한 트랙 완료를 기다려 다른 트랙을 시작하지 않는다(예외는 사유 기록 필수).

### 2A 자체 디자인 트랙
1. `design-system-agent` 및 `prd-agent`와 정합되는 **자체 UI 방향**(토큰·톤·다크모드)을 잡는다.
2. `frontend-agent`로 **목업 전용 사이트/페이지**를 구현한다. 이 단계 산출물은 **기능 연결 없이 화면 확인만 가능한 정적/프로토타입**이어야 하며, 경로는 프로젝트 규칙에 따른다(예: `/mock-internal`).

### 2B Stitch 트랙
1. `docs/design/stitch-sop.md` 순서로 Stitch MCP를 사용해 프로젝트·디자인 시스템·화면을 생성한다.
2. Stitch 결과를 PRD·Gate 1 화면 스펙과 맞춘다.
3. 사용자 검토를 위해 **Stitch에서 직접 열 수 있는 접근 정보(워크스페이스/프로젝트/화면 링크 또는 ID)**를 문서에 반드시 남긴다.
4. HUMAN 중간 컨펌 전에 사용자 계정 기준으로 열람 가능한지(권한/공유 설정) 확인한다.

### 2C 정합 검증 (루프)
1. **원본 요구사항 + 확정 PRD** 대비 두 트랙 산출물이 범위·상태(로딩·빈·오류·권한)·플랫폼(웹/앱)에 맞는지 점검한다.
2. 어긋나면 단계 2A/2B 또는 PRD로 **되돌아가** 수정한다. 맞을 때까지 반복한다.

### HUMAN — 중간 컨펌
3. 두 트랙 결과를 사용자에게 **동시에** 요약·비교해 보여주고, **추가 수정 없이 디자인 선택으로 넘어갈지** 확인한다.
4. HUMAN 응답(진행/수정 지시) 전에는 단계 3으로 넘어가지 않는다.

## 단계 3 — 디자인 선택 후 병렬 완성

**단계 2(이중 목업)는 여기서 종료한다.** 이후 작업의 기본값은 **선택된 한 안을 스펙으로 삼아 제품 코드베이스에서 구현·완성**하는 것이다.

### HUMAN — 디자인 선택
1. 사용자가 **자체 목업** 또는 **Stitch 기반** 중 하나를 선택한다.
2. **디자인 선택 완료 = 구현 착수**(`.cursor/rules/70-client-lifecycle-default.mdc`). 별도의 “구현만 승인” HUMAN을 추가로 요구하지 않는다.

### 선택 후 목업 vs 제품 구현 (필수)
- 단계 2A 산출물(예: `/mock-internal`, 정적/프로토타입 사이트)과 2B Stitch 산출물은 **비교·스펙 근거**이며, 선택 후 **기본값은 본 제품 앱의 라우트·컴포넌트·모듈**에 구현한다.
- **금지(기본):** Gate 2·`docs/qa/stage3-entry-checklist.md` 없이, 선택안만 보고 **새 목업 전용 사이트/페이지만** 다시 만드는 것. 이를 “구현 완료”로 보고하지 않는다.
- **Stitch 선택 시:** Stitch·토큰·화면 스펙을 **앱 코드·전역 스타일 계약**으로 이전·반영한다. “Stitch/목업 3차”만 반복하지 않는다.
- **허용:** 선택 목업의 레이아웃·토큰·패턴을 **기존 제품 구조**로 이전·통합하고, API 연동·상태 UI(로딩·빈·오류·권한)까지 포함한다.
- **예외:** 사용자가 채팅에서 **명시적으로** “선택안으로 프로토/목업 1회 더”를 요청한 경우만. 사유·범위를 PRD 또는 stage3 체크리스트에 기록한다.

3. **3단계 착수 전 체크리스트를 문서화**한다. `docs/qa/stage3-entry-checklist.md` 또는 동등 문서에 아래를 최소 기록한다.
   - 확정 PRD 문서 경로·버전(또는 최종 수정 시각)
   - 선택된 디자인 기준(자체 목업 또는 Stitch)과 근거 링크/ID
   - **제품 구현 대상 경로**(라우트·모듈·패키지)와 mock 전용 경로 사용 여부(기본: 사용 안 함)
   - Gate 2 고정 대상(API 계약, 상태 UI: 기본·로딩·빈·오류·권한)
   - PRD **측정=예**이면 이벤트 계약 v1 확정(`docs/product-analytics/policy-and-contract.md`)
   - 미확정·리스크·오픈 이슈와 담당자
   체크리스트가 비어 있거나 승인 근거가 없으면 3단계를 시작하지 않는다.

4. 선택된 기준으로 `.cursor/rules/60-delivery-gates.mdc`의 **Gate 2**를 충족하도록 API 계약·상태 UI를 확정한다.

5. **ATDD-lite (RED):** Gate 2 직후·제품 구현 전에 PRD AC를 기준으로 acceptance test 스켈레톤을 RED로 둔다. `docs/qa/stage3-entry-checklist.md` §3d·[`docs/qa/atdd-lite.md`](../../../docs/qa/atdd-lite.md).

6. **목표 산출물**은 연동된 기능 UI·확정 API와 일치하는 **제품 통합 코드**이다. UI+API가 모두 필요하면 `parallel-delivery`로 `frontend-agent` + `backend-agent`를 투입한다. 그 외는 `start-feature`에 맞게 조정한다.

7. 계약 변경 시 `document-change`로 동기화한다.

8. **기능·요구 일치·DoD**는 단계 4에서 **생성·검증 분리**로 판정한다: 산출물 경로 → `qa-agent` 독립 검증 → `verify-change` Gate 3. 메인 **self-verify 금지**. 단계 3만으로 “완료”를 선언하지 않는다.

### 선택 — 완료 루프 하네스(Ralph류 반복)

단계 3 이후(구현·검증·성능 구간)에 **상태 파일 + 훅 경고 + (선택) 테스트 루프**를 쓰려면 `docs/agent/delivery-loop-harness.md`를 따른다.

- **HUMAN·Gate 정의는 변하지 않는다.** PRD 승인·디자인 선택·리뷰어 GATE는 기존 **HUMAN** 규칙이 우선이다.
- 로컬 상태: `docs/qa/delivery-loop-state.example.json`을 참고해 `.cursor/state/delivery-ralph.json`을 두고, `enabled`를 켠 뒤 `lifecyclePhase`를 `verify` / `perf` / `blocker_loop` 중 하나로 맞춘다.
- 편집 시: `.cursor/hooks/guard-delivery-loop.ps1`가 완료 선언과 체크리스트·증빙 키워드를 대조해 **경고**할 수 있다.
- 터미널: `scripts/delivery/Invoke-DeliveryLoop.ps1`로 테스트 명령을 상한까지 반복 실행할 수 있다.

## 단계 4 — 구현 완료 후 PRD 재검증 (루프)
1. **생성·검증 분리:** 구현·문서 산출 후 메인 self-verify 금지. `artifactPaths`·`rubricRef`·`forbidden`만 [`docs/agent/agent-brief.md`](../../../docs/agent/agent-brief.md) **9) Verifier Handoff**로 `qa-agent`에 넘긴 뒤, `verify-change`로 **확정 PRD**와 구현·문서·API 계약 일치를 검증한다 (Gate 3 / DoD).

2. 불일치면 구현 또는 문서를 수정하고 **다시 단계 4**로 돌아간다.

3. 일치하면 **단계 5**로 진행한다. 완료 품질을 더 촘촘히 맞추려면 **단계 4B~4D**를 순서대로 검토한다(모두 선택).

### 선택 — 분석 instrumentation
PRD **측정=예**이고 North Star 퍼널 instrumentation이 범위에 포함된 경우, **단계 5 직전**에 수행한다. **측정=아니오**면 생략.

1. SDK 초기화·env 분리(prod/staging)와 North Star 퍼널 **MVP 이벤트 5~10개**를 `frontend-agent` 주도로 반영한다. 서버 이벤트는 `backend-agent`·이벤트 계약 v1에 따른다.
2. `docs/product-analytics/greenfield-checklist.md` 또는 `brownfield-checklist.md` Gate 3·릴리스 점검을 참고한다.
3. instrumentation만으로 “기능 완료”를 선언하지 않는다 — **단계 4** DoD와 **단계 5** 테스트를 따른다.

---

## 단계 4B — 다축 검증 (LERP 정렬, 선택)
단계 4 통과 **직후**, 사용자가 요청했거나 팀이 완료 기준으로 정한 경우에 수행한다. **기능·아키텍처·코드 품질**을 한 번에 묶지 않고 **축별**로 점검해 리포트로 남긴다.

**생성·검증 분리:** 각 축은 `qa-agent` **Verifier Handoff**(9절, 생성 맥락 미전달)로 점검한다. 메인이 축별 결과를 완화·단정하지 않는다.

1. **기능·수용 기준 축** — 확정 PRD·수용 기준 대비 E2E/통합 관점 점검. `qa-agent` 주도. [`docs/qa/atdd-lite.md`](../../../docs/qa/atdd-lite.md)

2. **아키텍처·구조 축** — 합의된 구조·계층·패턴 준수, 의존 방향·경계. 프로젝트에 맞는 기준으로 `qa-agent` 또는 코드 리뷰 관점으로 정리.

3. **코드 품질·보안 축** — 타입·린트·테스트 커버리지·보안 스캔. PRD **보안 게이트=예**이면 [`docs/security/strict-axis-checklist.md`](../../../docs/security/strict-axis-checklist.md)를 SSOT로 따르고 `npm run security:ci`(또는 동등)로 `.cursor/state/security-last.json`을 갱신한다. **엄격(strict) 티어는 이 축 생략 불가**(사용자 명시 예외만).

4. 산출: `docs/qa/` 등에 **축별 요약**과 **이슈 목록**(BLOCKER / MAJOR / MINOR 구분 권장). 세 축은 **병렬로 진행**해도 된다.

5. **4B를 생략**해도 단계 5로 진행할 수 있다(소규모·긴급 건 등).

## 단계 4C — BLOCKER 수정 루프 (선택)
단계 4B에서 **BLOCKER** 또는 팀이 정한 **출시 불가** 수준이면 수행한다.

1. 이슈를 **우선순위**로 정리한 수정 계획을 짧게 남긴다.

2. FE·BE 모두 해당하면 `frontend-agent`·`backend-agent`로 **병렬 수정**을 검토한다.

3. 수정 후 **단계 4B(해당 축만)** 또는 **단계 4**부터 다시 점검한다. BLOCKER가 없을 때까지 루프한다.

4. 4B를 수행하지 않았다면 이 단계는 생략한다.

## 단계 4D — 리뷰어 GATE (선택)
출시 직전 **한 번 더** 품질을 잠글 때 사용한다. 루브릭은 `docs/qa/reviewer-gate-rubric.md`를 따른다.

1. `qa-agent`로 **5항목 × 20점 = 100점** 만점 채점표를 작성하고, 근거(파일·화면·로그)를 짧게 붙인다.

2. **합격:** 총점 80점 이상이고 루브릭의 치명적 결함 규칙을 만족할 것.

3. 불합격이면 수정 후 **같은 기준으로 재채점**한다. **동일 릴리스 기준 최대 2회**까지 권장하며, 초과 시 범위 축소·에스컬레이션을 검토한다.

### HUMAN — 리뷰어 GATE (선택)
4. 팀 정책으로 **사람이 최종 통과를 서명**하는 경우, 채점 결과를 사용자에게 제시하고 승인 또는 “재수정 후 다시 GATE” 지시를 받는다. **자동 GATE만** 쓰는 팀은 이 HUMAN을 생략한다.

5. 통과(또는 팀 정책상 완료) 후 **단계 5**로 진행한다.

---

## 단계 5 — AC 기반 테스트 실행 및 보완
1. Gate 2·단계 3에서 작성한 **PRD AC·acceptance test**를 기준으로 전체를 실행한다(자동화 + 수동 `manual` AC). `qa-agent`·`docs-agent` 활용.

2. **미자동화 AC**만 `docs/qa/`에 시나리오·실행 기록을 보완 문서화한다. 구현 후에만 시나리오를 처음 쓰는 흐름은 기본 금지([`docs/qa/atdd-lite.md`](../../../docs/qa/atdd-lite.md)).

3. 테스트가 모두 통과할 때까지 루프한다.

## 단계 6 — 성능 테스트 및 리팩터 (루프)

PRD **성능 게이트=예**이면 [`docs/performance/README.md`](../../../docs/performance/README.md)를 따른다. **아니오·미명시**면 아래 1~3만 팀 합의로 진행한다.

1. 성능 기준(응답 시간, 리소스, 번들 크기 등)을 PRD·비기능 요구 또는 [`docs/performance/policy-and-contract.md`](../../../docs/performance/policy-and-contract.md)·`docs/requirements/perf-budget.json`으로 정한다. web / app / api **포함 플랫폼만** `enabled: true`.

2. 제품 `perf:ci`(또는 동등)로 측정하고 `.cursor/state/perf-last.json`을 갱신한다. 목표 미달(`ok: false`)이면 **원인 조사** 후 리팩터·재측정한다(`working-principles` 조사·실패 대응). (선택) `docs/agent/delivery-loop-harness.md` — `lifecyclePhase: perf` + `Invoke-DeliveryLoop.ps1`로 `perf:ci` 반복.

3. 활성 플랫폼 `perf-last.json` `ok: true`(또는 팀 합의)이고 **배포 가능 수준**이면 루프를 종료한다. `perf-last.ok: false`이면 완료 선언하지 않는다(권고, `policy-and-contract.md`).

## 단계 7 — 작업 완료 처리
1. `document-change` 또는 `docs-agent`로 완료 요약·영향 범위·알려진 제한·운영 확인 포인트를 정리한다.

2. 필요 시 `release-check`를 수행한다.

3. 사용자에게 **완료 보고**를 한다.

---

## 연결 스킬·에이전트 (참고)

| 구간 | 스킬 / 에이전트 |
|------|-----------------|
| 요구·PRD | `plan-feature`, `prd-agent` |
| Stitch | `docs/design/stitch-sop.md`, MCP `user-stitch` |
| 단계 2 목업(선택 전) | `design-system-agent`, `frontend-agent`(목업 전용 경로만) |
| 단계 3+ 제품 구현 | `frontend-agent`, `backend-agent`, `parallel-delivery`, `start-feature` |
| ATDD-lite | [`docs/qa/atdd-lite.md`](../../../docs/qa/atdd-lite.md), `stage3-entry-checklist` §3d |
| 검증 | `verify-change`, `qa-agent` |
| 다축 검증·GATE (선택) | 단계 4B~4D, `docs/qa/reviewer-gate-rubric.md` |
| 문서 | `document-change`, `docs-agent` |
| 측정·분석 (측정=예) | `docs/product-analytics/` |
| 성능 게이트 (성능 게이트=예) | `docs/performance/` |
| 보안 게이트 (보안 게이트=예) | `docs/security/` |
| 배포 전 | `release-check` |

## 예외
- 긴급 핫픽스·아주 작은 변경은 `AGENTS.md` **직접 처리 가능한 예외** 섹션에 따라 이 스킬 전체를 생략할 수 있다.
- Stitch 미사용 시 단계 2B는 생략하고 자체 목업만으로 HUMAN 선택을 진행한다.
- 사용자가 **명시적으로** 선택 후 재목업만 요청한 경우에만 2A/2B와 유사한 산출을 허용하며, 예외 사유를 문서에 남긴다.
- 단계 4B~4D는 **선택**이다. 사용자가 “다축 검증·리뷰어 GATE 생략”을 명시하면 단계 4 직후 **단계 5**로 넘어간다.
