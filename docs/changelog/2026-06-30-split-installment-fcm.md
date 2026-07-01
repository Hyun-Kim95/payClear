# 2026-06-30 — 분할 할부 상환 + FCM 정식 설정

## Added (기능: 균등 1/N 분할 + 회차 할부)
- 한 채무를 여러 참여자가 **균등 1/N**로 나누고, 각자 **회차 할부**(예정일·금액)로 상환. 참여자별/전체 완료 추적.
- 마이그레이션 `apps/api/migrations/006_split_installments.sql`
  - `debts.is_split BOOLEAN`
  - `debt_participants(id, debt_id, seq, label, contact_id, share_amount)`
  - `installments(id, debt_id, participant_id, seq, due_on, amount)`
  - `ledger_entries.participant_id`(상환 귀속, 비분할은 NULL)
- 백엔드 `apps/api/src/split-helpers.ts`: 균등 분배·회차 생성·참여자 진행/완료 계산.
- API 계약: `docs/contracts/split-installment-v1.md`

## Changed (계약)
- `POST /debts`: 선택 `split{ participants[], installment{count, interval_months, start_on} }`. 분할 시 `due_on` 무시.
- `POST /debts/:id/ledger`: 분할 채무 `payment`는 `participant_id` **필수**.
- `GET /debts/:id`: `is_split`, `participants[]`(분담/납입/잔액/완료), `installments[]` 추가.
- `Debt`(목록/요약)에 `is_split` 추가.
- 알림 크론(`notify/send.ts`): 비분할은 `debts.due_on`, 분할은 `installments.due_on` 기준 D-1/D-0(미납 회차, 참여자 잔액>0).

## Frontend
- `DebtNew`: 분할 토글, 참여자 입력, 1/N·회차 미리보기.
- `DebtDetail`: 참여자별 진행(진행바·완료 배지)·회차 일정.
- `DebtPayment`: 분할 시 상환 참여자 선택.

## FCM (#1, 설정 위주 — 일부 HUMAN 필요)
- 설정 가이드 `docs/infra/fcm-setup.md` 추가(콘솔·`google-services.json`·Railway 자격증명).
- `VITE_FCM_ENABLED`는 `google-services.json` 배치 전까지 **false 유지**(크래시 방지). 배치 후 true+재빌드.

## Verify
- 전체 회귀: `web build`(tsc) 통과. API `tsx` 런타임(기존 strict 경고는 비차단 베이스라인).
- 스모크: `smoke-split`(생성→회차·1/N→참여자 상환→개인/전원 완료, participant_id 누락 거부) PASS, `smoke:phase2`(비분할 회귀) PASS.

## 미충족(HUMAN 필요)
- Firebase 프로젝트 생성/`google-services.json` 배치, `VITE_FCM_ENABLED=true`+APK 재빌드, Railway `FIREBASE_*` 주입.
