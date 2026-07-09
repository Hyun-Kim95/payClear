---
name: kit-wiki
description: AI 대화·업무 자료·결정을 LLM 위키(docs/wiki/)로 정제 저장하고 다시 꺼내 쓰는 지식 관리. /kit-wiki(ingest+증분 lint), /kit-wiki-ask(읽기 전용 질의). kit-rule-mine(규칙 마이닝)과 다르다.
---

# kit-wiki

## 목적

AI와 나눈 대화·리서치·결정·산출물을 휘발시키지 않고 **`docs/wiki/`라는 단일 지식 저장소**에 정제·축적하고, 필요할 때 자연어로 다시 꺼내 쓴다. "대화 → 정제 → 저장 → 재사용 → 갱신" 순환으로 지식을 자산화한다.

카파시(Karpathy)식 3층 중 **Wiki 층**을 담당한다.
- **Raw**(원본): `docs/wiki/_raw/` — 대화 덤프·원문. **gitignore**(커밋 안 함).
- **Wiki**(정제 노트): `docs/wiki/*.md` — LLM이 만든 요약·결정·링크. 커밋 대상.
- **Schema**(규약): [`docs/wiki/README.md`](../../../docs/wiki/README.md) + 본 스킬.

## 다른 명령과 구분 (중요)

| | kit-wiki | kit-rule-mine |
|--|----------|---------------|
| 뽑는 것 | 업무 **지식**(결정·리서치·Q&A) | 에이전트 **행동 신호**(빠뜨림·반복 실패) |
| 결과물 | `docs/wiki/*.md` 위키 노트 | `rule-candidates.ndjson` 규칙 후보 |
| 다음 단계 | 그대로 읽고 재사용 | **HUMAN 승인** → `shared/rules` 룰 승격 |
| 층 | Wiki(무엇을 아는가) | Schema(어떻게 일하는가) |

위키 노트는 **규칙이 아니다.** "결정 X를 했다"는 기록일 뿐, 에이전트 강제 정책이 아니다. 규칙으로 올릴 패턴은 `kit-rule-mine`/`emergent-rule-capture` 경로(HUMAN 승인)를 따른다. `kit-start`(kit pull·sync), `start-feature`(기능 구현)와도 다르다.

## 명령 / 모드

| 입력 | 모드 | 동작 | 파일 변경 |
|------|------|------|-----------|
| `/kit-wiki <자료/주제>` | 쓰기 | ingest(정제 저장) → **증분 lint** 연속 | 생성/갱신 |
| `/kit-wiki lint` | 쓰기 | **전체** lint만 (증분 아님) | 갱신만 |
| `/kit-wiki-ask <질문>` | 읽기 | query(위키 기반 답변) | **없음(읽기 전용)** |

훅이 없을 때도 "이 대화 위키에 정리해" 처럼 본 스킬을 직접 불러 동작한다. 슬래시 표면: `/kit-wiki`는 **본 스킬**(슬래시 메뉴의 `kit-wiki`), `/kit-wiki-ask`는 명령 [`.cursor/commands/kit-wiki-ask.md`](../../../.cursor/commands/kit-wiki-ask.md). 중복 방지를 위해 `kit-wiki` 명령 파일은 두지 않는다(스킬명과 충돌). bootstrap 훅: `shared/hooks/kit-wiki-on-prompt.ps1`.

## 절차 — ingest (정제 저장)

1. **수집(Capture)** — 대상 자료(대화/붙여넣은 텍스트/파일/주제)를 확인한다. 원문 보존이 필요하면 `docs/wiki/_raw/<주제-slug>-<날짜>.md`에 둔다(gitignore).
2. **정제(Distill)** — LLM이 가공한다.
   - 핵심 요약 + 결론
   - **결정에는 배경 / 대안 / 근거(왜)** 를 함께 기록 (가장 가치 있는 부분)
   - 일관 구조 유지(제목/요약/결정/출처/링크)
   - **review 판정** — [`docs/wiki/README.md`](../../../docs/wiki/README.md) "review" 절 기준으로 `review: pending|done`을 정한다. 외부 사실·OCR·수치·첫 `_raw/` ingest 등은 기본 `pending`, 사용자가 직접 확정한 내부 설계·결정은 `done` 가능.
3. **redaction(필수)** — 커밋 대상 노트(`docs/wiki/*.md`)에는 민감정보를 넣지 않는다.
   - 절대 경로 → `[path]`, 이메일 → `[email]`, `sk-…`/토큰 → `[secret]`, `Bearer …` → `Bearer [redacted]`
   - 고객 실명·내부 식별자·비밀값은 일반화하거나 마스킹한다.
   - 판단이 서지 않는 민감 원문은 `_raw/`(gitignore)에만 두고 노트엔 요약·결정만 남긴다.
