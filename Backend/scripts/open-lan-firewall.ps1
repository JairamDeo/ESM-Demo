# Run PowerShell as Administrator from Backend folder:
#   .\scripts\open-lan-firewall.ps1
# Opens inbound TCP for Vite (5173) and API (5050).

$ports = @(5173, 5050)
foreach ($port in $ports) {
  $name = "Vitric ESM TCP $port"
  $existing = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Rule already exists: $name"
    continue
  }
  try {
    New-NetFirewallRule -DisplayName $name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -ErrorAction Stop | Out-Null
    Write-Host "Added firewall rule: $name"
  } catch {
    Write-Host "FAILED ($name): run this script in PowerShell as Administrator." -ForegroundColor Red
    exit 1
  }
}
Write-Host "Done. Teammates can test: http://<your-ip>:5173 and http://<your-ip>:5050/health"
