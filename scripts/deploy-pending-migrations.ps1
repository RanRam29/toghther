# Together — deploy pending Supabase migrations (local optional + cloud + types)
# Usage:
#   .\scripts\deploy-pending-migrations.ps1           # cloud push + test + types
#   .\scripts\deploy-pending-migrations.ps1 -Local    # also db reset + local pgTAP first

param(
  [switch]$Local
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if ($Local) {
  Write-Host "==> Local: supabase db reset..." -ForegroundColor Cyan
  npx supabase db reset --local
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Local reset failed (is Docker Desktop running?). Skipping local tests." -ForegroundColor Yellow
  } else {
    Write-Host "==> Local: supabase test db..." -ForegroundColor Cyan
    npx supabase test db --local
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
}

Write-Host "==> Cloud: supabase db push --linked..." -ForegroundColor Cyan
npx supabase db push --linked --include-all --yes
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Cloud: supabase test db --linked..." -ForegroundColor Cyan
npx supabase test db --linked
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Regenerating shared types from Cloud..." -ForegroundColor Cyan
node packages/shared/scripts/generate-types.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nPending migrations deployed and verified." -ForegroundColor Green
