#!/usr/bin/env pwsh
# afterAgentResponse: short lint/tsc per .cursor/quality-gate.json when harness.qualityGate is on
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$hookRoot = $PSScriptRoot
$projectRoot = (Resolve-Path (Join-Path $hookRoot "..\..")).Path
$commonPath = Join-Path $projectRoot "scripts\Kit-HookCommon.ps1"
if (-not (Test-Path -LiteralPath $commonPath)) {
    $commonPath = Join-Path $projectRoot "vendor\cursor-workspace-kit\scripts\Kit-HookCommon.ps1"
}
if (-not (Test-Path -LiteralPath $commonPath)) { exit 0 }
. $commonPath
Initialize-KitHookConsole
$projectRoot = Resolve-HookProjectRoot -HookScriptRoot $hookRoot

try {
    $harness = Get-KitHarnessConfig -WorkspaceRoot $projectRoot
    $qgMode = $harness.QualityGate["Mode"]
    if ($qgMode -eq "off") { exit 0 }

    $qgConfig = Get-QualityGateFileConfig -ProjectRoot $projectRoot -RelativeConfigPath $harness.QualityGate["ConfigFile"]
    if ($null -eq $qgConfig) { exit 0 }
    if ((Test-JsonPropertyPresent -Object $qgConfig -Name "enabled") -and ($qgConfig.enabled -eq $false)) { exit 0 }

    $onlyWhen = $null
    if (Test-JsonPropertyPresent -Object $qgConfig -Name "onlyWhen") {
        $onlyWhen = $qgConfig.onlyWhen
    }
    if (-not (Test-QualityGateOnlyWhen -ProjectRoot $projectRoot -OnlyWhen $onlyWhen)) {
        exit 0
    }

    $results = New-Object System.Collections.ArrayList
    $allOk = $true

    if (Test-JsonPropertyPresent -Object $qgConfig -Name "commands") {
        foreach ($cmdDef in @($qgConfig.commands)) {
            $id = if (Test-JsonPropertyPresent -Object $cmdDef -Name "id") { [string]$cmdDef.id } else { "cmd" }
            $shell = if (Test-JsonPropertyPresent -Object $cmdDef -Name "shell") { [string]$cmdDef.shell } else { "" }
            $maxSec = 18
            if (Test-JsonPropertyPresent -Object $cmdDef -Name "maxSeconds") { $maxSec = [int]$cmdDef.maxSeconds }

            if ([string]::IsNullOrWhiteSpace($shell)) {
                [void]$results.Add(@{ id = $id; exitCode = 0; summary = "skipped (empty shell)" })
                continue
            }

            $run = Invoke-QualityGateCommand -ProjectRoot $projectRoot -ShellCommand $shell -MaxSeconds $maxSec
            $ok = ($run.ExitCode -eq 0)
            $required = $false
            if (Test-JsonPropertyPresent -Object $cmdDef -Name "required") { $required = ($cmdDef.required -eq $true) }
            if (-not $ok -and $required) { $allOk = $false }
            if (-not $ok) { $allOk = $false }

            [void]$results.Add(@{
                id       = $id
                exitCode = $run.ExitCode
                summary  = $run.Summary
            })
        }
    }

    $statePath = Join-Path $projectRoot ($harness.QualityGate["StateFile"] -replace '/', '\')
    $stateDir = Split-Path -Parent $statePath
    if (-not (Test-Path -LiteralPath $stateDir)) {
        New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
    }

    $stateObj = @{
        at      = (Get-Date).ToString("o")
        ok      = $allOk
        results = @($results.ToArray())
    }
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($statePath, ($stateObj | ConvertTo-Json -Depth 5), $utf8NoBom)

    if (-not $allOk) {
        $onFailure = "warn"
        if (Test-JsonPropertyPresent -Object $qgConfig -Name "onFailure") {
            $onFailure = [string]$qgConfig.onFailure
        }
        [Console]::Error.WriteLine("[quality-gate] lint/tsc check failed. See $($harness.QualityGate['StateFile'])")
        [Console]::Error.WriteLine("[quality-gate] Run verify-change or Invoke-DeliveryLoop.ps1 for full test loop.")

        if ($onFailure -eq "block" -and $qgMode -eq "block") {
            exit 1
        }
    }

    exit 0
}
catch {
    exit 0
}