4. **저장/구조화(Store)** — `docs/wiki/_templates/wiki-note-template.md`를 따라 노트를 만든다.
   - 파일명: `docs/wiki/<topic-slug>.md` (kebab-case, ASCII 권장)
   - frontmatter: `type: wiki-note`, `project`, `status`(active/deprecated), **`review`(pending/done)**, `tags`, `sources`, `updated_at`
   - **`review: pending`이면** 본문 `## 검토 필요`에 확인할 수치·날짜·인용·외부 사실을 bullet로 적는다. `done`이면 섹션 생략.
   - 기존 같은 주제 노트가 있으면 **새로 만들지 말고 갱신**한다(중복 방지). 사실·결정 내용을 크게 바꾸면 `review: pending`으로 되돌리고 `## 검토 필요`를 갱신한다. 오탈자·링크 등 경미 수정은 기존 `review` 유지.
   - 관련 노트로 `[[wikilink]]` 교차 링크를 건다(결정 → 관련 산출물 → 근거 대화).
5. **index 등록** — `docs/wiki/index.md`(MOC)의 알맞은 고정 카테고리(설계·결정 / 운영·워크플로우 / 리서치 / Q&A / 미분류)에 새 노트 `[[slug]]` 링크를 한 줄 추가한다. 카테고리가 모호하면 "미분류"에 둔다. **기존 노트 갱신이면 index는 그대로** 둔다(중복 등록 금지). `index.md`가 없으면 카테고리 골격으로 새로 만든다.
6. **연속 lint** — 아래 "증분 lint"를 바로 수행한다.
7. 사용자에게 보고: 만든/갱신한 노트 경로, index 등록 카테고리, **`review` 상태**, **검토 필요 항목 1~3줄**(`pending`일 때), 핵심 결정 1~2줄, lint 결과.

## 절차 — lint (정합성 점검)

- **증분(`/kit-wiki` 뒤에 자동):** 이번에 만지거나 링크로 연결된 노트만 점검.
- **전체(`/kit-wiki lint`):** `docs/wiki/` 전체.

점검 항목:
- 깨진 `[[wikilink]]`(대상 노트 없음)
- **index 미등록 노트** — `docs/wiki/*.md`(템플릿·index 제외) 중 `docs/wiki/index.md` 어느 카테고리에도 링크되지 않은 노트 → 고아 후보로 보고하고 카테고리 등록 제안.
- frontmatter 누락/형식 오류(`type`, `updated_at`, **`review`** 등)
- **`review: pending` 노트** — 목록으로 보고. `pending`인데 `## 검토 필요` 섹션이 없으면 추가 제안. 오래된 `pending`(updated_at 기준)은 검토 독촉.
- 모순(같은 주제 노트 간 상반된 결정) → 사용자에게 알리고 갱신 제안
- 오래된 내용 → `status: deprecated` 표시 제안(임의 삭제 금지)
- **redaction 정규식 스캔(1차 안전장치)** — 커밋 대상 노트(`docs/wiki/*.md`)를 [`docs/wiki/README.md`](../../../docs/wiki/README.md) "lint 점검용 정규식 패턴" 표로 스캔한다.
  - 자동 마스킹: 이메일·`sk-…`/`AKIA…` 키·`Bearer …`·`token/secret/api_key/password` 자격증명·절대 경로 → 즉시 마스킹.
  - 경고 후 사용자 확인: 카드번호·주민번호류·긴 hex(32+) 등 오탐 가능 항목은 위치만 보고하고 확인 후 처리(임의 삭제·변형 금지).

결과는 요약으로 보고하고, 자동 수정은 frontmatter/명백한 redaction만. 모순·폐기·오탐 가능 PII는 **제안 후** 사용자 확인.

## 절차 — ask (재사용, 읽기 전용)

1. **`docs/wiki/index.md`(MOC)를 먼저 읽어** 카테고리·노트 목록에서 후보를 좁힌다. 그다음 파일명·제목·태그·본문·`[[링크]]`로 보강한다. index가 없거나 후보가 안 보이면 폴더 전체 탐색으로 폴백한다. RAG/벡터 검색은 기본 범위 밖 — 파일·링크로 시작한다.
2. 찾은 노트의 **결정·근거를 인용**해 답한다. 출처 노트 경로를 함께 제시한다. **`review: pending` 노트는 「검토 전 — 사실 확인 필요」** 를 함께 표시한다.
3. 관련 노트가 없으면 "위키에 없음"을 명확히 하고, 필요하면 `/kit-wiki`로 정리할지 제안한다.
4. **파일을 수정하지 않는다.** 갱신이 필요하면 ask가 아니라 `/kit-wiki`로 분리한다.

## Obsidian 연동

`docs/wiki/`는 기존 [`scripts/obsidian/sync-docs.ps1`](../../../scripts/obsidian/sync-docs.ps1)이 볼트로 단방향 복제한다(별도 동기화 불필요). frontmatter·`## Vault` 링크 규약은 [`docs/requirements/obsidian-local-automation.md`](../../../docs/requirements/obsidian-local-automation.md) 6.5절을 따른다.

## 결과물

- `docs/wiki/<topic>.md` 위키 노트(생성/갱신)
- (선택) `docs/wiki/_raw/…` 원본(gitignore)
- lint 결과 요약, ask 시 출처 인용 답변

## 예외 / 주의

- 커밋은 사용자가 명시할 때만(kit 커밋 안전 원칙). 자동 커밋하지 않는다.
- 민감정보가 섞일 수 있으므로 `_raw/`는 절대 커밋하지 않는다(`.gitignore` 확인).
- 규칙·정책으로 강제할 내용은 위키가 아니라 `kit-rule-mine`/`emergent-rule-capture` 경로로 보낸다.
