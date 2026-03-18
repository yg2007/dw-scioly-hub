# ═══════════════════════════════════════════════════════════════
#  DW SciOly Hub — One-Time Supabase Project Setup (Windows)
#  Run this ONCE before your first deploy.
#  Usage: .\scripts\setup-supabase.ps1
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

function Info($msg)  { Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Ok($msg)    { Write-Host "[OK]    $msg" -ForegroundColor Green }
function Warn($msg)  { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Err($msg)   { Write-Host "[ERR]   $msg" -ForegroundColor Red; exit 1 }

# Navigate to project root
$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectDir

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "    DW SciOly Hub — First-Time Setup                  " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""

# ─── Check CLI tools ─────────────────────────────────────────
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Err "Node.js 18+ required. Install from https://nodejs.org"
}

# Supabase CLI: prefer global (scoop/winget), fall back to npx
if (Get-Command "supabase" -ErrorAction SilentlyContinue) {
    $SB = "supabase"
    Ok "Supabase CLI found (global install)"
} else {
    $SB = "npx supabase"
    Warn "Supabase CLI not found globally — using 'npx supabase'"
    Warn "For faster runs, install via:  scoop install supabase  OR  winget install Supabase.CLI"
}

# ═══════════════════════════════════════════════════════════════
#  Step 1: Supabase Login
# ═══════════════════════════════════════════════════════════════
Info "Step 1/6 — Supabase authentication"
$projTest = Invoke-Expression "$SB projects list" 2>&1
if ($LASTEXITCODE -eq 0) {
    Ok "Already logged in"
} else {
    Info "Opening Supabase login..."
    Invoke-Expression "$SB login"
}

# ═══════════════════════════════════════════════════════════════
#  Step 2: Create or link project
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Info "Step 2/6 — Project setup"
Write-Host "  Do you already have a Supabase project for DW SciOly Hub?"
Write-Host "    1) Yes — I'll link to it"
Write-Host "    2) No  — Create one for me"
Write-Host ""
$choice = Read-Host "  Choose [1/2]"

if ($choice -eq "2") {
    Info "Creating new Supabase project..."
    $orgId = Read-Host "  Organization ID (from supabase.com/dashboard)"
    $dbPass = Read-Host "  Database password (min 6 chars)" -AsSecureString
    $dbPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPass)
    )

    Invoke-Expression "$SB projects create `"dw-scioly-hub`" --org-id $orgId --db-password $dbPassPlain --region us-east-1"

    Ok "Project created! Waiting 30s for it to initialize..."
    Start-Sleep -Seconds 30
}

Write-Host ""
$projectRef = Read-Host "  Enter your project ref (from URL: supabase.com/project/[THIS_PART])"

# Remove any existing config.toml so `supabase link` can regenerate it cleanly
$configPath = Join-Path $ProjectDir "supabase\config.toml"
if (Test-Path $configPath) {
    Info "Removing existing supabase/config.toml so link can regenerate it..."
    Remove-Item $configPath -Force
}

Info "Linking to project $projectRef..."
Invoke-Expression "$SB link --project-ref $projectRef"
if ($LASTEXITCODE -ne 0) { Err "Linking failed. Run with --debug for details." }
Ok "Project linked"

# ═══════════════════════════════════════════════════════════════
#  Step 3: Get API keys and write .env
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Info "Step 3/6 — Fetching API keys..."

$apiUrl = "https://${projectRef}.supabase.co"
Write-Host ""
Write-Host "  Copy these from: https://supabase.com/dashboard/project/${projectRef}/settings/api" -ForegroundColor Yellow
Write-Host ""
$anonKey = Read-Host "  Paste your anon/public key"

# Write .env
@"
# DW SciOly Hub — Production Environment
VITE_MODE=production
VITE_SUPABASE_URL=$apiUrl
VITE_SUPABASE_ANON_KEY=$anonKey

# Feature flags (all enabled for production)
VITE_FLAG_REAL_AUTH=true
VITE_FLAG_REAL_DATA=true
VITE_FLAG_AI_QUIZZES=true
VITE_FLAG_AI_TEST_ANALYSIS=true
VITE_FLAG_REALTIME=true
VITE_FLAG_PWA=true
"@ | Set-Content ".env" -Encoding UTF8

Ok ".env written with Supabase credentials"

# ═══════════════════════════════════════════════════════════════
#  Step 4: Run migrations
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Info "Step 4/6 — Running database migrations..."
Invoke-Expression "$SB db push"
if ($LASTEXITCODE -ne 0) { Err "Migration failed" }
Ok "All migrations applied (3 files)"

# ═══════════════════════════════════════════════════════════════
#  Step 5: Deploy Edge Functions + set secrets
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Info "Step 5/6 — Deploying Edge Functions..."

Get-ChildItem "supabase\functions" -Directory | ForEach-Object {
    $funcName = $_.Name
    Info "  Deploying $funcName..."
    Invoke-Expression "$SB functions deploy $funcName --no-verify-jwt=false"
    if ($LASTEXITCODE -ne 0) { Err "Failed to deploy $funcName" }
    Ok "  $funcName deployed"
}

Write-Host ""
Info "Setting Edge Function secrets..."
Write-Host "  You need 3 API keys. Enter each when prompted (or press Enter to skip)."
Write-Host ""

$anthropicKey = Read-Host "  Anthropic API key (for AI quizzes/analysis)"
$resendKey    = Read-Host "  Resend API key (for invite emails)"
$serviceKey   = Read-Host "  Supabase Service Role key (Settings -> API -> service_role)"

$secrets = @()
if ($anthropicKey) { $secrets += "ANTHROPIC_API_KEY=$anthropicKey" }
if ($resendKey)    { $secrets += "RESEND_API_KEY=$resendKey" }
if ($serviceKey)   { $secrets += "SUPABASE_SERVICE_ROLE_KEY=$serviceKey" }

if ($secrets.Count -gt 0) {
    foreach ($secret in $secrets) {
        Invoke-Expression "$SB secrets set $secret"
    }
    Ok "Secrets set"
} else {
    Warn "No secrets entered — set them later via Supabase Dashboard"
}

# ═══════════════════════════════════════════════════════════════
#  Step 6: Google OAuth reminder
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Info "Step 6/6 — Google OAuth setup"
Write-Host ""
Write-Host "--------------------------------------------------------------" -ForegroundColor Yellow
Write-Host "  MANUAL STEP: Configure Google OAuth                        " -ForegroundColor Yellow
Write-Host "--------------------------------------------------------------" -ForegroundColor Yellow
Write-Host ""                                                              -ForegroundColor Yellow
Write-Host "  1. Go to https://console.cloud.google.com                  " -ForegroundColor Yellow
Write-Host "  2. Create project (or select existing)                     " -ForegroundColor Yellow
Write-Host "     -> APIs & Services -> Credentials                       " -ForegroundColor Yellow
Write-Host "  3. Create OAuth 2.0 Client ID                             " -ForegroundColor Yellow
Write-Host "     * Type: Web application                                 " -ForegroundColor Yellow
Write-Host "     * Authorized redirect URI:                              " -ForegroundColor Yellow
Write-Host "       $apiUrl/auth/v1/callback                              " -ForegroundColor Yellow
Write-Host "  4. Copy Client ID + Client Secret                          " -ForegroundColor Yellow
Write-Host "  5. Supabase Dashboard -> Auth -> Providers -> Google       " -ForegroundColor Yellow
Write-Host "     * Enable it, paste Client ID + Secret                   " -ForegroundColor Yellow
Write-Host "  6. Auth -> URL Configuration:                              " -ForegroundColor Yellow
Write-Host "     * Site URL: https://your-app.vercel.app                 " -ForegroundColor Yellow
Write-Host "     * Redirect URLs: https://your-app.vercel.app/app        " -ForegroundColor Yellow
Write-Host ""                                                              -ForegroundColor Yellow
Write-Host "--------------------------------------------------------------" -ForegroundColor Yellow

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Setup complete! Next steps:" -ForegroundColor Green
Write-Host "  1. Configure Google OAuth (above)" -ForegroundColor Green
Write-Host "  2. Run: .\scripts\deploy.ps1 -Prod" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
