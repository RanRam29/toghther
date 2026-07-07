# Together — deploy C4 migration to Supabase Cloud + run pgTAP there
# Requires: network access to Supabase Cloud, `supabase login`, linked project.
# Usage: .\scripts\deploy-c4-cloud.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "==> Pushing pending migrations to linked Supabase project..." -ForegroundColor Cyan
npx supabase db push --linked
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Running pgTAP tests against Cloud..." -ForegroundColor Cyan
npx supabase test db --linked
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Regenerating types from Cloud..." -ForegroundColor Cyan
node packages/shared/scripts/generate-types.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nC4 deployed and verified on Supabase Cloud." -ForegroundColor Green
