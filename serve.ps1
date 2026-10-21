<#
    Local static server for the landing page.

    Usage (from this folder):
        powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1
        powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Port 3000

    The -ExecutionPolicy Bypass flag is needed because this machine's PowerShell
    execution policy blocks unsigned .ps1 scripts by default.

    Note: VS Code does NOT use this file. The "serve: http://localhost:8080"
    task in .vscode/tasks.json runs Python directly (Ctrl+Shift+B), and the
    F5 launch configuration opens index.html with no server at all.
#>
param(
    [int]$Port = 8080
)

# --- free the port if a previous instance is still running -------------------
$ErrorActionPreference = 'SilentlyContinue'
Get-NetTCPConnection -LocalPort $Port -State Listen | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force
}
$ErrorActionPreference = 'Continue'
Start-Sleep -Milliseconds 400

# --- make sure python is available ------------------------------------------
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: 'python' was not found on PATH."
    exit 1
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Starting static server for: $root"
Write-Host "Open http://localhost:$Port in your browser. Press Ctrl+C to stop."

# Run python in the foreground so its output goes straight to the task
# terminal. -u disables output buffering so the readiness line appears at once.
python -u -m http.server $Port --bind 127.0.0.1
