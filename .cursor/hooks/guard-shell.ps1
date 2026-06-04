#!/usr/bin/env pwsh
# beforeShellExecution: block/warn risky shell commands per .cursor-kit.json harness.shellGuard
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$hookRoot = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($hookRoot)) {
    $hookRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$projectRoot = (Resolve-Path (Join-Path $hookRoot "..\..")).Path
$commonPath = Join-Path $projectRoot "scripts\Kit-HookCommon.ps1"
if (-not (Test-Path -LiteralPath $commonPath)) {
    $commonPath = Join-Path $projectRoot "vendor\cursor-workspace-kit\scripts\Kit-HookCommon.ps1"
}
if (-not (Test-Path -LiteralPath $commonPath)) {
    [Console]::Out.WriteLine('{"permission":"allow"}')
    exit 0
}
. $commonPath
Initialize-KitHookConsole
$projectRoot = Resolve-HookProjectRoot -HookScriptRoot $hookRoot

function Write-ShellGuardAllow {
    Write-HookJson @{ permission = "allow" }
    exit 0
}

function Write-ShellGuardDeny {
    param(
        [string]$UserMessage,
        [string]$AgentMessage
    )
    Write-HookJson @{
        permission    = "deny"
        user_message  = $UserMessage
        agent_message = $AgentMessage
    }
    exit 2
}

try {
    $harness = Get-KitHarnessConfig -WorkspaceRoot $projectRoot
    $sgMode = $harness.ShellGuard["Mode"]
    if (-not $harness.ParseOk -or $sgMode -eq "off") {
        Write-ShellGuardAllow
    }

    $stdin = Read-HookStdinJson
    $command = Get-ShellCommandFromHookInput -HookInput $stdin
    if ([string]::IsNullOrWhiteSpace($command)) {
        Write-ShellGuardAllow
    }

    $patternsFile = $harness.ShellGuard["PatternsFile"]
    $patterns = Get-ShellGuardPatterns -ProjectRoot $projectRoot -PatternsRelativePath $patternsFile
    foreach ($pattern in $patterns) {
        if (-not (Test-ShellGuardPatternMatch -Command $command -Pattern $pattern)) {
            continue
        }

        $msg = if (Test-JsonPropertyPresent -Object $pattern -Name "message") {
            [string]$pattern.message
        }
        else {
            $pid = if (Test-JsonPropertyPresent -Object $pattern -Name "id") { [string]$pattern.id } else { "unknown" }
            "BLOCKED: command matched guard pattern $pid."
        }

        if ($sgMode -eq "block") {
            Write-ShellGuardDeny -UserMessage $msg -AgentMessage $msg
        }

        if ($sgMode -eq "warn") {
            $logPath = $harness.ShellGuard["LogPath"]
            Write-HarnessLog -ProjectRoot $projectRoot -RelativeLogPath $logPath -Message "WARN [$($pattern.id)]: $command"
            Write-ShellGuardAllow
        }
    }

    Write-ShellGuardAllow
}
catch {
    Write-ShellGuardAllow
}
