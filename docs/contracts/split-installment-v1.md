> **DEPRECATED (2026-07):** 1/N 분할·회차 할부 기능은 제품에서 제거되었습니다. 아래 계약은 레거시 참고용입니다.

# 분할 할부 상환 API 계약 v1

균등 1/N 분할 + 참여자별 회차 할부. 기존 비분할 채무는 영향 없음(필드 추가만).

## 개념
- 채무(`debts`)는 총액(`principal`)과 상대(`contact_id`, 예: 엄마)를 가진다.
- 분할 채무(`is_split=true`)는 여러 **참여자(participant)**가 총액을 **균등 분담**한다.
- 각 참여자는 **회차 할부(installment)** 일정으로 상환한다.
- 참여자 잔액 = 분담액 − 그 참여자 상환 합. 참여자 잔액 0 → 그 참여자 완료.
- 전체 잔액 = 총액 − 전체 상환 합. 전체 0 → 채무 완료(기존 로직 그대로).

## 생성: POST /api/v1/debts
기존 필드(`contact_id|contact_name`, `direction`, `principal`, `occurred_on`, `reason`, `due_on?`)에 더해 분할 시 `split`을 포함한다.

```jsonc
{
  "contact_id": "...",          // 상대(예: 엄마). 기존과 동일
  "direction": "borrowed",
  "principal": 300000,
  "occurred_on": "2026-01-01",
  "reason": "카드 할부 분담",
  "split": {
    "participants": [            // 2명 이상. 균등 분배(나머지는 첫 참여자에 +1)
      { "label": "나" },
      { "label": "동생", "contact_id": "..." }   // contact_id는 선택
    ],
    "installment": {
      "count": 3,                // 회차 수 (>=1)
      "interval_months": 1,      // 회차 간격(개월, >=1)
      "start_on": "2026-01-01"   // 1회차 예정일
    }
  }
}
```

검증: `participants.length >= 2`, 각 `label` 1~40자, `count` 1~60, `interval_months` 1~12, `start_on` 날짜형식. 분할이면 `due_on`은 무시(회차로 대체).

## 상환: POST /api/v1/debts/:id/ledger
분할 채무의 `payment`는 `participant_id`가 **필수**. 비분할/조정은 기존과 동일(생략).

```jsonc
{ "type": "payment", "amount": 50000, "occurred_on": "2026-01-01", "participant_id": "...", "note": null }
```

## 조회: GET /api/v1/debts/:id
기존 필드에 다음을 추가한다(비분할이면 `is_split=false`, 배열은 빈 값).

```jsonc
{
  "is_split": true,
  "participants": [
    {
      "id": "...",
      "label": "동생",
      "contact_id": null,
      "share_amount": 150000,
      "paid_amount": 50000,
      "balance": 100000,
      "completed": false
    }
  ],
  "installments": [
    {
      "id": "...",
      "participant_id": "...",
      "participant_label": "동생",
      "seq": 1,
      "due_on": "2026-01-01",
      "amount": 50000
    }
  ]
}
```

목록(GET /debts)·요약(GET /summary)의 `Debt`에는 `is_split: boolean`만 추가한다.

## 알림(크론)
- 비분할: 기존 `debts.due_on` 기준 D-1/D-0(잔액 > 0).
- 분할: `installments.due_on` 기준 D-1/D-0. 해당 참여자 잔액 > 0일 때만, 본문에 참여자·회차 표기.
