#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$cooldownSeconds = 15

function Get-AllStringValues {
    param([object]$Node)

    $values = New-Object System.Collections.Generic.List[string]
    if ($null -eq $Node) {
        return $values
    }

    if ($Node -is [string]) {
        $values.Add($Node)
        return $values
    }

    if ($Node -is [System.Collections.IDictionary]) {
        foreach ($key in $Node.Keys) {
            foreach ($item in (Get-AllStringValues -Node $Node[$key])) {
                $values.Add($item)
            }
        }
        return $values
    }

    if ($Node -is [System.Collections.IEnumerable] -and -not ($Node -is [string])) {
        foreach ($entry in $Node) {
            foreach ($item in (Get-AllStringValues -Node $entry)) {
                $values.Add($item)
            }
        }
        return $values
    }

    foreach ($prop in $Node.PSObject.Properties) {
        foreach ($item in (Get-AllStringValues -Node $prop.Value)) {
            $values.Add($item)
        }
    }

    return $values
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
        Add-Content -LiteralPath $logPath -Value "[$ts] sync-docs-on-doc-change: $Message" -Encoding ASCII
    }
    catch {
        # Logging must never block editing flow.
    }
}

function Read-HookStdinUtf8 {
    # Cursor sends UTF-8 (possibly BOM-prefixed) stdin; default console decoding is CP949.
    $reader = New-Object System.IO.StreamReader(
        [Console]::OpenStandardInput(), (New-Object System.Text.UTF8Encoding $false), $true)
    try { $raw = $reader.ReadToEnd() } finally { $reader.Dispose() }
    if ($null -eq $raw) { return "" }
    return $raw.Trim([char]0xFEFF, [char]0x200B, ' ', "`t", "`r", "`n")
}

try {
    $raw = Read-HookStdinUtf8
    if ([string]::IsNullOrWhiteSpace($raw)) {
        exit 0
    }

    $payload = $raw | ConvertFrom-Json
    $allStrings = Get-AllStringValues -Node $payload
    $normalized = $allStrings | ForEach-Object { $_.ToLowerInvariant().Replace("/", "\") }

    $hasDocChange = $false
    foreach ($value in $normalized) {
        if ($value -match "(^|\\)docs(\\|$)" -or $value -match "\.md$") {
            $hasDocChange = $true
            break
        }
    }

    if (-not $hasDocChange) {
        exit 0
    }

    # Use script location, not Get-Location: hook cwd may differ from project root.
    $projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
    $syncScript = Join-Path $projectRoot "scripts\obsidian\sync-docs.ps1"
    if (-not (Test-Path -LiteralPath $syncScript)) {
        exit 0
    }

    $stateDir = Join-Path $projectRoot ".cursor\state"
    $cooldownMarker = Join-Path $stateDir "obsidian-sync-docs.last-run"
    if (Test-Path -LiteralPath $cooldownMarker) {
        try {
            $lastRunRaw = (Get-Content -LiteralPath $cooldownMarker -Raw -Encoding UTF8).Trim()
            if (-not [string]::IsNullOrWhiteSpace($lastRunRaw)) {
                $lastRun = [datetime]::Parse($lastRunRaw)
                $elapsed = (Get-Date) - $lastRun
                if ($elapsed.TotalSeconds -lt $cooldownSeconds) {
                    exit 0
                }
            }
        }
        catch {
            Write-HookWarning -ProjectRoot $projectRoot -Message "Failed to parse cooldown marker: $cooldownMarker"
        }
    }

    powershell -NoProfile -ExecutionPolicy Bypass -File $syncScript | Out-Null
    if (-not (Test-Path -LiteralPath $stateDir)) {
        New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
    }
    Set-Content -LiteralPath $cooldownMarker -Value ((Get-Date).ToString("o")) -Encoding ASCII
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
    # Hook failures should never block normal editing.
    exit 0
}
