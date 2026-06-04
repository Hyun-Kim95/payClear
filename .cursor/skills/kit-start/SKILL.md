---
name: kit-start
description: kit 템플릿 pull·sync(/start·/kit-start 훅). start-feature(기능 구현)와 다르다. 채팅 맨 앞에 /start 또는 /kit-start 를 쓰면 자동완성·훅이 맞는다.
---

# kit-start

## 목적
제품 워크스페이스에서 **cursor-workspace-kit** submodule을 `fetch`/`pull`하고, `.cursor-kit.json` 채널에 맞게 **rules·skills·agents·(선택) harness 훅 스크립트**를 제품 `.cursor/`에 반영한다(채널 A: 공통 skills·agents + project-kit rules).

## `start-feature`와 구분 (필수)

| | kit-start / `/start` / `/kit-start` | `start-feature` |
|--|-------------------------------------|-----------------|
| 역할 | 템플릿 **최신화** + sync | Gate 1 후 **기능 구현** 플로우 |
| 트리거 | 채팅 **맨 앞** 접두어 또는 본 스킬 | 스킬 `/start-feature` |
| 자동완성 | `/kit-start` (본 스킬) | `/start-feature` — **혼동 주의** |

`/sta` 입력 시 `start-feature`가 뜨면 Tab 대신 **`/kit-start `** 또는 **`/start `** 를 직접 입력한다.

## 사용자 입력 (권장)

```text
/start 오늘 할 일: PRD 초안 보완
/kit-start 오늘 할 일: PRD 초안 보완
```

- 접두어 뒤 공백 + **실제 작업 지시**를 이어 쓴다.
- 접두어 자체는 작업 지시가 아니다.

## 에이전트 절차

1. **먼저** 제품 루트의 [`.cursor/state/kit-start-last.json`](../../state/kit-start-last.json)을 읽는다.
2. `ok`가 `false`이면 sync 실패 — 사용자에게 `message`와 submodule·`.cursor-kit.json`·`docs/agent/kit-start.md`를 안내하고, **구현·Gate 진행을 멈춘다.**
3. `ok`가 `true`이면 `message`, `pulled`, `channel`, (있으면) `submoduleRemoteSync`·`submoduleRemoteSyncMessage`를 **한 줄로 요약**한 뒤, 접두어(`/start`, `/kit-start`) **뒤의 지시만** 수행한다. `submoduleRemoteSync: true`이면 `git submodule update --init --remote`가 자동 적용된 것이다.
4. 본 스킬만 호출되었고 state가 없거나 오래되었으면, 사용자에게 **`/start <할 일>`** 또는 **`/kit-start <할 일>`** 로 다시 보내 훅을 돌리라고 안내한다.

## 온보딩

최초 1회: 스킬 **`start-setting`** · `/start-setting` · `/kit-start-setting` 또는 `scripts/Invoke-KitStartSetting.ps1`. 상세: `docs/agent/product-onboarding.md`. **submodule·sync(생성) ≠ kit 사용(소비)** — 소비 확인: [`docs/qa/integration-consumption-gate.md`](../../../docs/qa/integration-consumption-gate.md), `product-onboarding.md` 4단계.

## 관련

- `docs/agent/kit-start.md`
- `AGENTS.md` `/start` 절
