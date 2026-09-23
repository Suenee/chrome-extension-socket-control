param(
  [Parameter(Mandatory=$true)][string]$RepositoryPath,
  [Parameter(Mandatory=$true)][string]$ActivePath
)

$ErrorActionPreference = 'Stop'
$UpdaterRevision = '6'
$Branch = 'main'
$RepoUrl = 'https://github.com/Suenee/chrome-extension-socket-control.git'
$Phase = 'SELF-UPDATE'
$Warnings = @()

$RepositoryPath = $RepositoryPath.TrimEnd('\')
$logDir = Join-Path $RepositoryPath 'logs'
$logFile = Join-Path $logDir 'upgrade.log'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Set-Content -LiteralPath $logFile -Value '' -Encoding UTF8

function Write-Log {
  param([string]$Message,[string]$Level='INFO')
  $line = ('{0:dd.MM.yyyy HH:mm:ss.fff} [{1}] [{2}] {3}' -f (Get-Date),$Level,$script:Phase,$Message)
  Add-Content -LiteralPath $script:logFile -Value $line -Encoding UTF8
  switch ($Level) {
    'ERROR' { Write-Host $line -ForegroundColor Red }
    'WARN'  { Write-Host $line -ForegroundColor Yellow }
    'OK'    { Write-Host $line -ForegroundColor Green }
    default { Write-Host $line }
  }
}

function Invoke-Native {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string[]]$ArgumentList,
    [switch]$AllowFailure
  )

  Write-Log (($FilePath + ' ' + ($ArgumentList -join ' ')).Trim())

  $savedPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $lines = & $FilePath @ArgumentList 2>&1
    $exitCode = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $savedPreference
  }

  foreach ($line in @($lines)) {
    if ($null -ne $line -and ([string]$line).Length -gt 0) {
      Write-Log ([string]$line) 'NATIVE'
    }
  }

  if ($exitCode -ne 0 -and -not $AllowFailure) {
    throw "$FilePath failed with exit code $exitCode"
  }

  [pscustomobject]@{
    ExitCode = $exitCode
    Output   = @($lines | ForEach-Object { [string]$_ })
  }
}

function Invoke-Git {
  param(
    [Parameter(Mandatory=$true)][string[]]$ArgumentList,
    [switch]$AllowFailure
  )

  Invoke-Native -FilePath 'git.exe' -ArgumentList $ArgumentList -AllowFailure:$AllowFailure
}

function Fail {
  param([string]$Message)
  Write-Log $Message 'ERROR'
  Write-Log ("STATUS: FAILED - phase=" + $script:Phase) 'ERROR'
  exit 1
}

