---
name: kit-rule-mine
description: 과거 대화 트랜스크립트에서 운영 규칙 후보를 배치 마이닝(/kit-rule-mine·/rule-mine 훅). kit-start·start-feature와 다르다. 슬래시 자동완성은 본 스킬.
---

# kit-rule-mine

## 목적

로컬 Cursor `agent-transcripts`에서 **암묵적 보정 신호**(빠뜨림·재확인·반복 실패 등)를 집계해 `.cursor/state/rule-mined-report.*`와(선택) `docs/agent/rule-candidates.ndjson`에 후보를 쌓는다. **규칙 SSOT에 자동 반영하지 않는다.**

## 다른 명령과 구분

| | kit-rule-mine / `/kit-rule-mine` | kit-start / `/start` | start-feature |
|--|----------------------------------|----------------------|---------------|
| 역할 | 과거 대화 **마이닝**·후보 수집 | kit **pull·sync** | Gate 1 후 **기능 구현** |
| 트리거 | 채팅 맨 앞 접두어 또는 **본 스킬** | `/start`·`/kit-start` | `/start-feature` |
| 자동완성 | **`kit-rule-mine`** (본 스킬) | `kit-start` | `start-feature` |
| 범위 | PC의 **모든** Cursor projects 트랜스크립트 | 현재 제품 kit sync | 현재 작업 기능 |

**kit 레포(`cursor-workspace-kit`)에서** 훅·스크립트가 동작한다. 제품 레포만 열려 있으면 스크립트 경로가 없을 수 있다.

## 사용자 입력 (권장)

```text
/kit-rule-mine
/kit-rule-mine import
/kit-rule-mine 90
/kit-rule-mine force
/rule-mine import force
규칙 마이닝
규칙 마이닝 강제
```

| 입력 | 동작 |
|------|------|
| `/kit-rule-mine` | 전체 스캔 → 리포트만 |
| `/kit-rule-mine import` | 리포트 + `rule-candidates.ndjson` 병합 |
| `/kit-rule-mine 90` | 최근 90일만 |
| `/kit-rule-mine force` | **쿨다운 무시** 후 전체 스캔 (아래 참고) |
| `규칙 마이닝 강제` | `force`와 동일 |

### 재실행 간격(쿨다운)

- 마지막 전체 스캔 후 **30일**(`rule-signal-patterns.json` `mining.cooldownDays`)이 지나지 않았으면, 훅이 **스캔을 실행하지 않고** 멈춘 뒤 안내 메시지를 띄운다.
- 예: 「마지막 규칙 마이닝은 **5일 전**입니다. 권장 간격 30일. 다시 하려면 `/kit-rule-mine force`」
- **강제 실행:** `/kit-rule-mine force` · `/kit-rule-mine import force` · `규칙 마이닝 강제`

대량 스캔은 **수 분** 걸릴 수 있다(훅 timeout 300s). 터미널 없이 채팅만으로 실행된다.

## 에이전트 절차

1. **먼저** [`.cursor/state/rule-mine-last.json`](../../state/rule-mine-last.json)을 읽는다(없으면 훅 미실행).
2. 요약(`message`, `top_clusters`)과 [`.cursor/state/rule-mined-report.md`](../../state/rule-mined-report.md)를 확인한다.
3. 사용자에게 **HUMAN 검토**를 안내한다: `규칙 후보 목록` → 상위 클러스터 검토 → `규칙 승인` 또는 `shared/skills` 수동 승격([`docs/agent/rule-candidates.md`](../../../docs/agent/rule-candidates.md)).
4. SSOT 반영은 **승인 후**만. `90-runtime-rule-*.mdc` 자동 생성보다 `shared/*` + `sync-kit.ps1`을 권장한다.
5. state가 없거나 오래되었으면 채팅 맨 앞에 **`/kit-rule-mine`**(또는 본 스킬 재선택)으로 훅을 다시 돌리라고 안내한다.

## 관련

- [`docs/agent/rule-candidates.md`](../../../docs/agent/rule-candidates.md)
- [`scripts/agent/Invoke-TranscriptRuleMining.ps1`](../../../scripts/agent/Invoke-TranscriptRuleMining.ps1)
- 실시간 수집: `rule-signal-capture` 훅(별도, 조용히 기록)
