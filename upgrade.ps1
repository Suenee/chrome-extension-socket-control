param(
  [Parameter(Mandatory=$true)][string]$RepositoryPath,
  [Parameter(Mandatory=$true)][string]$ActivePath
)
$ErrorActionPreference = 'Stop'
$UpdaterRevision = '2'
$Branch = 'main'
$RepoUrl = 'https://github.com/Suenee/chrome-extension-socket-control.git'
$Phase = 'SELF-UPDATE'
$Warnings = @()
$RepositoryPath = $RepositoryPath.TrimEnd('\')
$logDir = Join-Path $RepositoryPath 'logs'
$logFile = Join-Path $logDir 'upgrade.log'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Set-Content -LiteralPath $logFile -Value '' -Encoding UTF8

function Write-Log([string]$Message,[string]$Level='INFO') {
  $line = ('{0:dd.MM.yyyy HH:mm:ss.fff} [{1}] [{2}] {3}' -f (Get-Date),$Level,$script:Phase,$Message)
  Add-Content -LiteralPath $script:logFile -Value $line -Encoding UTF8
  if($Level -eq 'ERROR'){ Write-Host $line -ForegroundColor Red }
  elseif($Level -eq 'WARN'){ Write-Host $line -ForegroundColor Yellow }
  else { Write-Host $line }
}
function Git([string[]]$ArgumentList,[switch]$AllowFailure) {
  Write-Log ('git ' + ($ArgumentList -join ' '))
  $output = & git.exe @ArgumentList 2>&1
  $code = $LASTEXITCODE
  foreach($line in $output){ Write-Log ([string]$line) 'GIT' }
  if($code -ne 0 -and -not $AllowFailure){ throw "git failed with exit code $code" }
  return @{ Code=$code; Output=@($output) }
}
function Fail([string]$Message) {
  Write-Log $Message 'ERROR'
  Write-Log ("STATUS: FAILED - phase=" + $script:Phase) 'ERROR'
  exit 1
}

try {
  Write-Log "Chrome Extension Socket Control updater revision $UpdaterRevision"
  Write-Log "Repository source path: $RepositoryPath"
  Write-Log "Active path: $ActivePath"
  Write-Log "Target branch: $Branch"
  Write-Log ("PowerShell: " + $PSVersionTable.PSVersion)
  Write-Log ("Git: " + ((& git.exe --version) -join ' '))

  $script:Phase='REPOSITORY'
  Set-Location -LiteralPath $RepositoryPath
  Git @('remote','set-url','origin',$RepoUrl) | Out-Null
  Git @('fetch','origin',$Branch) | Out-Null
  $start = (Git @('rev-parse','HEAD') -AllowFailure).Output | Select-Object -First 1
  Write-Log "Starting commit: $start"

  $dirty = (Git @('status','--porcelain','--untracked-files=no')).Output | Where-Object {
    $_ -and ($_ -notmatch '^.. upgrade\.cmd$') -and ($_ -notmatch '^.. upgrade\.ps1$')
  }
  if($dirty){
    Write-Log 'Tracked local changes detected:' 'ERROR'
    foreach($d in $dirty){ Write-Log ([string]$d) 'ERROR' }
    Fail 'Commit or revert tracked local changes before upgrade.'
  }

  Git @('checkout','-B',$Branch,("origin/"+$Branch)) | Out-Null
  Git @('reset','--hard',("origin/"+$Branch)) | Out-Null
  $head=((Git @('rev-parse','HEAD')).Output | Select-Object -First 1)
  $remote=((Git @('rev-parse',("origin/"+$Branch))).Output | Select-Object -First 1)
  if($head -ne $remote){ Fail "HEAD does not match origin/$Branch." }
  Write-Log "Synchronized commit: $head"

  $script:Phase='CLEAN'
  foreach($path in @('.tmp','dist')){
    $full=Join-Path $RepositoryPath $path
    if(Test-Path -LiteralPath $full){ Write-Log "Removing generated path: $path"; Remove-Item -LiteralPath $full -Recurse -Force }
  }

  $script:Phase='VERIFY'
  foreach($required in @('manifest.json','src\background.js','src\browser.js','src\vpp.js','popup\popup.html','manifest\chrome_socket_control.json','PROTOCOL.md','CHANGELOG.md')){
    if(-not (Test-Path -LiteralPath (Join-Path $RepositoryPath $required))){ Fail "Required file missing: $required" }
  }
  $chromeManifest = Get-Content -LiteralPath (Join-Path $RepositoryPath 'manifest.json') -Raw | ConvertFrom-Json
  if($chromeManifest.version -ne '0.10'){ Fail "Unexpected extension version: $($chromeManifest.version)" }
  Get-Content -LiteralPath (Join-Path $RepositoryPath 'manifest\chrome_socket_control.json') -Raw | ConvertFrom-Json | Out-Null
  Write-Log 'JSON manifests parsed successfully.'

  $script:Phase='COMPLETE'
  Write-Log "Extension version: $($chromeManifest.version)"
  Write-Log "Local repository is ready. Reload the unpacked extension in Chrome/Brave if it was already loaded."
  if($Warnings.Count){
    Write-Log 'STATUS: WARNING - phase=COMPLETE' 'WARN'
  } else {
    Write-Log 'STATUS: SUCCESS - phase=COMPLETE'
  }
  exit 0
}
catch {
  try { Write-Log $_.Exception.Message 'ERROR'; Write-Log ("STATUS: FAILED - phase=" + $script:Phase) 'ERROR' } catch {}
  exit 1
}
