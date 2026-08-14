---
name: plan-feature
description: >-
  모호한 요청을 구현 가능한 요구사항과 정책으로 정리한다.
  범위·정책·핵심 UX가 불명확할 때 되돌리기 비싼 선택만 캐물어(grilling) 합의·미확정을 가른 뒤 PRD·범위 초안을 쓴다.
---

# plan-feature

## 목적
모호하거나 큰 요청을 바로 구현하지 않고, 구현 가능한 단위로 정리한다.

## 사용 시점
- 요구사항이 추상적일 때
- 정책과 화면 흐름이 불명확할 때
- 플랫폼별 차이를 먼저 정리해야 할 때
- 개발 전에 범위 정리가 필요한 큰 작업일 때

## 기본 전제
- 범위·정책을 정리하기 **전에** `.cursor/rules/product-monetization-default.mdc`를 확인한다: 사업자 없음, 수익은 광고·후원만 기본(유료·사업자 기능은 사용자 명시 또는 미확정). `docs/agent/product-assumptions.md`.

## 모호할 때 grilling (절차 1 직전)

요청이 추상적이거나 되돌리기 비싼 선택이 열려 있으면, **범위·PRD 초안을 길게 쓰기 전에** 아래를 따른다. (`working-principles.mdc` 미확정 의사결정·확인 질문과 정합.)

1. **도구·코드베이스로 알 수 있는 것은 사람에게 묻지 않는다.**
2. **한 라운드에 확인 질문 1~2개**만 한다. 대상은 되돌리기 비싼 선택에 한정한다(스택, 루트 구조, 핵심 계약, 인증, 도메인 모델, 권한·핵심 UX, 유료/사업자 전제 이탈 등).
3. 답이 오기 전·합의 전에는 그 선택에 대해 **구현하지 않고**, 초안에서 **확정처럼 단정하지 않는다.**
4. 답하지 않거나 “나중에”면 **미확정**으로 남기고, 필요 시 **가정**을 명시한다. 임의로 메우지 않는다.
5. 답이 모이면 같은 기준으로 다음 라운드(다시 1~2개)를 할지 판단한다. 인터뷰만 끝없이 늘리지 않는다.
6. 고객 E2E(`client-project-lifecycle`)면 본 절은 **범위 정리 보조**다. PRD·디자인 **HUMAN 승인 구간을 대체하지 않는다.**

요청이 이미 구체적이면 본 절을 건너뛰고 아래 절차로 간다.

## 절차
1. 요청의 목표를 정리한다.
2. 사용자 유형과 사용 시나리오를 정리한다.
3. 핵심 기능과 선택 기능을 나눈다.
4. 미확정 항목과 가정을 구분하고, 구현 착수 전에 해소할 항목(정책·권한·핵심 UX 등)을 표시한다. (grilling에서 열린 항목을 여기로 옮긴다.)
5. 목업·와이어 또는 동등한 화면 스펙이 필요한지 판단하고, 없으면 산출 계획을 적는다.
6. 모바일 앱이 포함되면 `docs/mobile/app-update/README.md`로 greenfield/brownfield를 선택하고 `policy-and-contract.md`·필요 시 `ux-states.md`를 범위에 반영한다.
6b. PRD에서 **측정·분석=예**이면 `docs/product-analytics/README.md`로 greenfield/brownfield를 선택하고 `policy-and-contract.md` PRD 절을 범위에 반영한다.
6c. PRD에서 **성능 게이트=예**이면 `docs/performance/README.md`로 greenfield/brownfield를 선택하고 `policy-and-contract.md`·`perf-budget.template.json`을 범위에 반영한다(web/app/api `enabled`는 PRD에 명시).
6d. PRD에서 **보안 게이트=예**이면 `docs/security/README.md`로 greenfield/brownfield를 선택하고 `policy-and-contract.md`·`security-policy.template.json`을 범위에 반영한다. 엄격 티어는 6축 활성·4B 보안 축 필수를 PRD에 명시한다.
6e. 보안 게이트 여부와 무관, [`docs/security/vibe-coding-baseline.md`](../../../docs/security/vibe-coding-baseline.md) 5항을 PRD 「비기능·보안(라이트)」 또는 Gate 1 점검 메모에 반영한다. BaaS 사용 시 [`baas-checklist.md`](../../../docs/security/baas-checklist.md), LLM·에이전트 사용 시 [`llm-and-agents.md`](../../../docs/security/llm-and-agents.md)를 범위에 명시한다.
7. 필요하면 `prd-agent`를 사용해 화면, 정책, 예외사항을 문서화한다.
8. UI 목업이 필요하고 방향이 비어 있으면 `design-brief`로 surface·축·금지를 먼저 고정한 뒤, 토큰·테마·다크모드·공통 패턴은 `design-system-agent`로 목업·스펙과 정합을 맞춘다.
9. PRD에 **수용 기준(AC)** 섹션을 포함한다. `AC-01` 형식, 행위·계약·상태 중심. [`docs/qa/acceptance-criteria.template.md`](../../../docs/qa/acceptance-criteria.template.md), [`docs/qa/atdd-lite.md`](../../../docs/qa/atdd-lite.md).
10. `.cursor/rules/60-delivery-gates.mdc`의 Gate 1에 맞는지 스스로 점검한다.
11. 구현 가능한 단위로 쪼갠다.
12. 이후 작업을 `start-feature`(Gate 2 → **ATDD-lite RED** → 구현) 또는 UI+API 병렬 시 `parallel-delivery`로 넘길 수 있게 정리한다.

## 결과물
- 기능 범위 정리
- 가정/미확정 항목 목록
- 구현 우선순위
- 화면/정책 초안
- Gate 1 점검 메모(부족 시 보완 항목)

## 예외
- 요청이 이미 충분히 구체적이면 이 스킬을 생략할 수 있다.