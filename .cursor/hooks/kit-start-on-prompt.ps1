# beforeSubmitPrompt: /start-setting (onboard) | /start | /kit-start (pull + sync)
# Windows PowerShell 5.1 + UTF-8 stdout for Cursor
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
if (-not $commonPath) {
    [Console]::Out.WriteLine('{"continue":false,"user_message":"Kit-HookCommon.ps1 not found. Run: powershell -File vendor/cursor-workspace-kit/scripts/Invoke-KitStartSetting.ps1 -WorkspaceRoot ."}')
    exit 2
}
. $commonPath
Initialize-KitHookConsole

function Get-AllStringValues {
    param([object]$Node)

    $values = New-Object System.Collections.Generic.List[string]
    if ($null -eq $Node) { return $values }
    if ($Node -is [string]) {
        $values.Add($Node)
        return $values
    }
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
    if ($Payload.PSObject.Properties.Name -contains "prompt") {
        return [string]$Payload.prompt
    }
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
    param(
        [string]$Prompt,
        [string]$SkillName
    )
    if ([string]::IsNullOrWhiteSpace($Prompt)) { return $false }
    $escaped = [regex]::Escape($SkillName)
    return ($Prompt -match "(?is)<manually_attached_skills>.*?Skill\s+Name:\s*$escaped\b")
}

function Test-StartSettingPromptIntent {
    param([string]$Prompt)
    if ([string]::IsNullOrWhiteSpace($Prompt)) { return $false }
    if ($Prompt -match '^\s*/(?:kit-)?start-setting(\s+|$)') { return $true }
    if (Test-AttachedSkillName -Prompt $Prompt -SkillName "start-setting") { return $true }
    $userQuery = Get-UserQueryText -Prompt $Prompt
    if ($userQuery -match '^\s*/(?:kit-)?start-setting(\s+|$)') { return $true }
    return $false
}

function Test-KitStartPromptIntent {
    param([string]$Prompt)
    if ([string]::IsNullOrWhiteSpace($Prompt)) { return $false }
    if ($Prompt -match '^\s*/kit-start(\s+|$)') { return $true }
    if (Test-AttachedSkillName -Prompt $Prompt -SkillName "kit-start") { return $true }
    $userQuery = Get-UserQueryText -Prompt $Prompt
    if ($userQuery -match '^\s*/kit-start(\s+|$)') { return $true }
    return $false
}

function Test-StartPromptIntent {
    param([string]$Prompt)
    if ([string]::IsNullOrWhiteSpace($Prompt)) { return $false }
    if ($Prompt -match '^\s*/start(\s+|$)') {
        return ($Prompt -notmatch '^\s*/start-(?:setting|feature)\b')
    }
    if (Test-AttachedSkillName -Prompt $Prompt -SkillName "kit-start") { return $false }
    $userQuery = Get-UserQueryText -Prompt $Prompt
    if ($userQuery -match '^\s*/start(\s+|$)') {
        return ($userQuery -notmatch '^\s*/start-(?:setting|feature)\b')
    }
    return $false
}

function Read-StateMessage {
    param([string]$StatePath, [string]$Fallback)
    if (-not (Test-Path -LiteralPath $StatePath)) { return $Fallback }
    try {
        $state = Get-Content -LiteralPath $StatePath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($state.message) { return [string]$state.message }
    }
    catch { }
    return $Fallback
}

function Resolve-KitScriptsRoot {
    param([string]$Root)
    if (Test-Path -LiteralPath (Join-Path $Root "scripts\Invoke-KitStart.ps1")) {
        return $Root
    }
    $kitPath = "vendor/cursor-workspace-kit"
    $configPath = Join-Path $Root ".cursor-kit.json"
    if (Test-Path -LiteralPath $configPath) {
        try {
            $cfg = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($cfg.kitPath) { $kitPath = [string]$cfg.kitPath }
        }
        catch { }
    }
    $vendorRoot = Join-Path $Root $kitPath
    if (Test-Path -LiteralPath (Join-Path $vendorRoot "scripts\Invoke-KitStart.ps1")) {
        return $vendorRoot
    }
    return $null
}

function Invoke-KitScript {
    param(
        [string]$ScriptName,
        [string]$Root
    )
    $kitRoot = Resolve-KitScriptsRoot -Root $Root
    if ($null -eq $kitRoot) {
        return @{ ok = $false; message = "Kit scripts not found. Use /start-setting after git init, or run Invoke-KitStartSetting.ps1 once." }
    }
    $scriptPath = Join-Path $kitRoot "scripts\$ScriptName"
    if (-not (Test-Path -LiteralPath $scriptPath)) {
        return @{ ok = $false; message = "Missing: $scriptPath" }
    }
    $bootstrap = ""
    if ($kitRoot -ne $Root -and (Test-Path -LiteralPath (Join-Path $Root "scripts\Invoke-KitStartSetting.ps1"))) {
        $bootstrap = $Root
    }
    if ($ScriptName -eq "Invoke-KitStartSetting.ps1") {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath -WorkspaceRoot $Root
    }
    else {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath -WorkspaceRoot $Root
    }
    if ($LASTEXITCODE -ne 0) {
        return @{ ok = $false; message = "$ScriptName failed (exit $LASTEXITCODE)" }
    }
    return @{ ok = $true }
}

