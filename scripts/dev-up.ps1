$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$pythonExe = Join-Path $repoRoot ".venv\Scripts\python.exe"
$backendDir = Join-Path $repoRoot "backend"

if (-not (Test-Path $pythonExe)) {
  throw "Python environment not found at $pythonExe"
}

& (Join-Path $PSScriptRoot "dev-down.ps1")

function Wait-Endpoint {
  param(
    [Parameter(Mandatory = $true)] [string]$Url,
    [Parameter(Mandatory = $true)] [int]$Attempts
  )

  for ($i = 0; $i -lt $Attempts; $i++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        return $true
      }
    } catch {
    }

    [System.Threading.Thread]::Sleep(500)
  }

  return $false
}

Start-Process -FilePath $pythonExe -WorkingDirectory $backendDir -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000" | Out-Null
Start-Process -FilePath "cmd.exe" -WorkingDirectory $repoRoot -ArgumentList "/c", "set NEXT_PUBLIC_API_BASE=http://localhost:8000&& npm run dev -- -p 3000" | Out-Null

Write-Host "Starting backend and frontend..."

$backendReady = Wait-Endpoint -Url "http://localhost:8000/api/v1/system/status" -Attempts 180
$frontendReady = Wait-Endpoint -Url "http://localhost:3000" -Attempts 120

if (-not $backendReady) {
  throw "Backend did not become ready on http://localhost:8000/api/v1/system/status"
}

if (-not $frontendReady) {
  throw "Frontend did not become ready on http://localhost:3000"
}

Write-Host "Backend expected:  http://localhost:8000"
Write-Host "Frontend expected: http://localhost:3000"
Write-Host "Use scripts/dev-down.ps1 to stop both services."
