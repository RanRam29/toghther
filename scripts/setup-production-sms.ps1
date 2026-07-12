# Production SMS (Twilio) for Supabase Phone OTP
# Usage:
#   $env:TWILIO_ACCOUNT_SID="AC..."
#   $env:TWILIO_AUTH_TOKEN="..."
#   $env:TWILIO_PHONE_NUMBER="+972..."   # OR TWILIO_MESSAGE_SERVICE_SID="MG..."
#   .\scripts\setup-production-sms.ps1
#
# Optional: reuse an existing hook secret instead of generating one:
#   $env:SEND_SMS_HOOK_SECRET="v1,whsec_..."

param(
  [string]$ProjectRef = "flrflktlltmqbiamljlm"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

function Require-Env([string]$Name) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if (-not $value) {
    throw "Missing required environment variable: $Name"
  }
  return $value
}

function New-HookSecret {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $encoded = [Convert]::ToBase64String($bytes)
  return "v1,whsec_$encoded"
}

Write-Host "==> Together — Production SMS setup (Twilio + Auth Hook)" -ForegroundColor Cyan

$accountSid = Require-Env "TWILIO_ACCOUNT_SID"
$authToken = Require-Env "TWILIO_AUTH_TOKEN"
$fromNumber = [Environment]::GetEnvironmentVariable("TWILIO_PHONE_NUMBER")
$messagingSid = [Environment]::GetEnvironmentVariable("TWILIO_MESSAGE_SERVICE_SID")

if (-not $fromNumber -and -not $messagingSid) {
  throw "Set TWILIO_PHONE_NUMBER or TWILIO_MESSAGE_SERVICE_SID"
}

$hookSecret = [Environment]::GetEnvironmentVariable("SEND_SMS_HOOK_SECRET")
if (-not $hookSecret) {
  $hookSecret = New-HookSecret
  Write-Host "Generated SEND_SMS_HOOK_SECRET (store it safely)." -ForegroundColor Yellow
}

$secretsArgs = @(
  "TWILIO_ACCOUNT_SID=$accountSid",
  "TWILIO_AUTH_TOKEN=$authToken",
  "SEND_SMS_HOOK_SECRET=$hookSecret"
)
if ($fromNumber) { $secretsArgs += "TWILIO_PHONE_NUMBER=$fromNumber" }
if ($messagingSid) { $secretsArgs += "TWILIO_MESSAGE_SERVICE_SID=$messagingSid" }

Write-Host "==> Setting Supabase secrets..." -ForegroundColor Cyan
npx supabase secrets set @secretsArgs --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Deploying send-sms Edge Function..." -ForegroundColor Cyan
npx supabase functions deploy send-sms --no-verify-jwt --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Pushing auth hook config..." -ForegroundColor Cyan
$env:SEND_SMS_HOOK_SECRET = $hookSecret
npx supabase config push --project-ref $ProjectRef --yes
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Production SMS is configured." -ForegroundColor Green
Write-Host "1. In Supabase Dashboard → Authentication → Providers → Phone: ensure Phone is ENABLED." -ForegroundColor White
Write-Host "2. Reload the app and sign in with format 050-XXXXXXX." -ForegroundColor White
Write-Host "3. Hook secret (save for re-runs): $hookSecret" -ForegroundColor DarkGray
