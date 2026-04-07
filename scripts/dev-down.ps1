$ErrorActionPreference = "Stop"

$ports = @(3000, 8000)

foreach ($port in $ports) {
  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($listeners) {
    foreach ($listener in $listeners) {
      try {
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
      } catch {
      }
    }
    Write-Host "Stopped process(es) on port $port"
  } else {
    Write-Host "No listener found on port $port"
  }
}

Write-Host "Ports cleaned: 3000, 8000"