try {
  Write-Log "Chrome Extension Socket Control updater revision $UpdaterRevision"
  Write-Log "Repository source path: $RepositoryPath"
  Write-Log "Active path: $ActivePath"
  Write-Log "Target branch: $Branch"

  $psv = $PSVersionTable.PSVersion.ToString()
  Write-Log "PowerShell: $psv"

  $gitVersion = Invoke-Git -ArgumentList @('--version')
  Write-Log ("Git version verified: " + (($gitVersion.Output | Select-Object -First 1)))

  $script:Phase = 'REPOSITORY'
  Set-Location -LiteralPath $RepositoryPath

  Invoke-Git -ArgumentList @('remote','set-url','origin',$RepoUrl) | Out-Null
  Invoke-Git -ArgumentList @('fetch','origin',$Branch) | Out-Null

  $startResult = Invoke-Git -ArgumentList @('rev-parse','HEAD') -AllowFailure
  $startCommit = if ($startResult.ExitCode -eq 0) { $startResult.Output | Select-Object -First 1 } else { '<unborn>' }
  Write-Log "Starting commit: $startCommit"

  $statusResult = Invoke-Git -ArgumentList @('status','--porcelain','--untracked-files=no')
  $dirty = @($statusResult.Output | Where-Object {
    $_ -and ($_ -notmatch '^.. upgrade\.cmd$') -and ($_ -notmatch '^.. upgrade\.ps1$')
  })

  if ($dirty.Count -gt 0) {
    Write-Log 'Tracked local changes detected:' 'ERROR'
    foreach ($d in $dirty) { Write-Log $d 'ERROR' }
    Fail 'Commit or revert tracked local changes before upgrade.'
  }

  # Fresh bootstrap may contain the downloaded upgrade.cmd as an untracked file.
  # It is authoritative bootstrap state, not user data, and would otherwise block checkout.
  foreach ($bootstrapFile in @('upgrade.cmd','upgrade.ps1')) {
    $bootstrapPath = Join-Path $RepositoryPath $bootstrapFile
    $trackedCheck = Invoke-Git -ArgumentList @('ls-files','--error-unmatch','--',$bootstrapFile) -AllowFailure
    if ($trackedCheck.ExitCode -ne 0 -and (Test-Path -LiteralPath $bootstrapPath)) {
      Write-Log "Removing untracked authoritative bootstrap file before checkout: $bootstrapFile"
      Remove-Item -LiteralPath $bootstrapPath -Force
    }
  }

  Invoke-Git -ArgumentList @('checkout','-B',$Branch,("origin/"+$Branch)) | Out-Null
  Invoke-Git -ArgumentList @('reset','--hard',("origin/"+$Branch)) | Out-Null

  $head = (Invoke-Git -ArgumentList @('rev-parse','HEAD')).Output | Select-Object -First 1
  $remote = (Invoke-Git -ArgumentList @('rev-parse',("origin/"+$Branch))).Output | Select-Object -First 1

  if ($head -ne $remote) {
    Fail "HEAD does not match origin/$Branch."
  }

  Write-Log "Synchronized commit: $head"

  $script:Phase = 'CLEAN'
  foreach ($path in @('.tmp','dist')) {
    $full = Join-Path $RepositoryPath $path
    if (Test-Path -LiteralPath $full) {
      Write-Log "Removing generated path: $path"
      Remove-Item -LiteralPath $full -Recurse -Force
    }
  }

  $script:Phase = 'VERIFY'
  foreach ($required in @(
    'manifest.json',
    'src\background.js',
    'src\browser.js',
    'src\vpp.js',
    'popup\popup.html',
    'manifest\chrome_socket_control.json',
    'PROTOCOL.md',
    'CHANGELOG.md',
    'upgrade.cmd',
    'upgrade.ps1'
  )) {
    if (-not (Test-Path -LiteralPath (Join-Path $RepositoryPath $required))) {
      Fail "Required file missing: $required"
    }
  }

  $chromeManifest = Get-Content -LiteralPath (Join-Path $RepositoryPath 'manifest.json') -Raw | ConvertFrom-Json
  if ($chromeManifest.version -ne '0.11') {
    Fail "Unexpected extension version: $($chromeManifest.version)"
  }

  Get-Content -LiteralPath (Join-Path $RepositoryPath 'manifest\chrome_socket_control.json') -Raw | ConvertFrom-Json | Out-Null
  Write-Log 'JSON manifests parsed successfully.'

  $script:Phase = 'COMPLETE'
  Write-Log "Extension version: $($chromeManifest.version)"
  Write-Log "Repository synchronized and verified."
  Write-Log 'STATUS: SUCCESS - phase=COMPLETE' 'OK'
  Write-Host ''
  Write-Host '============================================================' -ForegroundColor Green
  Write-Host '  UPGRADE SUCCESSFUL' -ForegroundColor Green
  Write-Host ("  Chrome Extension Socket Control  v" + $chromeManifest.version) -ForegroundColor Green
  Write-Host '============================================================' -ForegroundColor Green
  exit 0
}
catch {
  try {
    Write-Log $_.Exception.Message 'ERROR'
    Write-Log ("STATUS: FAILED - phase=" + $script:Phase) 'ERROR'
  } catch {}
  exit 1
}
