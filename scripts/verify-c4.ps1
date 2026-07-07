# Together — verify C4 role-escalation fix locally (pgTAP + migration apply)
# Usage: .\scripts\verify-c4.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "==> Resetting local DB (all migrations incl. C4)..." -ForegroundColor Cyan
npx supabase db reset --local
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Running pgTAP tests (C4 + RLS privacy)..." -ForegroundColor Cyan
npx supabase test db --local
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Regenerating shared types from local schema..." -ForegroundColor Cyan
node packages/shared/scripts/generate-types.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Typecheck mobile..." -ForegroundColor Cyan
Push-Location apps/mobile
npx tsc --noEmit
Pop-Location

Write-Host "`nC4 verification PASSED locally." -ForegroundColor Green
