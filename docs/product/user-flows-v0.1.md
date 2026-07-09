# payClear 사용자 플로우 v0.1

PRD §3.2·§3.3 기준. 상세 정책은 PRD §7.

---

## 1. 온보딩

```mermaid
flowchart LR
  A[로그인/가입] --> B{이메일 인증?}
  B -->|소셜 최초| C[이메일 등록]
  B -->|OK| D[PIN 설정]
  C --> D
  D --> E[홈]
```

---

## 2. 채무 등록·상환 (S1·S2)

```mermaid
flowchart TD
  H[홈] --> N[채무 등록]
  N --> D[상세/타임라인]
  D --> P[상환 입력]
  P --> D
```

---

## 3. 상대 설명 (S3·S7)

```mermaid
flowchart LR
  D[채무 상세] --> T[타임라인 확인]
  D --> S[공유 링크 생성]
  S --> V[상대 /s/token 조회]
```

---

## 4. 합의 종료·재개 (E2·P5a·P5c·X20)

```mermaid
stateDiagram-v2
  [*] --> Active
  Active --> AgreementLocked: 합의 종료
  AgreementLocked --> Active: 합의 재개_잔액gt0
  AgreementLocked --> Completed_auto: 합의 재개_잔액0
  note right of AgreementLocked
    편집 잠금
    display_label=합의종료
  end note
  AgreementLocked --> AgreementLocked: 잔액0 유지 시 합의종료 라벨 유지_X17
```

---

## 5. 알림 (S5)

- `due_on` 있는 **active** 채무
- D-1·당일 09:00 KST → Push 또는 이메일

---

## 6. 시나리오 ID 색인

| ID | 플로우 |
|----|--------|
| S1~S4 | §2 |
| S5 | §5 |
| S6 | [screen-spec §3.10](../design/screen-spec-v0.1.md) |
| S7 | §3 |
| E1~E8 | PRD §3.3, [acceptance](../qa/acceptance-v0.1.md) |
