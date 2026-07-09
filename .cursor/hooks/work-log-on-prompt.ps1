# beforeSubmitPrompt: /kit-work-log | /work-log | 작업 일지 — daily work log SSOT hint
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$commonPath = Join-Path $projectRoot "scripts\Kit-HookCommon.ps1"
if (-not (Test-Path -LiteralPath $commonPath)) {
    $kitPath = "vendor/cursor-workspace-kit"
    $configPath = Join-Path $projectRoot ".cursor-kit.json"
    if (Test-Path -LiteralPath $configPath) {
        try {
            $cfg = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($cfg.kitPath) { $kitPath = [string]$cfg.kitPath }
        }
        catch { }
    }
    $commonPath = Join-Path $projectRoot (Join-Path $kitPath "scripts\Kit-HookCommon.ps1")
}
if (-not (Test-Path -LiteralPath $commonPath)) { exit 0 }
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

function Resolve-WorkLogDate {
    param([string]$Prompt)

    if ($Prompt -match '(?i)\bdate\s*:\s*(\d{4}-\d{2}-\d{2})\b') {
        return $Matches[1]
    }
    if ($Prompt -match '(?i)^\s*/(?:kit-)?work-log\s+(\d{4}-\d{2}-\d{2})\b') {
        return $Matches[1]
    }
    return (Get-Date -Format "yyyy-MM-dd")
}

try {
    $payload = Read-HookStdinJson
    if ($null -eq $payload) { exit 0 }

    $prompt = Get-PromptText -Payload $payload
    if ([string]::IsNullOrWhiteSpace($prompt)) { exit 0 }

    $isWorkLog = ($prompt -match '(?im)^\s*/(?:kit-)?work-log(\s+|$)')
    $isWorkLogKo = (-not $isWorkLog) -and ($prompt -match '(?im)^\s*작업\s*일지(\s+|$)')
    if (-not $isWorkLog -and -not $isWorkLogKo) { exit 0 }

    $date = Resolve-WorkLogDate -Prompt $prompt
    $relPath = "docs/work-log/$date.md"
    $absPath = Join-Path $projectRoot ($relPath -replace '/', '\')
    $workLogDir = Join-Path $projectRoot "docs\work-log"
    if (-not (Test-Path -LiteralPath $workLogDir)) {
        New-Item -ItemType Directory -Path $workLogDir -Force | Out-Null
    }

    $mode = "create"
    if (Test-Path -LiteralPath $absPath) { $mode = "append" }

    $sessionTime = (Get-Date -Format "HH:mm")
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("kit-work-log: 대상 $relPath ($mode).")
    $lines.Add("스킬: shared/skills/kit-work-log/SKILL.md — 먼저 읽고 따른다.")
    $lines.Add("템플릿: docs/work-log/templates/daily-work-log-template.md")
    if ($mode -eq "append") {
        $lines.Add("기존 파일 있음 → 맨 아래에 ## Session $sessionTime append.")
    }
    else {
        $lines.Add("신규 파일 생성.")
    }
    $lines.Add("필수 섹션: 완료 / 방법·결정 / 남은 작업(체크리스트) / (선택) 막힌 점.")

    Write-HookJson -Object @{
        continue           = $true
        additional_context = ($lines -join " ")
    }
    exit 0
}
catch {
    Write-HookJson -Object @{
        continue = $true
    }
    exit 0
}