try {
    $payload = Read-HookStdinJson
    if ($null -eq $payload) { exit 0 }

    $prompt = Get-PromptText -Payload $payload
    if ([string]::IsNullOrWhiteSpace($prompt)) { exit 0 }

    $isSetting = Test-StartSettingPromptIntent -Prompt $prompt
    $isKitStart = Test-KitStartPromptIntent -Prompt $prompt
    $isStart = (-not $isSetting) -and (-not $isKitStart) -and (Test-StartPromptIntent -Prompt $prompt)
    if (-not $isSetting -and -not $isStart -and -not $isKitStart) { exit 0 }

    if ($isSetting) {
        $kitRoot = Resolve-KitScriptsRoot -Root $projectRoot
        $settingScript = $null
        if ($null -ne $kitRoot) {
            $settingScript = Join-Path $kitRoot "scripts\Invoke-KitStartSetting.ps1"
        }
        if (-not $settingScript -or -not (Test-Path -LiteralPath $settingScript)) {
            $inline = Join-Path $projectRoot "vendor\cursor-workspace-kit\scripts\Invoke-KitStartSetting.ps1"
            if (Test-Path -LiteralPath $inline) { $settingScript = $inline }
        }
        if (-not $settingScript -or -not (Test-Path -LiteralPath $settingScript)) {
            Push-Location $projectRoot
            try {
                if (-not (Test-Path -LiteralPath "vendor\cursor-workspace-kit\scripts\Invoke-KitStartSetting.ps1")) {
                    if (-not (Test-Path -LiteralPath ".git")) {
                        throw "Git repo required for /start-setting. Run git init, then retry."
                    }
                    if (Test-Path -LiteralPath ".gitmodules") {
                        & git submodule update --init vendor/cursor-workspace-kit 2>&1 | Out-Null
                    }
                    if (-not (Test-Path -LiteralPath "vendor\cursor-workspace-kit")) {
                        & git submodule add https://github.com/Hyun-Kim95/cursor-workspace-kit.git vendor/cursor-workspace-kit 2>&1 | Out-Null
                    }
                }
            }
            finally { Pop-Location }
            $settingScript = Join-Path $projectRoot "vendor\cursor-workspace-kit\scripts\Invoke-KitStartSetting.ps1"
        }
        if (-not (Test-Path -LiteralPath $settingScript)) {
            Write-HookJson -Object @{
                continue     = $false
                user_message = "Cannot run /start-setting: kit not found. From kit clone run: powershell -File scripts/Invoke-KitStartSetting.ps1 -WorkspaceRoot <product-path>"
            }
            exit 2
        }
        & powershell -NoProfile -ExecutionPolicy Bypass -File $settingScript -WorkspaceRoot $projectRoot
        if ($LASTEXITCODE -ne 0) {
            $msg = Read-StateMessage -StatePath (Join-Path $projectRoot ".cursor\state\kit-start-setting-last.json") -Fallback "start-setting failed"
            Write-HookJson -Object @{ continue = $false; user_message = $msg }
            exit 2
        }
        $msg = Read-StateMessage -StatePath (Join-Path $projectRoot ".cursor\state\kit-start-setting-last.json") -Fallback "Kit start-setting OK. Use /start <task> next."
        Write-HookJson -Object @{ continue = $true; user_message = $msg }
        exit 0
    }

    $result = Invoke-KitScript -ScriptName "Invoke-KitStart.ps1" -Root $projectRoot
    if (-not $result.ok) {
        $msg = Read-StateMessage -StatePath (Join-Path $projectRoot ".cursor\state\kit-start-last.json") -Fallback $result.message
        Write-HookJson -Object @{ continue = $false; user_message = $msg }
        exit 2
    }

    $msg = Read-StateMessage -StatePath (Join-Path $projectRoot ".cursor\state\kit-start-last.json") -Fallback "Kit start OK."
    Write-HookJson -Object @{ continue = $true; user_message = $msg }
    exit 0
}
catch {
    Write-HookJson -Object @{
        continue     = $false
        user_message = "Kit start hook error: $(Get-HookErrorText -ErrorRecord $_)"
    }
    exit 2
}
