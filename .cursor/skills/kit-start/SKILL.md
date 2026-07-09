---
name: kit-start
description: kit 템플릿 pull·sync(/start·/kit-start 훅). start-feature(기능 구현)와 다르다. 채팅 맨 앞에 /start 또는 /kit-start 를 쓰면 자동완성·훅이 맞는다.
---

# kit-start

## 목적
제품 워크스페이스에서 **cursor-workspace-kit** submodule을 `fetch`/`pull`하고, `.cursor-kit.json` 채널에 맞게 **rules·skills·agents·kit 관리 훅**(스크립트 + `hooks.json` merge + Obsidian `post-commit` 정렬)을 제품 `.cursor/`에 반영한다(채널 A: 공통 skills·agents + project-kit rules).

## `start-feature`와 구분 (필수)

| | kit-start / `/start` / `/kit-start` | `start-feature` |
|--|-------------------------------------|-----------------|
| 역할 | 템플릿 **최신화** + sync | Gate 1 후 **기능 구현** 플로우 |
| 트리거 | 채팅 **맨 앞** 접두어·**슬래시 스킬 선택**·본 스킬 | 스킬 `/start-feature` |
| 자동완성 | `/kit-start` (본 스킬 + `.cursor/commands/kit-start.md`) | `/start-feature` — **혼동 주의** |

`/sta` 입력 시 `start-feature`가 뜨면 Tab 대신 **`/kit-start `** 또는 **`/start `** 를 직접 입력한다.

**슬래시 스킬 선택:** Cursor가 `<manually_attached_skills>`로 스킬을 붙여도 **kit-start 의도**로 본다. 훅이 돌았는지는 **state `at`(2분 이내)** 로 확인하고, 아니면 **반드시** `Invoke-KitStart.ps1`을 직접 실행한다.

## 사용자 입력 (권장)

```text
/start 오늘 할 일: PRD 초안 보완
/kit-start 오늘 할 일: PRD 초안 보완
```

- 접두어 뒤 공백 + **실제 작업 지시**를 이어 쓴다.
- 접두어 자체는 작업 지시가 아니다.

## 에이전트 절차

**`/kit-start`·`/start`만 입력해도 pull+sync가 되어야 한다.** 할 일 문장은 sync 트리거가 아니라 **이후 작업 지시**다.

1. 사용자 메시지에 **kit-start 의도**(`/kit-start`·`/start`·**슬래시 스킬 `kit-start` 선택**)가 있으면 **먼저** [`.cursor/state/kit-start-last.json`](../../state/kit-start-last.json)을 읽는다.
2. 아래 중 하나면 **훅·슬래시 UI만 믿지 말고** 제품 루트에서 `vendor/.../scripts/Invoke-KitStart.ps1`(또는 `.cursor-kit.json`의 `kitPath`)를 **Shell로 직접 실행**한다.
   - state 파일 없음
   - `at`이 **이번 요청 시각 기준 2분 이상 전**
   - `afterSha`가 있으나 `vendor/<kitPath>/shared/skills/kit-work-log/SKILL.md`가 **없음**
   - 훅 `user_message`가 비었고 state가 오래됨
   - `<manually_attached_skills>`로 본 스킬만 붙었고 state가 이번 요청에 갱신되지 않음
3. 실행 후 state를 **다시 읽는다.** `ok: false`이면 `message`·`docs/agent/kit-start.md`를 안내하고 **구현·Gate 진행을 멈춘다.**
4. `ok: true`이면 `message`, `pulled`, `afterSha`, `channel`, (있으면) `submoduleRemoteSync`·`submoduleIndexRepaired`·`syncVerified`를 **한 줄로 요약**한 뒤, 접두어 **뒤의 지시만** 수행한다. **뒤에 지시가 없으면** sync 요약만 보고하고 작업은 시작하지 않는다.
5. **오래된 state를 “방금 성공”처럼 읽어서 보고하지 않는다.** `at`·`afterSha`·kit marker 파일로 이번 요청에 sync가 반영됐는지 확인한다.
6. **금지:** “할 일을 붙여야 sync 된다”·“접두어만 보내서 훅이 안 돌았다”고 안내하지 않는다. sync는 `/kit-start`만·슬래시 스킬만으로도 실행되어야 한다.

## 온보딩

최초 1회: 스킬 **`start-setting`** · `/start-setting` · `/kit-start-setting` 또는 `scripts/Invoke-KitStartSetting.ps1`. 상세: `docs/agent/product-onboarding.md`. **submodule·sync(생성) ≠ kit 사용(소비)** — 소비 확인: [`docs/qa/integration-consumption-gate.md`](../../../docs/qa/integration-consumption-gate.md), `product-onboarding.md` 4단계.

## 관련

- `docs/agent/kit-start.md`
- `AGENTS.md` `/start` 절
