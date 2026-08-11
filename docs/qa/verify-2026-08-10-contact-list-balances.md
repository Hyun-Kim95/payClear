# verify-2026-08-10-contact-list-balances

- **date:** 2026-08-10
- **verifier:** qa-agent (생성·검증 분리)
- **범위:** 상대 목록 인별 `total_receivable` / `total_payable` 표시
- **forbidden:** 제품 코드 미수정(검증·문서만)
- **harness:** `.cursor/state/quality-gate-last.json` 없음(해당 없음)

## 판정

| 등급 | 건수 | 비고 |
|------|------|------|
| BLOCKER | 0 | — |
| MAJOR | 0 | — |
| MINOR | 3 | 타입 optional·라벨 축약·목록 N+1 부하 |

**Gate 3(본 변경):** BLOCKER 0 → 완료 선언 가능(메인이 본 파일 인용).

## checkedItems (기본 완료 루브릭)

`checkedItems: 5/5`

| ID | 항목 | 결과 |
|----|------|------|
| C1 | 요구 대비 구현 일치 | 충족 |
| C2 | 상태 UI(기본/로딩/빈/오류·권한) | 충족(권한·로딩·빈). 비401 오류는 기존 패턴(빈 목록과 구분 약함) — 본 변경 신규 아님 |
| C3 | sync·문서 정합(계약·화면 스펙) | 충족 |
| C4 | 인코딩(한글 깨짐 없음) | 충족(소스·문서 UTF-8 정상) |
| C5 | harness(`quality-gate-last`) | 해당 파일 없음 → 차단 없음 |

`uncheckedIds: []`

## AC 매핑

| AC | 내용 | 증거 | 결과 |
|----|------|------|------|
| AC-01 | 합산은 active·양수·비분할만 | `aggregateContactBalances` 필터; `aggregate-contact-balances.test.ts` (completed/split/0 제외) | **PASS** (자동화 GREEN) |
| AC-02 | lent→receivable, borrowed→payable | 헬퍼 분기 + 동일 테스트 `c1` 10000/3000 | **PASS** (자동화 GREEN) |
| AC-03 | 목록 UI에 받을/갚을 둘 다 표시(0원 포함) | `Contacts.tsx` 매 행에 `받을`·`갚을` + `formatKRW`; `?? 0`으로 0원 표시. 자동화 테스트 없음 → **manual(코드 정적 확인)** | **PASS** (manual) |

### 테스트 실행

```text
npx tsx --test src/aggregate-contact-balances.test.ts  (cwd: apps/api)
# pass 1 / fail 0
```

## 구현·계약 정합 (요약)

- **목록 API:** `GET /api/v1/contacts`가 전 채무 `mapDebtAsync` 후 `aggregateContactBalances` → `mapContactRow`에 주입. 잔액 없는 상대는 `mapContactRow` 기본값 0/0.
- **상세 API:** `GET /api/v1/contacts/:id`가 **동일 헬퍼** 사용 → 목록·상세 서버 합산 규칙 일치.
- **상세 UI:** `ContactDetail`은 `sumContactBalanceByDirection`(active·양수·비분할)로 표시 — 규칙 동등.
- **문서:** `docs/api/contract-v0.1.md` Contact 스키마·§3.2; `docs/design/screen-spec-v0.1.md` §3.9b.

## BLOCKER

(없음)

## MAJOR

(없음)

## MINOR

### m1 — FE `Contact` 필드 optional

- **위치:** `apps/web/src/api/client.ts` — `total_receivable?` / `total_payable?`
- **계약:** `docs/api/contract-v0.1.md`는 필수 number
- **영향:** 목록은 `?? 0`으로 흡수. 타입을 필수로 맞추면 계약·소비자 정합이 더 명확함.

### m2 — 화면 라벨 축약

- **스펙 §3.9b:** 「받을 돈 / 갚을 돈」
- **UI:** 「받을」「갚을」+ `…원`
- **영향:** AC-03(둘 다 표시·0원)은 충족. 문구만 스펙과 미세 차이.

### m3 — 목록 GET 부하

- **위치:** `apps/api/src/server.ts` `GET /contacts` — 사용자 전 채무에 `mapDebtAsync`(원장 조회)
- **영향:** 채무 건수 증가 시 목록 지연 가능. MVP 규모에서는 허용 가능. 추후 SQL 집계·캐시 후보.

## 상태·반응형·다크모드·회귀

| 항목 | 확인 |
|------|------|
| 로딩 | `skeleton` |
| 빈 | 「등록된 상대가 없습니다.」 |
| 권한(401) | `/login` 리다이렉트 |
| 레이아웃 | `.list-row` + `.list-row__meta` column/end — 좁은 폭에서 메타 2줄 우측 정렬 |
| 다크모드 | `var(--pc-*)` 토큰 사용, 하드코딩 색 추가 없음 |
| 회귀 | 상세·일괄상환 합산 유틸 미변경; PATCH 응답은 balances 미포함이나 상세는 `load()` 재조회로 영향 없음 |

## 확인한 파일

- `apps/api/src/payment-helpers.ts` (`aggregateContactBalances`, `mapContactRow`)
- `apps/api/src/aggregate-contact-balances.test.ts`
- `apps/api/src/server.ts` (`GET /contacts`, `GET /contacts/:id`)
- `apps/web/src/pages/Contacts.tsx`
- `apps/web/src/api/client.ts` (`Contact`)
- `apps/web/src/index.css` (`.list-row`, `.list-row__meta`)
- `apps/web/src/pages/ContactDetail.tsx` / `apps/web/src/utils/contactPayment.ts` (상세·규칙 대조)
- `docs/api/contract-v0.1.md`
- `docs/design/screen-spec-v0.1.md` §3.9b

## 다음 액션 (메인)

- Gate 3 완료 시 본 경로와 **BLOCKER 0**을 인용.
- MINOR(m1~m3)는 후속 정리 가능(필수 아님).
