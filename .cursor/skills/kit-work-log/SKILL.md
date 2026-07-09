---
name: kit-work-log
description: 날짜별 작업 일지를 docs/work-log/YYYY-MM-DD.md에 작성·append. 사용자가 /kit-work-log, /work-log, 작업 일지를 입력할 때 사용. document-change·changelog·커밋 저널과 구분.
disable-model-invocation: true
---

# kit-work-log

## 목적

해당 **날짜**에 한 작업을 `docs/work-log/YYYY-MM-DD.md`에 정리해, 나중에 최신 파일만 열어 **완료 / 방법 / 남은 작업**을 빠르게 파악한다.

## 다른 수단과 구분

| | kit-work-log / `/kit-work-log` | document-change | changelog | 커밋 저널 |
|--|-------------------------------|-----------------|-----------|-----------|
| 역할 | **일별 작업 맥락** | 변경 전달·계약 동기화 | 제품 릴리즈 이력 | 커밋마다 자동 |
| 저장 | `docs/work-log/YYYY-MM-DD.md` | (고정 없음) | `docs/changelog/` | Obsidian `journal/` |
| 트리거 | `/kit-work-log`·`/work-log` 훅 또는 본 스킬 | 스킬·규칙 | 수동·릴리즈 | Git post-commit |

## 사용자 입력 (권장)

```text
/kit-work-log
/kit-work-log 오늘 API 연동 작업 정리
/work-log
작업 일지
/kit-work-log 2026-06-09
/kit-work-log date:2026-06-09 어제 분 정리
```

| 입력 | 동작 |
|------|------|
| `/kit-work-log` | **오늘** 날짜 파일에 이번 대화·세션 기준 일지 작성 또는 append |
| `/kit-work-log <추가 지시>` | 동일 + 사용자가 준 범위·강조 반영 |
| `YYYY-MM-DD` 또는 `date:YYYY-MM-DD` | 해당 날짜 파일 대상 |
| `작업 일지` | `/kit-work-log`와 동일 (훅 한국어 매칭) |

접두어 뒤 텍스트만 작업 지시로 해석한다. `/kit-work-log` 자체는 지시가 아니다.

## 에이전트 절차

1. **대상 날짜**를 정한다. 기본은 워크스페이스 로컬 **오늘** (`YYYY-MM-DD`). 프롬프트에 날짜가 있으면 그날짜.
2. **경로:** `docs/work-log/<YYYY-MM-DD>.md`
3. [`docs/work-log/templates/daily-work-log-template.md`](../../../docs/work-log/templates/daily-work-log-template.md)와 [`docs/work-log/README.md`](../../../docs/work-log/README.md) 구조를 따른다.
4. **파일이 없으면** 새로 만든다. frontmatter 예시:

   ```yaml
   ---
   type: work-log
   project: <repo 또는 .cursor-kit 표시명>
   date: YYYY-MM-DD
   updated_at: <ISO8601>
   tags: [work-log]
   ---
   ```

5. **파일이 있으면** 새 파일을 만들지 않고, 맨 아래에 `## Session HH:mm` 섹션을 **append**한다 (`HH:mm`은 로컬 시각).
6. 본문에 반드시 포함할 블록 (스캔 용이 순서):
   - **오늘 한 일 (완료)** 또는 Session 내 **완료**
   - **어떻게 했는지 (방법·결정)** — 주요 파일 경로·결정 이유
   - **남은 작업 / 다음 액션** — 체크리스트 `- [ ]`
   - (있으면) **막힌 점·미확정**
7. 내용 출처: **이번 세션 대화**, 워크스페이스 변경(가능하면 `git status`·diff 요약), 사용자 추가 지시. 근거 없는 추측은 쓰지 않는다.
8. 상세 변경 설명·API 계약·배포 영향이 필요하면 [`document-change`](../document-change/SKILL.md) 템플릿 일부를 **보강**하되, work-log는 **짧고 스캔 가능**하게 유지한다.
9. 저장 후 **한 줄로** 파일 경로와 「남은 작업」 상위 1~3개를 사용자에게 알린다.
10. UTF-8 **BOM 없음**으로 저장한다.

## 완료 보고 (채팅)

`working-principles` 형식을 짧게 적용한다.

- **완료:** 일지 파일 경로, append 여부
- **미완:** 세션에서 확인 불가한 항목
- **다음 액션:** 일지에 적은 체크리스트와 동일하게 상위만 인용

## 관련

- [`docs/work-log/README.md`](../../../docs/work-log/README.md)
- [`document-change`](../document-change/SKILL.md)
- Obsidian 커밋 저널: [`docs/obsidian/README.md`](../../../docs/obsidian/README.md)
