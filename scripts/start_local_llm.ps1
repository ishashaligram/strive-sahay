$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$server = Join-Path $projectRoot '.runtime-models/llama-cpu/llama-server.exe'
$model = Join-Path $projectRoot '.runtime-models/qwen2.5-1.5b-instruct-q4_k_m.gguf'
if (!(Test-Path $server) -or !(Test-Path $model)) { throw 'Download the official llama.cpp Windows CPU runtime and Qwen2.5-1.5B-Instruct Q4_K_M model first; see docs/BACKEND_SERVICES.md.' }
New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot 'output/backend') | Out-Null
Start-Process -FilePath $server -WorkingDirectory $projectRoot -WindowStyle Hidden -ArgumentList @('-m','.runtime-models/qwen2.5-1.5b-instruct-q4_k_m.gguf','--host','127.0.0.1','--port','8080','-c','8192','-t','4','--parallel','1','--alias','local-business-1.5b') -RedirectStandardOutput (Join-Path $projectRoot 'output/backend/llm.out.log') -RedirectStandardError (Join-Path $projectRoot 'output/backend/llm.err.log')
Write-Host 'Local model starting at http://127.0.0.1:8080/health'
