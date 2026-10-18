param([string]$PythonExecutable = 'python')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$env:PYTHONPATH = "$projectRoot\.runtime-python;$projectRoot\backend"
$logFolder = Join-Path $projectRoot 'output\backend'
New-Item -ItemType Directory -Force -Path $logFolder | Out-Null
foreach ($service in @(@{ Port=8000; Module='main' }, @{ Port=8001; Module='service_api' })) {
    $port = $service.Port
    $occupied = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($occupied) { Write-Host "Port $port already has a running service; keeping it."; continue }
    Start-Process -FilePath $PythonExecutable -WindowStyle Hidden -WorkingDirectory $projectRoot -ArgumentList @('-m','uvicorn',"$($service.Module):app",'--app-dir','backend','--host','127.0.0.1','--port',"$port") -RedirectStandardOutput "$logFolder\$port.out.log" -RedirectStandardError "$logFolder\$port.err.log" | Out-Null
    Write-Host "Starting API on http://127.0.0.1:$port/docs (model readiness: /health)."
}
