---
name: parallel-delivery
description: Gate 2 이후 프론트·백엔드 병렬 구현, 통합, 검증, 문서화까지 진행한다.
---

# parallel-delivery

## 목적
API 계약과 화면 상태 정의가 확정된 뒤, UI와 서버 작업을 병렬로 끝까지 밀어 넣기 위한 플로우를 제공한다.

## 사용 시점
- `.cursor/rules/60-delivery-gates.mdc`의 Gate 2를 충족한 뒤
- 동일 기능에 대해 `frontend-agent`와 `backend-agent`가 동시에 착수할 때

## 전제(필수 입력)
- PRD 또는 동등한 범위 문서
- **선택·승인된 디자인 1안 = 화면 스펙 SSOT**(이중 목업 비교 단계는 종료된 상태)
- API 계약: 엔드포인트, 스키마, 인증·권한, 오류 포맷·상태 코드
- 화면 상태 정의: 로딩·빈·오류·권한 등과 선택안·API 정합
- 고객 E2E: `docs/qa/stage3-entry-checklist.md` 완료(제품 구현 경로·mock-only 금지 확인)

## 금지(기본)
- Gate 2·stage3 체크리스트 없이 **목업 전용 경로만** 다시 구축하고 병렬 완료로 보고하지 않는다.
- 산출물의 기본 대상은 **본 제품 통합 코드**(라우트·컴포넌트·API 연동)이다.

## 절차
1. 계약을 단일 기준(문서 또는 스펙 조각)으로 고정하고, 변경 시 즉시 `document-change`로 반영한다.
2. `frontend-agent`와 `backend-agent`를 병렬로 투입한다. 토큰·테마 일관성이 필요하면 `design-system-agent`를 병행한다.
3. 통합 시점에 계약과 구현이 일치하는지 확인한다. 불일치면 계약 또는 구현 중 하나를 명시적으로 수정한다.
4. `qa-agent` 또는 `verify-change`로 Gate 3(DoD)을 점검한다. 횡단 패키지·공유 모듈 범위는 [`docs/qa/integration-consumption-gate.md`](../../../docs/qa/integration-consumption-gate.md)의 소비 완료·소비 증거를 포함한다.
5. `docs-agent` 또는 `document-change`로 변경 요약·영향 범위·확인 포인트를 남긴다.

## 결과물
- 프론트·백엔드 **제품 통합** 구현(선택안 스펙 + 확정 API 일치)
- 계약과 일치하는 문서(또는 스펙) 갱신
- 검증 결과 요약
- 전달용 변경 정리

## 예외
- 계약이 흔들리면 병렬을 중단하고 `plan-feature` 또는 `prd-agent`로 범위를 재고정한다.
