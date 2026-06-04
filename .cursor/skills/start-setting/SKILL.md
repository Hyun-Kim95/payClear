---
name: start-setting
description: 제품 레포 1회 온보딩(/start-setting·/kit-start-setting 훅). submodule·.cursor-kit.json·훅·첫 sync. kit-start·start-feature와 다르다.
---

# start-setting

## 목적

제품 워크스페이스에 **cursor-workspace-kit**을 처음 붙이거나 설정을 다시 맞출 때, submodule·`.cursor-kit.json`·`/start` 훅·harness 슬롯·첫 sync를 한 번에 수행한다.

## `kit-start`·`start-feature`와 구분 (필수)

| | start-setting / `/start-setting` | kit-start / `/start`·`/kit-start` | start-feature |
|--|----------------------------------|-------------------------------------|-----------------|
| 역할 | **1회 온보딩**·재설정 | 매일 **pull + sync** | Gate 1 후 **기능 구현** |
| 트리거 | 채팅 맨 앞 `/start-setting` 또는 `/kit-start-setting`, 또는 본 스킬 | `/start`·`/kit-start` 또는 스킬 `kit-start` | 스킬 `start-feature` |
| 자동완성 | **`start-setting`** (본 스킬) | `kit-start` | `start-feature` |

## 사용자 입력 (권장)

```text
/start-setting
/kit-start-setting
```

- 온보딩만 할 때는 접두어만내도 된다.
- **훅이 스크립트를 실행**하려면 메시지가 위 접두어로 **시작**해야 한다. 슬래시 목록에서 스킬만 고르고 본문만 쓰면 훅이 안 돌 수 있다 → 아래 에이전트 절차 4 참고.

## 에이전트 절차

1. **먼저** 제품 루트의 [`.cursor/state/kit-start-setting-last.json`](../../state/kit-start-setting-last.json)을 읽는다.
2. `ok`가 `false`이면 `message`·`steps`를 요약하고, Git 저장소(`git init`)·submodule·`docs/agent/product-onboarding.md` 2단계 PowerShell을 안내한다. **Gate·구현 착수는 멈춘다.**
3. `ok`가 `true`이면 `message`·`channel`·`steps`를 **한 줄로 요약**한 뒤, 이후 일상 작업은 **`/kit-start <할 일>`** 또는 **`/start <할 일>`** 을 안내한다.
4. state가 없거나 오래되었고 사용자가 스킬만 호출한 경우:
   - 사용자에게 **`/start-setting`**(또는 `/kit-start-setting`)을 **채팅 맨 앞에** 다시 보내 훅을 돌리라고 안내하거나,
   - 제품 루트에서 `vendor/cursor-workspace-kit/scripts/Invoke-KitStartSetting.ps1`(또는 kit clone의 `scripts/Invoke-KitStartSetting.ps1 -WorkspaceRoot <제품경로>`) 실행을 제안한다.
5. 온보딩이 끝난 뒤 본 메시지에 **구현·PRD·기능 작업**이 섞여 있으면, **`kit-start-last.json` 확인 후** 그 지시는 `/start`·`/kit-start`로 다시 보내라고 안내한다(본 스킬은 온보딩 전용).

## 전제

- 제품 폴더는 **Git 저장소**여야 한다(`git init` 또는 clone). 상세: `docs/agent/product-onboarding.md`.

## 관련

- `docs/agent/product-onboarding.md`
- `docs/agent/kit-start.md`
- `AGENTS.md` `/start-setting` 절
