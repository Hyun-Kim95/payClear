---
name: context-organization
description: Gate 정의는 바꾸지 않는 선행 러브릭(맥락 정리 3단계 + Human)으로, PRD/스펙·실행계획·점검 위임을 `plan-feature`·`60`·`70`·`75`에 맡긴다.
---

# context-organization

## 목적
**러프한 아이디어·빈약한 기획/디자인**일 때, 구현 전에 **의도·범위·스펙·구조**를 정리하는 **3단 러브릭(레이어 1)**을 따른다.  
Gate 1/2/3의 **정의·적용 범위**는 `.cursor/rules/60-delivery-gates.mdc` **단일 출처**이며, 본 스킬은 그 **선행**일 뿐, Gate를 대체·완화하지 않는다.

## 사용 시점
- 입력이 짧고 추상적일 때
- PRD/목업/API 초안이 없을 때(신규 기능으로 이어질 수 있을 때)
- `plan-feature`로 바로 쓰기보다 **3단(현황 → 범위 → 구조)** 러브릭으로 나눠 가고 싶을 때

## 권한·HUMAN(고객 vs 일반)
- **고객사 전체 납품**이 `.cursor/rules/70-client-lifecycle-default.mdc`에 해당하면 **`client-project-lifecycle`**이 주도한다. HUMAN(예: PRD 승인)은 **lifecycle 단계 0~1**을 따르며, 아래 Human Gate는 **같은 승인**을 **중복**하지 않는다(문구만 보조; 멈춤 1곳).
- **일반/내부** 흐름이면, 각 단계 끝 **Human**은 “다음으로 넘어가도 될지” **한 번에 정리**·승인받는 러브릭으로 쓴다.

## SKILL 01 — 현황 파악 (의도·영향·정책/예외)

**확인**
- **GOAL**: 이번에 **무엇**을 달성하는가(배제할 것 포함).
- **SCOPE(영향)**: 코드·데이터·권한·채널(웹/앱) **어디까지** 건드리는가.
- **RULE(정책·예외)**: 권한, 오류, 엣지 케이스, **아직 못 박는 것/미정** 구분.

**HUMAN(일반)**: “빠진 맥락·미확정 정책” **확인·응답** 후 다음(02). (고객: lifecycle HUMAN이 있으면 그 **승인/수정** 흐름이 우선.)

**위임·참고**
- `plan-feature` **절차 1~4**를 따른다.
- 되돌리기 비싼 선택·미확정·스택/구조는 User-level **미확정 의사결정** 규칙을 적용할 수 있다.

## SKILL 02 — 범위 확정 (UI·검증·문구/스펙)

**확인**
- **INTERFACE(UI 영역)**: 어떤 화면/플로우(상태: 로딩·빈·오류·권한 식별 가능).
- **LOGIC(검증)**: 입력·권한·도메인 규칙 **무엇**을 맞는지.
- **CONTRACT(문구·스펙)**: API/필드/에러/카피 **초안** 수준이 합의 가능한지(문구만 쓰는 단계는 아님: **스펙/계약** 포함).

**HUMAN(일반)**: “포함·제외” **확정** 후 다음(03).

**위임**
- `plan-feature` **절차 5~7** + 필요 시 `prd-agent`, `design-system-agent`.

## SKILL 03 — 구조 설계 (패턴·의존성·리스크)

**확인**
- **PATTERN**: UI/API 분해, **설계** 방향(과도한 스캐폴딩·임의 루트 확정은 `75` 금지·미확정 흐름에 따름).
- **DEPENDENCY**: `frontend`/`backend`/`db`/외부 서비스 **누구**와 연결되는지, 병렬 가능 여부.
- **RISK**: 회귀, 데이터, 보안, 마이그레이션, **열려 있는 질문**.

**HUMAN(일반)**: “프로젝트 맥락”에 맞게 **교정** 후, 구현/착수 쪽으로(아래) 넘어갈지 결정.

**위임**
- User-level **실행 계획** 규칙(라이트 또는 풀)에 **Owner**, 순차/병렬, 통합·완료 기준을 쓴다.
- 필요 시 `Subagent(explore)` 등으로 **의존성**을 좁힌다(분담·타입은 `AGENTS.md`·`75`를 따른다).

## 이후(본 스킬 밖, 권한 유지)
1. `plan-feature` **절차 8~10**에 맞춰, **이미 정한 요지만** `.cursor/rules/60-delivery-gates.mdc` **Gate 1**을 **점검**한다(본 절이 Gate 1 **조건**을 **바꾸지 않는다**는 `.cursor/rules/64-context-organization.mdc`을 따른다).  
2. Gate 1·적용범위가 **충족**되면 `start-feature` 등으로 **구현**; Gate 2 후 **ATDD-lite RED** → UI+API 병렬이면 `parallel-delivery`는 `60`·`AGENTS`를 따른다.

## 결과물
- 단계별 짧은 **체크**와 **HUMAN(승인/응답) 기록**
- (위임에 따라) `plan-feature`/`prd` 산출과, **60 Gate 1 점검 메모**

## 관계(중복 정의 방지)
- `.cursor/rules/64-context-organization.mdc` **경계**
- `.cursor/skills/plan-feature/SKILL.md` **실행 절차**
- 고객: `.cursor/skills/client-project-lifecycle/SKILL.md` **HUMAN** 우선
