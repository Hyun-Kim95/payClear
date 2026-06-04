# 문서 세트 정합 점검 v0.1.1

| 항목 | 내용 |
|------|------|
| 기준 PRD | v0.2.4 (P5b 포함) |
| 점검일 | 2026-06-04 |
| 판정 | **정합** — 아래 「의도적 미확정」 제외 |

---

## 1. 문서 간 매핑

| PRD 절 | 화면 스펙 | API | 도메인 | 인수 |
|--------|-----------|-----|--------|------|
| §5 F1~F16 | §3 | §3 | §2 | §1~9 |
| §6 화면·상태 | §4 | — | — | §8 |
| §7 정책 | §3 | §4 | §4 | §3~7 |
| §8 API | §1 라우트 | 전체 | §2 | — |
| §3 S/E | — | — | — | §10 |

---

## 2. 해소한 충돌

| # | 충돌 | 해소 |
|---|------|------|
| D1 | 도메인 4.1 `balance≠0 → active` vs 합의종료+잔액>0=`completed` | `status`·P5b 기준으로 표 통일 |
| D2 | API `display_label`이 active+`agreement_closed`에도 합의종료 | **completed일 때만** (X6) |
| D3 | E4 참조 | PRD에서 이미 P5①로 수정됨 |
| D4 | EMAIL_REQUIRED 범위 | API·PRD: F11만 차단 |

---

## 3. 보완한 누락

| # | 누락 | 보완 위치 |
|---|------|-----------|
| M1 | P5b UI 라벨 규칙 SSOT | PRD §7.1 P5b |
| M2 | F7 `upcoming_due` | API Summary |
| M3 | S6 상대별 모음 | 화면 §3.10, API `GET /contacts/:id` |
| M4 | 공유 `include_reason` | API share POST, PRD §7.4 |
| M5 | 최초 PIN 라우트 | `/onboarding/pin` |
| M6 | 요약 음수 잔액 집계 | 도메인 §4.2, API Summary |
| M7 | 사용자 플로우 문서 | [user-flows-v0.1.md](../product/user-flows-v0.1.md) |

---

## 4. 의도적 미확정 (충돌 아님)

| 항목 | 문서 | v0.2+ |
|------|------|-------|
| 상대 전화번호 | PRD §4.1 언급만 | contact.phone |
| OpenAPI YAML | API §5 | `openapi.yaml` |
| 합의 종료 취소 UI | PRD X20 | — |
| 약관·개인정보 | PRD §7.2 | 법무 |
| F12~F14 | PRD §5.2 | — |
| 페이지네이션 | API §5 | cursor |

---

## 5. Gate 1 체크

| 항목 | 상태 |
|------|------|
| PRD | ✓ |
| 화면 스펙 v0.1.1 | ✓ |
| API 계약 v0.1.1 | ✓ (Gate 2 OpenAPI) |
| 도메인 v0.1.1 | ✓ |
| 인수 조건 | ✓ |
| 정책 색인·용어 | ✓ |

---

## 6. 변경 시 동기화 순서

1. PRD (SSOT)
2. `domain/data-model` → `api/contract`
3. `design/screen-spec` → `qa/acceptance`
4. 본 문서·changelog 갱신
