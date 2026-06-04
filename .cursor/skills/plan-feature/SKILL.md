---
name: plan-feature
description: 모호한 요청을 구현 가능한 요구사항과 정책으로 정리한다.
---

# plan-feature

## 목적
모호하거나 큰 요청을 바로 구현하지 않고, 구현 가능한 단위로 정리한다.

## `context-organization`과의 관계
`context-organization` 은 **의도·범위·스펙·구조(3단 + Human)** 를 **라벨로 쪼갠 선행**일 뿐, 본 스킬의 **실행 절차·Gate 1 점검(8)** 을 **대체**하지 않는다(`.cursor/rules/64-context-organization.mdc`, `60` 단일 출처). 대략: **01** ≈ 절차 1~4, **02** ≈ 5~7, **03** + 이후 `75` 실행 계획·의존성/리스크 뒤 **8~10**으로 이어 **60**을 점검한다.

## 사용 시점
- 요구사항이 추상적일 때
- 정책과 화면 흐름이 불명확할 때
- 플랫폼별 차이를 먼저 정리해야 할 때
- 개발 전에 범위 정리가 필요한 큰 작업일 때

## 기본 전제
- 범위·정책을 정리하기 **전에** `.cursor/rules/product-monetization-default.mdc`를 확인한다: 사업자 없음, 수익은 광고·후원만 기본(유료·사업자 기능은 사용자 명시 또는 미확정). `docs/agent/product-assumptions.md`.

## 절차
1. 요청의 목표를 정리한다.
2. 사용자 유형과 사용 시나리오를 정리한다.
3. 핵심 기능과 선택 기능을 나눈다.
4. 미확정 항목과 가정을 구분하고, 구현 착수 전에 해소할 항목(정책·권한·핵심 UX 등)을 표시한다.
5. 목업·와이어 또는 동등한 화면 스펙이 필요한지 판단하고, 없으면 산출 계획을 적는다.
6. 모바일 앱이 포함되면 `docs/mobile/app-update/README.md`로 greenfield/brownfield를 선택하고 `policy-and-contract.md`·필요 시 `ux-states.md`를 범위에 반영한다.
6b. PRD에서 **측정·분석=예**이면 `docs/product-analytics/README.md`로 greenfield/brownfield를 선택하고 `policy-and-contract.md` PRD 절을 범위에 반영한다.
6c. PRD에서 **성능 게이트=예**이면 `docs/performance/README.md`로 greenfield/brownfield를 선택하고 `policy-and-contract.md`·`perf-budget.template.json`을 범위에 반영한다(web/app/api `enabled`는 PRD에 명시).
7. 필요하면 `prd-agent`를 사용해 화면, 정책, 예외사항을 문서화한다.
8. 토큰·테마·다크모드·공통 패턴이 이슈면 `design-system-agent`로 목업·스펙과의 정합을 맞춘다.
9. `.cursor/rules/60-delivery-gates.mdc`의 Gate 1에 맞는지 스스로 점검한다.
10. 구현 가능한 단위로 쪼갠다.
11. 이후 작업을 `start-feature`(또는 Gate 2 후 `parallel-delivery`)로 넘길 수 있게 정리한다.

## 결과물
- 기능 범위 정리
- 가정/미확정 항목 목록
- 구현 우선순위
- 화면/정책 초안
- Gate 1 점검 메모(부족 시 보완 항목)

## 예외
- 요청이 이미 충분히 구체적이면 이 스킬을 생략할 수 있다.