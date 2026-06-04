#!/usr/bin/env pwsh
# afterShellExecution / afterAgentResponse / stop: track and cleanup agent-started dev servers
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
$ds = $null

try {
    $harness = Get-KitHarnessConfig -WorkspaceRoot $projectRoot
    $ds = $harness.DevServerCleanup
    $mode = $ds["Mode"]
    if (-not $harness.ParseOk -or $mode -eq "off") { exit 0 }

    $stdin = Read-HookStdinJson
    if ($null -eq $stdin) { exit 0 }

    $eventName = ""
    if (Test-JsonPropertyPresent -Object $stdin -Name "hook_event_name") {
        $eventName = [string]$stdin.hook_event_name
    }

    switch ($eventName) {
        "afterShellExecution" {
            Register-DevServerFromShellHook -ProjectRoot $projectRoot -DevServerConfig $ds -HookInput $stdin
        }
        "afterAgentResponse" {
            $text = ""
            if (Test-JsonPropertyPresent -Object $stdin -Name "text") {
                $text = [string]$stdin.text
            }
            $convId = Get-HookConversationId -HookInput $stdin
            if ($text -and $convId) {
                Add-DevServerKeepFromAgentText -ProjectRoot $projectRoot -DevServerConfig $ds -ConversationId $convId -Text $text | Out-Null
            }
        }
        "stop" {
            $convId = Get-HookConversationId -HookInput $stdin
            Invoke-DevServerCleanup -ProjectRoot $projectRoot -DevServerConfig $ds -Mode $mode -ConversationId $convId | Out-Null
        }
        default { }
    }
    exit 0
}
catch {
    $logPath = ".cursor/state/dev-server-cleanup.log"
    if ($null -ne $ds -and $ds.LogPath) { $logPath = $ds.LogPath }
    Write-HarnessLog -ProjectRoot $projectRoot -RelativeLogPath $logPath -Message ("dev-server-harness error: " + (Get-HookErrorText -ErrorRecord $_))
    exit 0
}
