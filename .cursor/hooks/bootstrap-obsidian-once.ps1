#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Directory {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

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
        Add-Content -LiteralPath $logPath -Value "[$ts] bootstrap-obsidian-once: $Message" -Encoding ASCII
    }
    catch {
        # Logging must remain fail-open.
    }
}

# Locate Obsidian-HookInstall.ps1 (product-local first, then kit submodule). The caller
# must dot-source the returned path at SCRIPT scope so the module functions are visible
# to the functions below (dot-sourcing inside a function loads them into that function's
# scope only).
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

function Invoke-ObsidianHookReconcile {
    param([string]$ProjectRoot)

    if (-not (Import-ObsidianHookInstallModule -ProjectRoot $ProjectRoot)) {
        return
    }

    $result = Invoke-ObsidianPostCommitInstall -RepoPath $ProjectRoot
    if ($result.Ok) {
        $stateDir = Join-Path $ProjectRoot ".cursor\state"
        Ensure-Directory -Path $stateDir
        $stamp = (Get-Date).ToString("s")
        Set-Content -LiteralPath (Join-Path $stateDir "obsidian-post-commit.ok") -Value "verified_at=$stamp" -Encoding ASCII
        return
    }

    if (-not $result.Skipped) {
        Write-HookWarning -ProjectRoot $ProjectRoot -Message $result.Reason
    }
}

function Resolve-ObsidianSyncScript {
    param([string]$ProjectRoot)

    $local = Join-Path $ProjectRoot "scripts\obsidian\sync-docs.ps1"
    if (Test-Path -LiteralPath $local) { return $local }

    if (Import-ObsidianHookInstallModule -ProjectRoot $ProjectRoot) {
        $kitRoot = Resolve-ObsidianKitRoot -RepoPath $ProjectRoot
        $fromKit = Resolve-ObsidianScriptPath -RepoPath $ProjectRoot -FileName "sync-docs.ps1" -KitRoot $kitRoot
        if ($fromKit) { return $fromKit }
    }

    return $null
}

try {
    $projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
    $stateDir = Join-Path $projectRoot ".cursor\state"
    $stateFile = Join-Path $stateDir "obsidian-bootstrap.done"
    $ingestConfigPath = Join-Path $projectRoot ".obsidian-ingest.json"

    # Dot-source the hook-install module at script scope so the helper functions below
    # (which call Import-ObsidianHookInstallModule / Invoke-ObsidianPostCommitInstall) resolve.
    $modulePath = Resolve-ObsidianHookInstallModulePath -ProjectRoot $projectRoot
    if ($modulePath) { . $modulePath }

    # Every session: reconcile post-commit (journal-off by default) without waiting for file edit or /kit-start.
    Invoke-ObsidianHookReconcile -ProjectRoot $projectRoot

    if (Test-Path -LiteralPath $stateFile) {
        if (-not (Test-Path -LiteralPath $ingestConfigPath)) {
            $syncScript = Resolve-ObsidianSyncScript -ProjectRoot $projectRoot
            if ($syncScript) {
                powershell -NoProfile -ExecutionPolicy Bypass -File $syncScript | Out-Null
            }
        }
        exit 0
    }

    Ensure-Directory -Path $stateDir

    $syncScript = Resolve-ObsidianSyncScript -ProjectRoot $projectRoot
    if ($syncScript) {
        powershell -NoProfile -ExecutionPolicy Bypass -File $syncScript | Out-Null
    }

    Invoke-ObsidianHookReconcile -ProjectRoot $projectRoot

    $timestamp = (Get-Date).ToString("s")
    Set-Content -LiteralPath $stateFile -Value "bootstrapped_at=$timestamp" -Encoding ASCII
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
