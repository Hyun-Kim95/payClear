# beforeSubmitPrompt: /kit-wiki (ingest + incremental lint) | /kit-wiki lint (full) | /kit-wiki-ask (read-only query)
# Bootstraps docs/wiki/ folders and injects the mode as additional_context. LLM does the actual ingest/lint/ask.
# Windows PowerShell 5.1 + UTF-8 stdout for Cursor. fail-open.
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Resolve-KitCommonPath {
    param([string]$Root)
    $candidates = @(
        (Join-Path $Root "scripts\Kit-HookCommon.ps1"),
        (Join-Path $Root "vendor\cursor-workspace-kit\scripts\Kit-HookCommon.ps1")
    )
    foreach ($p in $candidates) {
        if (Test-Path -LiteralPath $p) { return $p }
    }
    return $null
}

$commonPath = Resolve-KitCommonPath -Root $projectRoot
if (-not $commonPath) { exit 0 }
. $commonPath
Initialize-KitHookConsole

function Get-AllStringValues {
    param([object]$Node)
    $values = New-Object System.Collections.Generic.List[string]
    if ($null -eq $Node) { return $values }
    if ($Node -is [string]) { $values.Add($Node); return $values }
    if ($Node -is [System.Collections.IDictionary]) {
        foreach ($key in $Node.Keys) {
            foreach ($item in (Get-AllStringValues -Node $Node[$key])) { $values.Add($item) }
        }
        return $values
    }
    if ($Node -is [System.Collections.IEnumerable] -and -not ($Node -is [string])) {
        foreach ($entry in $Node) {
            foreach ($item in (Get-AllStringValues -Node $entry)) { $values.Add($item) }
        }
        return $values
    }
    foreach ($prop in $Node.PSObject.Properties) {
        foreach ($item in (Get-AllStringValues -Node $prop.Value)) { $values.Add($item) }
    }
    return $values
}

function Get-PromptText {
    param([object]$Payload)
    if ($null -eq $Payload) { return "" }
    if ($Payload.PSObject.Properties.Name -contains "prompt") { return [string]$Payload.prompt }
    $all = Get-AllStringValues -Node $Payload
    if ($all.Count -eq 0) { return "" }
    return ($all -join "`n")
}

function Get-UserQueryText {
    param([string]$Prompt)
    if ([string]::IsNullOrWhiteSpace($Prompt)) { return "" }
    if ($Prompt -match '(?is)<user_query>\s*(.*?)\s*</user_query>') {
        return $Matches[1].Trim()
    }
    return $Prompt
}

function Test-AttachedSkillName {
    param([string]$Prompt, [string]$SkillName)
    if ([string]::IsNullOrWhiteSpace($Prompt)) { return $false }
    $escaped = [regex]::Escape($SkillName)
    return ($Prompt -match "(?is)<manually_attached_skills>.*?Skill\s+Name:\s*$escaped\b")
}

function Get-KitWikiMode {
    param([string]$Prompt)
    # Returns: "ask" | "lint" | "ingest" | "" (no match)
    $texts = @($Prompt, (Get-UserQueryText -Prompt $Prompt))
    foreach ($t in $texts) {
        if ([string]::IsNullOrWhiteSpace($t)) { continue }
        if ($t -match '(?im)^\s*/kit-wiki-ask(\s+|$)') { return "ask" }
        if ($t -match '(?im)^\s*/kit-wiki\s+lint(\s+|$)') { return "lint" }
        if ($t -match '(?im)^\s*/kit-wiki(\s+|$)') { return "ingest" }
    }
    # Skill picked from the slash menu (no literal prefix): default to ingest+lint.
    if (Test-AttachedSkillName -Prompt $Prompt -SkillName "kit-wiki") { return "ingest" }
    return ""
}

