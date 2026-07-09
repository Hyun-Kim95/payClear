#!/usr/bin/env pwsh
# Cursor afterFileEdit: Git 저장소에 Obsidian용 post-commit이 없거나 예전 형식이면 install-hook.ps1를 한 번 맞춘다.
# stdin은 소비만 하고(파이프 대기 방지), 편집 경로와 무관하게 동작한다.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-HookWarning {
    param(
        [string]$ProjectRoot,
        [string]$Message
    )

    try {
        $stateDir = Join-Path $ProjectRoot ".cursor\state"
        if (-not (Test-Path -LiteralPath $stateDir)) {
            New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
        }
        $logPath = Join-Path $stateDir "obsidian-hook-warnings.log"
        $ts = (Get-Date).ToString("s")
        Add-Content -LiteralPath $logPath -Value "[$ts] ensure-obsidian-git-hook: $Message" -Encoding ASCII
    }
    catch {
        # Logging must remain fail-open.
    }
}

# Locate Obsidian-HookInstall.ps1 (product-local first, then kit submodule). Returns
# the path only; the caller must dot-source it at SCRIPT scope so the module functions
# are visible. (Dot-sourcing inside a function would load them into that function's
# scope only - the original cause of "Import-ObsidianHookInstallModule not recognized".)
function Resolve-ObsidianHookInstallModulePath {
    param([Parameter(Mandatory = $true)][string]$ProjectRoot)

    $local = Join-Path $ProjectRoot "scripts\obsidian\Obsidian-HookInstall.ps1"
    if (Test-Path -LiteralPath $local) { return $local }

    $kitPath = "vendor/cursor-workspace-kit"
    $configPath = Join-Path $ProjectRoot ".cursor-kit.json"
    if (Test-Path -LiteralPath $configPath) {
        try {
            $raw = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8
            if (-not [string]::IsNullOrWhiteSpace($raw)) {
                $cfg = $raw | ConvertFrom-Json
                $kp = $cfg.PSObject.Properties['kitPath']
                if ($kp -and -not [string]::IsNullOrWhiteSpace([string]$kp.Value)) {
                    $kitPath = [string]$kp.Value
                }
            }
        }
        catch {
            # fail-open: default kitPath
        }
    }

    $fromKit = Join-Path (Join-Path $ProjectRoot $kitPath) "scripts\obsidian\Obsidian-HookInstall.ps1"
    if (Test-Path -LiteralPath $fromKit) { return $fromKit }

    return $null
}

try {
    # Drain stdin (payload unused); avoid [Console]::In which decodes with CP949.
    $stdinReader = New-Object System.IO.StreamReader(
        [Console]::OpenStandardInput(), (New-Object System.Text.UTF8Encoding $false), $true)
    try { $null = $stdinReader.ReadToEnd() } finally { $stdinReader.Dispose() }

    $projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
    $gitDir = Join-Path $projectRoot ".git"
    $stateDir = Join-Path $projectRoot ".cursor\state"
    $markerFile = Join-Path $stateDir "obsidian-post-commit.ok"

    if (-not (Test-Path -LiteralPath $gitDir)) {
        exit 0
    }

    $modulePath = Resolve-ObsidianHookInstallModulePath -ProjectRoot $projectRoot
    if (-not $modulePath) {
        exit 0
    }
    # Dot-source at script scope (try/catch does not create a new scope).
    . $modulePath

    $result = Invoke-ObsidianPostCommitInstall -RepoPath $projectRoot
    if ($result.Ok) {
        if (-not (Test-Path -LiteralPath $stateDir)) {
            New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
        }
        $stamp = (Get-Date).ToString("s")
        Set-Content -LiteralPath $markerFile -Value "verified_at=$stamp" -Encoding ASCII
    }
    elseif (-not $result.Skipped) {
        Write-HookWarning -ProjectRoot $projectRoot -Message $result.Reason
    }

    exit 0
}
catch {
    try {
        $safeRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
        Write-HookWarning -ProjectRoot $safeRoot -Message $_.Exception.Message
    }
    catch {
        # no-op
    }
    exit 0
}
