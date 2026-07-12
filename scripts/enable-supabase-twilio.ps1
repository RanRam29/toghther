# Re-enable native Twilio on the linked Supabase project (credentials from Dashboard).
param(
  [string]$ProjectRef = "flrflktlltmqbiamljlm"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

function Require-Env([string]$Name) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if (-not $value) { throw "Missing env: $Name (copy from Dashboard → Auth → Providers → Phone)" }
  return $value
}

Require-Env "SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID" | Out-Null
Require-Env "SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN" | Out-Null
if (-not $env:SUPABASE_AUTH_SMS_TWILIO_MESSAGE_SERVICE_SID -and -not $env:SUPABASE_AUTH_SMS_TWILIO_VERIFY_SERVICE_SID) {
  throw "Set SUPABASE_AUTH_SMS_TWILIO_MESSAGE_SERVICE_SID or SUPABASE_AUTH_SMS_TWILIO_VERIFY_SERVICE_SID"
}

$twilioBlock = @"
[auth.sms.twilio]
enabled = true
account_sid = "env(SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID)"
message_service_sid = "env(SUPABASE_AUTH_SMS_TWILIO_MESSAGE_SERVICE_SID)"
auth_token = "env(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)"
"@

$configPath = Join-Path $PWD "supabase\config.toml"
$content = Get-Content $configPath -Raw
if ($content -notmatch '\[auth\.sms\.twilio\]') {
  $content = $content -replace '(# Dev/staging OTP without SMS)', "$twilioBlock`r`n`r`n`$1"
  Set-Content -Path $configPath -Value $content -NoNewline
}

Write-Host "==> Pushing Twilio auth config..." -ForegroundColor Cyan
npx supabase config push --project-ref $ProjectRef --yes
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Twilio re-enabled on project $ProjectRef" -ForegroundColor Green
