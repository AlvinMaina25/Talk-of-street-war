@echo off
setlocal EnableDelayedExpansion
title Zip TALK OF project (safe)

REM ------------------------------------------------------------
REM Zips this project WITHOUT node_modules, .env files, keys,
REM build output, git history and other heavy/sensitive files.
REM Put this file in the project root (next to package.json)
REM and double-click it. The zip is created in the PARENT folder.
REM Needs Windows 10 (1803) or newer (uses the built-in tar).
REM ------------------------------------------------------------

cd /d "%~dp0"

if not exist "package.json" (
  echo ERROR: package.json not found. Put this file in the project root.
  pause
  exit /b 1
)

where tar >nul 2>nul
if errorlevel 1 (
  echo ERROR: "tar" was not found. Update Windows 10/11 or install 7-Zip.
  pause
  exit /b 1
)

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmm"') do set STAMP=%%i
for %%i in ("%CD%") do set NAME=%%~nxi
set "OUT=%CD%\..\%NAME%-%STAMP%.zip"

echo Creating: %OUT%
echo.

tar -a -c -f "%OUT%" ^
  --exclude=node_modules ^
  --exclude=.git ^
  --exclude=.env ^
  --exclude=".env.*" ^
  --exclude=.dev.vars ^
  --exclude=".dev.vars.*" ^
  --exclude=dist ^
  --exclude=build ^
  --exclude=.output ^
  --exclude=.vinxi ^
  --exclude=.tanstack ^
  --exclude=.wrangler ^
  --exclude=.vercel ^
  --exclude=.netlify ^
  --exclude=.cache ^
  --exclude=.turbo ^
  --exclude=coverage ^
  --exclude=".idea" ^
  --exclude=".vscode" ^
  --exclude="*.log" ^
  --exclude="*.pem" ^
  --exclude="*.key" ^
  --exclude="*.p12" ^
  --exclude="*.pfx" ^
  --exclude="*.zip" ^
  --exclude=".DS_Store" ^
  --exclude="Thumbs.db" ^
  --exclude="service-account*.json" ^
  --exclude="credentials*.json" ^
  --exclude="secrets*" ^
  .

if errorlevel 1 (
  echo.
  echo ERROR: zip failed.
  pause
  exit /b 1
)

REM Safety check: warn if anything sensitive slipped in
set FOUND=0
for /f "delims=" %%f in ('tar -tf "%OUT%" ^| findstr /i /r "\.env \.pem \.key node_modules/"') do (
  set FOUND=1
  echo WARNING: found in zip: %%f
)

echo.
if "!FOUND!"=="1" (
  echo Check the warnings above before sharing this zip!
) else (
  echo Safety check passed: no .env, keys or node_modules inside.
)
echo.
echo Done: %OUT%
pause
