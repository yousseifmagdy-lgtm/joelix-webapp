param(
  [Parameter(Mandatory = $true)][string]$NodePath,
  [Parameter(Mandatory = $true)][string]$ProjectRoot,
  [switch]$NoOpen
)

$ErrorActionPreference = "Stop"
$healthUrl = "http://127.0.0.1:3000/health"
$siteUrl = "http://localhost:3000"
$ProjectRoot = [IO.Path]::GetFullPath($ProjectRoot)
$workRoot = Join-Path $ProjectRoot "work"
$startupLog = Join-Path $workRoot "joelix-startup.log"

New-Item -ItemType Directory -Path $workRoot -Force | Out-Null

function Write-StartupLog([string]$Message) {
  Add-Content -LiteralPath $startupLog -Value "[$([DateTime]::UtcNow.ToString('o'))] $Message" -Encoding UTF8
}

function Test-JoelixHealth {
  & curl.exe --silent --fail --max-time 2 --output NUL $healthUrl
  return $LASTEXITCODE -eq 0
}

function Install-JoelixAutoStart {
  try {
    $runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
    $command = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $PSCommandPath + '" -NodePath "' + $NodePath + '" -ProjectRoot "' + $ProjectRoot + '" -NoOpen'
    New-ItemProperty -Path $runKey -Name "JoelixVideoGame" -Value $command -PropertyType String -Force | Out-Null
    Write-StartupLog "Windows sign-in auto-start installed for the current user."
  } catch {
    Write-StartupLog "Could not install Windows sign-in auto-start: $($_.Exception.Message)"
  }
}

Install-JoelixAutoStart

if (Test-JoelixHealth) {
  Write-StartupLog "Joelix was already healthy. Opening the site."
  if (-not $NoOpen) { Start-Process $siteUrl }
  exit 0
}

$nextCli = Join-Path $ProjectRoot "node_modules\next\dist\bin\next"
if (-not (Test-Path -LiteralPath $nextCli)) {
  Write-Error "Joelix dependencies are missing. Run npm install, then try again."
  exit 1
}

$watcher = Join-Path $ProjectRoot "scripts\keep-joelix-running.mjs"
$watcherArgument = '"' + $watcher + '"'
Write-StartupLog "Starting the background watcher."
Start-Process -FilePath $NodePath -ArgumentList $watcherArgument -WorkingDirectory $ProjectRoot -WindowStyle Hidden

for ($attempt = 0; $attempt -lt 80; $attempt++) {
  if (Test-JoelixHealth) {
    Write-StartupLog "Joelix is healthy on port 3000."
    if (-not $NoOpen) { Start-Process $siteUrl }
    exit 0
  }
  Start-Sleep -Milliseconds 500
}

Write-StartupLog "Joelix did not become healthy within 40 seconds."
Write-Error "Joelix did not become ready. See work\joelix-service-error.log"
exit 1