try {
    $payload = Read-HookStdinJson
    if ($null -eq $payload) { exit 0 }

    $prompt = Get-PromptText -Payload $payload
    if ([string]::IsNullOrWhiteSpace($prompt)) { exit 0 }

    $mode = Get-KitWikiMode -Prompt $prompt
    if ([string]::IsNullOrWhiteSpace($mode)) { exit 0 }

    $wikiDir = Join-Path $projectRoot "docs\wiki"

    if ($mode -eq "ask") {
        $ctx = "kit-wiki ask (read-only): docs/wiki/index.md(MOC)를 먼저 읽어 후보를 좁힌 뒤 docs/wiki/ 기준으로 답하고 출처 노트 경로를 인용한다. review: pending 노트는 「검토 전 — 사실 확인 필요」를 함께 표시. 파일을 수정하지 않는다. 없으면 '위키에 없음'을 명확히 한다. 절차: .cursor/skills/kit-wiki/SKILL.md ask."
        $msg = "kit-wiki-ask: docs/wiki/ 읽기 전용 질의 (index 우선, 파일 미수정)."
        Write-HookJson -Object @{
            continue           = $true
            user_message       = $msg
            additional_context = $ctx
        }
        exit 0
    }

    # ingest / lint: ensure folders exist (bootstrap)
    foreach ($sub in @("", "_raw", "_templates")) {
        $p = if ($sub) { Join-Path $wikiDir $sub } else { $wikiDir }
        if (-not (Test-Path -LiteralPath $p)) {
            New-Item -ItemType Directory -Path $p -Force | Out-Null
        }
    }

    # seed index.md (MOC) with fixed-category skeleton if missing
    $indexPath = Join-Path $wikiDir "index.md"
    if (-not (Test-Path -LiteralPath $indexPath)) {
        $stamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        $indexSeed = @"
---
type: wiki-index
project: cursor-workspace-kit
updated_at: $stamp
tags: [wiki, index, moc]
---
# docs/wiki 인덱스 (MOC)

위키의 진입점(목차)이다. ask는 이 파일을 먼저 읽어 후보를 좁히고, ingest는 새 노트를 알맞은 카테고리에 등록한다.

## 설계·결정
- (해당 노트가 생기면 여기에 등록)

## 운영·워크플로우
- (해당 노트가 생기면 여기에 등록)

## 리서치
- (해당 노트가 생기면 여기에 등록)

## Q&A
- (해당 노트가 생기면 여기에 등록)

## 미분류
- (분류 전 임시 등록)
"@
        if (Get-Command Write-KitUtf8File -ErrorAction SilentlyContinue) {
            Write-KitUtf8File -Path $indexPath -Content $indexSeed
        }
    }

    if ($mode -eq "lint") {
        $ctx = "kit-wiki lint (full): docs/wiki/ 전체의 깨진 [[링크]]·frontmatter·모순·index 미등록 노트·review: pending 목록을 점검한다. pending인데 ## 검토 필요 없으면 추가 제안. redaction은 docs/wiki/README.md 정규식 패턴표로 스캔: 이메일/sk-/AKIA/Bearer/자격증명/절대경로는 자동 마스킹, 카드·주민번호·긴 hex는 경고 후 사용자 확인. 모순/폐기는 제안 후 확인. 절차: .cursor/skills/kit-wiki/SKILL.md lint."
        $msg = "kit-wiki lint: docs/wiki/ 전체 정합성 점검(정규식 redaction 스캔 포함)."
    }
    else {
        $ctx = "kit-wiki ingest + 증분 lint: 입력을 docs/wiki/<topic>.md로 정제 저장(요약 + 결정(배경/대안/근거) + 출처), 템플릿 docs/wiki/_templates/wiki-note-template.md 사용, 같은 주제는 갱신. review: pending|done 판정(README review 절), pending이면 ## 검토 필요 bullet 작성. 새 노트는 docs/wiki/index.md(MOC) 알맞은 카테고리에 [[slug]] 한 줄 등록(기존 노트 갱신은 index 유지). redaction 필수(경로/이메일/키 마스킹), 민감 원문은 docs/wiki/_raw/(gitignore)에만. 저장 후 만진/연결 노트 증분 lint. 보고에 review 상태·검토 필요 항목 포함. 커밋은 사용자 명시 시에만. 절차: .cursor/skills/kit-wiki/SKILL.md ingest."
        $msg = "kit-wiki: docs/wiki/에 정제 저장(ingest) + review + index 등록 + 증분 lint. _raw/는 gitignore."
    }

    Write-HookJson -Object @{
        continue           = $true
        user_message       = $msg
        additional_context = $ctx
    }
    exit 0
}
catch {
    # fail-open: never block the prompt on wiki hook errors
    Write-HookJson -Object @{ continue = $true }
    exit 0
}
