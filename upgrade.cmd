@echo off
setlocal EnableExtensions
if /I "%~1"=="--handoff" goto :handoff
cls
set "REPO_DIR=%~dp0"
if "%REPO_DIR:~-1%"=="\" set "REPO_DIR=%REPO_DIR:~0,-1%"
set "TMP_LAUNCHER=%TEMP%\chrome-socket-upgrade-%RANDOM%-%RANDOM%.cmd"
copy /Y "%~f0" "%TMP_LAUNCHER%" >NUL || exit /b 1
call "%TMP_LAUNCHER%" --handoff "%REPO_DIR%"
set "RC=%ERRORLEVEL%"
del /Q "%TMP_LAUNCHER%" >NUL 2>&1
exit /b %RC%

:handoff
set "REPO_DIR=%~2"
if not defined REPO_DIR (
  echo ERROR: Repository path is empty.
  exit /b 2
)
where git >NUL 2>&1
if errorlevel 1 (
  echo ERROR: Git for Windows is required and git.exe was not found in PATH.
  exit /b 3
)
where powershell >NUL 2>&1
if errorlevel 1 (
  echo ERROR: Windows PowerShell is required.
  exit /b 4
)
if not exist "%REPO_DIR%" mkdir "%REPO_DIR%" || exit /b 5
pushd "%REPO_DIR%" || (
  echo ERROR: Cannot access repository path: %REPO_DIR%
  exit /b 6
)
set "ACTIVE_DIR=%CD%"
set "GIT_CONFIG_COUNT=1"
set "GIT_CONFIG_KEY_0=safe.directory"
set "GIT_CONFIG_VALUE_0=%ACTIVE_DIR%"
if not exist ".git" (
  for /F %%A in ('dir /B /A 2^>NUL ^| findstr /V /I /X /C:"upgrade.cmd" /C:"logs"') do (
    echo ERROR: Fresh bootstrap directory contains unexpected item: %%A
    popd
    exit /b 7
  )
  git init >NUL 2>&1 || (popd & exit /b 8)
  git remote add origin https://github.com/Suenee/chrome-extension-socket-control.git >NUL 2>&1
)
git remote set-url origin https://github.com/Suenee/chrome-extension-socket-control.git >NUL 2>&1
echo [SELF-UPDATE] Fetching authoritative updater...
git fetch origin main
if errorlevel 1 (popd & exit /b 9)
set "TMP_RUNNER=%TEMP%\chrome-socket-upgrade-%RANDOM%-%RANDOM%.ps1"
git show origin/main:upgrade.ps1 > "%TMP_RUNNER%"
if errorlevel 1 (
  echo ERROR: Cannot extract current upgrade.ps1 from origin/main.
  popd
  exit /b 10
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%TMP_RUNNER%" -RepositoryPath "%REPO_DIR%" -ActivePath "%ACTIVE_DIR%"
set "RC=%ERRORLEVEL%"
del /Q "%TMP_RUNNER%" >NUL 2>&1
popd
exit /b %RC%
