# Disable custom Send SMS hook and rely on Twilio in Supabase Dashboard.
# Dashboard: Authentication → Providers → Phone (Twilio / Twilio Verify)
# Optional: Authentication → Hooks → disable any Send SMS hook pointing to send-sms

param(
  [string]$ProjectRef = "flrflktlltmqbiamljlm"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "==> Pushing auth config: native Supabase Twilio (hook disabled)..." -ForegroundColor Cyan
npx supabase config push --project-ref $ProjectRef --yes
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Done. Verify in Dashboard:" -ForegroundColor Green
Write-Host "  Phone provider ENABLED with Twilio" -ForegroundColor White
Write-Host "  Auth Hooks → no active Send SMS hook (unless you want the custom function)" -ForegroundColor White
