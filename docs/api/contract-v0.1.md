# payClear API 계약 v0.1

| 항목 | 내용 |
|------|------|
| 버전 | v0.1.1 (PRD 정합) |
| PRD | v0.2.3 §8 |
| Base URL | `https://{host}/api/v1` (환경별) |
| 인증 | Bearer 세션(JWT 등, 구현 시 확정) |
| 타임존 | 비즈니스 일자 **Asia/Seoul (KST)** |

Gate 2에서 OpenAPI 3 YAML로 승격합니다.

---

## 1. 공통

### 1.1 요청 헤더

| 헤더 | 필수 | 설명 |
|------|------|------|
| `Authorization` | 인증 API 제외 | `Bearer {token}` |
| `Content-Type` | POST/PATCH | `application/json` |
| `Idempotency-Key` | 권장 | POST ledger·채무 생성 |

### 1.2 오류 응답

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "사용자용 한 줄 메시지",
    "fields": { "principal": "1원 이상 입력해 주세요" }
  }
}
```

### 1.3 오류 코드

| HTTP | code | 설명 |
|------|------|------|
| 400 | `VALIDATION_ERROR` | 복합 검증 |
| 400 | `AMOUNT_ZERO` | 금액 0 |
| 400 | `AMOUNT_TOO_LARGE` | 상한 초과 |
| 400 | `DATE_OUT_OF_RANGE` | 날짜 규칙 위반 |
| 400 | `DEBT_ARCHIVED` | 보관 채무 변경 |
| 400 | `DEBT_AGREEMENT_CLOSED` | 합의 종료 채무 변경 |
| 400 | `CONTACT_IN_USE` | 상대 삭제 불가 |
| 401 | `UNAUTHORIZED` | 미인증·만료 |
| 423 | `APP_PIN_REQUIRED` | 앱 PIN 잠금 세션 만료 |
| 400 | `EXCHANGE_INVALID` | OAuth exchange code 무효·만료·재사용 |
| 401 | `SHARE_PIN_INVALID` | 공유 PIN 불일치 |
| 403 | `EMAIL_REQUIRED` | 알림 API만(기록은 허용) |
| 404 | `NOT_FOUND` | 없음·**타인 소유 리소스**(존재 여부 비노출) |
| 404 | `SHARE_INVALID` | 공유 토큰 무효 |
| 409 | `VERSION_CONFLICT` | `updated_at` 불일치 |
| 409 | `PUSH_TOKEN_OWNED` | FCM/Web Push token·endpoint가 다른 사용자 소유 |
| 429 | `RATE_LIMITED` | 전역·경로별 제한 |
| 429 | `SHARE_PIN_LOCKED` | 공유 PIN 잠금 |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

---

## 2. 리소스 스키마(요약)

### 2.1 Contact

```json
{
  "id": "uuid",
  "display_name": "string",
  "note": "string | null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### 2.2 Debt

```json
{
  "id": "uuid",
  "contact_id": "uuid",
  "contact": { "display_name": "string" },
  "direction": "lent | borrowed",
  "principal": 500000,
  "occurred_on": "YYYY-MM-DD",
  "reason": "string",
  "due_on": "YYYY-MM-DD | null",
  "status": "active | completed | archived",
  "agreement_closed": false,
  "balance": 300000,
  "display_label": "완료 | 합의 종료 | null",
  "is_overdue": false,
  "archived_at": "ISO8601 | null",
  "completed_at": "ISO8601 | null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

- `balance`: 서버 계산 `principal + sum(adjustments) - sum(payments)`
- `display_label` (P5b): `null` | `완료` | `합의 종료`
  - `status=completed` AND `agreement_closed` → `합의 종료` (잔액 무관)
  - `status=completed` AND NOT `agreement_closed` AND `balance=0` → `완료`
  - `status=active` → `null`

### 2.3 LedgerEntry

```json
{
  "id": "uuid",
  "debt_id": "uuid",
  "type": "payment | adjustment",
  "amount": 200000,
  "occurred_on": "YYYY-MM-DD",
  "note": "string | null",
  "created_at": "ISO8601"
}
```

- `payment`: `amount` 양수만
- `adjustment`: `amount` 양수·음수, `note` 필수

### 2.4 Summary

```json
{
  "total_receivable": 1500000,
  "total_payable": 300000,
  "active_count": 12,
  "overdue_count": 2,
  "upcoming_due": [
    { "debt_id": "uuid", "contact_name": "string", "due_on": "YYYY-MM-DD", "balance": 300000, "direction": "lent" }
  ]
}
```

- `total_*`: `archived` 제외, `completed`+잔액>0 포함(N4). balance<0 채무는 해당 방향 합계에 **음수 반영**(X18).
- `upcoming_due`: (선택) F7 「이번 달 예정」— `due_on`이 이번 달·`status=active`·잔액>0

### 2.5 Share (내부)

```json
{
  "token": "opaque",
  "url": "https://{host}/s/{token}",
  "expires_at": "ISO8601 | null",
  "has_pin": true,
  "anonymous": false,
  "created_at": "ISO8601"
}
```

### 2.6 PublicShareView (공개)

`GET` 또는 `POST /public/share/:token` — Debt 상세와 동일 구조의 읽기 전용 + 타임라인. 기록자·계정 정보 없음.

- PIN **없는** 링크: `GET`만 사용.
- PIN **있는** 링크: `POST` Body `{ "pin": "1234" }` 필수. `GET ?pin=` **금지**(400).

---

## 3. 엔드포인트

### 3.1 요약

| Method | Path | 설명 |
|--------|------|------|
| GET | `/summary` | 홈 요약 |

### 3.2 Contacts

| Method | Path | 설명 |
|--------|------|------|
| GET | `/contacts` | 목록 |
| POST | `/contacts` | 생성 `{ display_name, note? }` |
| GET | `/contacts/:id` | 상세 + 연결 `debts[]` 요약(방향·잔액·상태). **S6** 상대별 모음 |
| PATCH | `/contacts/:id` | 수정 |
| DELETE | `/contacts/:id` | 삭제(`CONTACT_IN_USE` 시 400) |

### 3.3 Debts

| Method | Path | 설명 |
|--------|------|------|
| GET | `/debts` | 목록. Query: `direction`, `status`, `filter=overdue`, `q` |
| POST | `/debts` | 생성 |
| GET | `/debts/:id` | 상세 + `ledger_entries[]` + `opening` 이벤트 |
| PATCH | `/debts/:id` | 메타 수정. Body 예: `{ reason, due_on, occurred_on, contact_id, updated_at }` |
| PATCH | `/debts/:id/status` | `{ action: "complete_agreement" \| "reopen_agreement" \| "archive" \| "unarchive", updated_at }` |
| DELETE | `/debts/:id` | 완전 삭제(2단계는 클라이언트) |

**생성 Body 예**

```json
{
  "contact_id": "uuid",
  "direction": "lent",
  "principal": 500000,
  "occurred_on": "2026-01-15",
  "reason": "생활비 빌려줌",
  "due_on": "2026-04-15"
}
```

### 3.4 Ledger

| Method | Path | 설명 |
|--------|------|------|
| POST | `/debts/:id/ledger` | `{ type, amount, occurred_on, note?, updated_at? }` |
| DELETE | `/debts/:id/ledger/:entryId` | 삭제(soft delete 서버) |

서버: ledger 추가·삭제 후 **balance·status·completed_at** 일괄 갱신(도메인 문서 참조).

### 3.5 Share

| Method | Path | 설명 |
|--------|------|------|
| GET | `/debts/:id/share` | 활성 링크 조회 |
| POST | `/debts/:id/share` | `{ expires_in_days?, pin?, anonymous?, include_reason? }` — 기존 링크 회수 후 생성. `include_reason` 기본 `true`(§7.4) |
| DELETE | `/debts/:id/share` | 회수 |

### 3.6 Public (인증 없음)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/public/share/:token` | PIN 없는 링크 조회. Query `pin` 사용 시 **400** |
| POST | `/public/share/:token` | PIN 필요 링크 조회. Body: `{ "pin": "1234" }` |

**CORS:** `WEB_ORIGIN` (+ `CORS_EXTRA_ORIGINS`) 화이트리스트. Origin 헤더 없음(네이티브 앱) 허용.

### 3.7 알림·설정 (v0.1 최소)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/me/notification-settings` | |
| PATCH | `/me/notification-settings` | Push·이메일·D-1/당일 (`EMAIL_REQUIRED` 가능) |
| POST | `/me/push-subscription` | Web Push subscription. 타 사용자 `endpoint` 시 **409** `PUSH_TOKEN_OWNED` |
| POST | `/me/fcm-token` | FCM 등록. 타 사용자 `token` 시 **409** `PUSH_TOKEN_OWNED` |

### 3.8 계정

| Method | Path | 설명 |
|--------|------|------|
| GET | `/me` | 프로필·이메일 인증 여부 |
| POST | `/me/delete-request` | 계정 삭제 예약(P13) |

### 3.9 인증 (OAuth)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/auth/{provider}/start` | OAuth 시작. Query: `client=app` (앱 딥링크) |
| GET | `/auth/{provider}/callback` | IdP 콜백 → `{WEB_ORIGIN}/auth/callback?code=` 또는 `payclear://auth/callback?code=` |
| POST | `/auth/exchange` | Body `{ "code": string }` → `{ "token": string }`. TTL 60s·1회용 |

**Breaking:** 콜백 `?token=` **폐지** (ADR-003).

### 3.10 헬스

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | Liveness `{ "ok": true }` (DB 상태 미포함) |
| GET | `/internal/health` | `{ ok, db }` — `X-Health-Secret` = `HEALTH_SECRET` |

---

## 4. 검증 규칙(서버)

PRD §7.6 X1~X14 적용. 주요:

- `principal`, payment `amount`: 1 ~ 999_999_999_999
- adjustment `amount`: ≠0, 절대값 동일 상한
- `occurred_on`, `due_on`, ledger 날짜: KST 기준
- `reason`: 1~500자
- adjustment `note`: 1~500자

---

## 5. Gate 2 오픈 이슈

- [ ] OpenAPI YAML 파일 경로(`docs/api/openapi.yaml`)
- [ ] SNS OAuth(Google/Kakao) + `users`·`oauth_accounts` 매핑 — [ADR-002](../decisions/ADR-002-sns-auth-local-postgres.md), Supabase 미사용
- [ ] `GET /auth/{provider}/start`, `GET /auth/{provider}/callback`, JWT 발급
- [ ] `updated_at` 낙관적 잠금 모든 PATCH
- [x] Share PIN 검증: POST body (GET `?pin=` deprecate)
- [ ] 페이지네이션(`GET /debts` cursor)

---

## 6. 관련 문서

- [data-model-v0.1.md](../domain/data-model-v0.1.md)
- [screen-spec-v0.1.md](../design/screen-spec-v0.1.md)
