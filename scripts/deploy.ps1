# ═══════════════════════════════════════════════════════════════
#  DW SciOly Hub — Automated Deployment Script (Windows)
#  Handles: Supabase setup, Edge Functions, Vercel deploy
#  Usage: .\scripts\deploy.ps1 [-Prod] [-SkipSupabase] [-SkipVercel] [-SkipBuild]
# ═══════════════════════════════════════════════════════════════

param(
    [switch]$Prod,
    [switch]$SkipSupabase,
    [switch]$SkipVercel,
    [switch]$SkipBuild,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# ─── Helpers ──────────────────────────────────────────────────
function Info($msg)  { Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Ok($msg)    { Write-Host "[OK]    $msg" -ForegroundColor Green }
function Warn($msg)  { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Err($msg)   { Write-Host "[ERR]   $msg" -ForegroundColor Red; exit 1 }

# ─── Navigate to project root ────────────────────────────────
$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectDir

if ($Help) {
    Write-Host ""
    Write-Host "Usage: .\scripts\deploy.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Prod            Deploy in production mode (VITE_MODE=production)"
    Write-Host "  -SkipSupabase    Skip Supabase migrations and function deploys"
    Write-Host "  -SkipVercel      Skip Vercel deployment (local build only)"
    Write-Host "  -SkipBuild       Skip npm build step"
    Write-Host "  -Help            Show this help"
    exit 0
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║    DW SciOly Hub — Deployment                   ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════
#  STEP 0 — Prerequisites check
# ═══════════════════════════════════════════════════════════════
Info "Checking prerequisites..."

function Test-Command($cmd) {
    $found = Get-Command $cmd -ErrorAction SilentlyContinue
    if ($found) {
        Ok "$cmd found ($($found.Source))"
        return $true
    }
    return $false
}

if (-not (Test-Command "node")) { Err "Node.js not found. Install from https://nodejs.org (v18+)" }
if (-not (Test-Command "npm"))  { Err "npm not found" }

$nodeVer = (node -v) -replace 'v(\d+)\..*', '$1'
if ([int]$nodeVer -lt 18) { Err "Node.js v18+ required (found $(node -v))" }
Ok "Node.js $(node -v)"

if (-not $SkipSupabase) {
    # Supabase CLI: prefer global install (scoop/winget) but fall back to npx
    if (Test-Command "supabase") {
        $script:SB = "supabase"
    } else {
        Warn "Supabase CLI not found globally — will use 'npx supabase'"
        Warn "For faster runs, install via:  scoop install supabase  OR  winget install Supabase.CLI"
        $script:SB = "npx supabase"
    }
}

if (-not $SkipVercel) {
    if (-not (Test-Command "vercel")) {
        Warn "Vercel CLI not found. Installing..."
        npm install -g vercel@latest
        if (-not (Test-Command "vercel")) {
            Err "Vercel CLI install failed. Run: npm i -g vercel"
        }
    }
}

# ═══════════════════════════════════════════════════════════════
#  STEP 1 — Install dependencies
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Info "Installing dependencies..."
try {
    npm ci --prefer-offline 2>$null
} catch {
    npm install
}
Ok "Dependencies installed"

# ═══════════════════════════════════════════════════════════════
#  STEP 2 — Environment file
# ═══════════════════════════════════════════════════════════════
Write-Host ""
if (-not (Test-Path ".env")) {
    Warn ".env file not found — creating from .env.example"
    Copy-Item ".env.example" ".env"

    if ($Prod) {
        (Get-Content ".env") -replace 'VITE_MODE=prototype', 'VITE_MODE=production' | Set-Content ".env"
    }

    Write-Host ""
    Write-Host "┌─────────────────────────────────────────────────────────┐" -ForegroundColor Yellow
    Write-Host "│  ACTION REQUIRED: Edit .env with your Supabase keys    │" -ForegroundColor Yellow
    Write-Host "│                                                        │" -ForegroundColor Yellow
    Write-Host "│  1. Go to https://supabase.com/dashboard               │" -ForegroundColor Yellow
    Write-Host "│  2. Select your project -> Settings -> API             │" -ForegroundColor Yellow
    Write-Host "│  3. Copy Project URL -> VITE_SUPABASE_URL              │" -ForegroundColor Yellow
    Write-Host "│  4. Copy anon/public key -> VITE_SUPABASE_ANON_KEY     │" -ForegroundColor Yellow
    Write-Host "│                                                        │" -ForegroundColor Yellow
    Write-Host "│  Then re-run this script.                              │" -ForegroundColor Yellow
    Write-Host "└─────────────────────────────────────────────────────────┘" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}
else {
    Ok ".env file exists"

    # Load and validate env vars
    $envVars = @{}
    Get-Content ".env" | Where-Object { $_ -match '^\s*[^#]' -and $_ -match '=' } | ForEach-Object {
        $parts = $_ -split '=', 2
        $envVars[$parts[0].Trim()] = $parts[1].Trim()
    }

    $viteMode = if ($envVars["VITE_MODE"]) { $envVars["VITE_MODE"] } else { "prototype" }

    if ($Prod -or $viteMode -eq "production") {
        $supaUrl = $envVars["VITE_SUPABASE_URL"]
        $supaKey = $envVars["VITE_SUPABASE_ANON_KEY"]

        if (-not $supaUrl -or $supaUrl -match "YOUR_PROJECT_ID") {
            Err "VITE_SUPABASE_URL not set in .env. Fill it in and re-run."
        }
        if (-not $supaKey -or $supaKey -match "your-anon-key") {
            Err "VITE_SUPABASE_ANON_KEY not set in .env. Fill it in and re-run."
        }
        Ok "Supabase env vars look valid"
    }
}

# ═══════════════════════════════════════════════════════════════
#  STEP 3 — Supabase: migrations + edge functions
# ═══════════════════════════════════════════════════════════════
if (-not $SkipSupabase -and $viteMode -eq "production") {
    Write-Host ""
    Info "Deploying Supabase..."

    # Check if logged in
    $projList = Invoke-Expression "$SB projects list" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Warn "Not logged into Supabase CLI"
        Write-Host "  Run: $SB login"
        Write-Host "  Then: $SB link --project-ref YOUR_PROJECT_REF"
        exit 1
    }

    # Run migrations
    Info "Running database migrations..."
    Get-ChildItem "supabase\migrations\*.sql" | ForEach-Object {
        Info "  Applying $($_.Name)..."
    }
    Invoke-Expression "$SB db push"
    Ok "Database migrations applied"

    # Deploy Edge Functions
    Info "Deploying Edge Functions..."
    Get-ChildItem "supabase\functions" -Directory | ForEach-Object {
        $funcName = $_.Name
        Info "  Deploying $funcName..."
        Invoke-Expression "$SB functions deploy $funcName --no-verify-jwt=false"
        Ok "  $funcName deployed"
    }
    Ok "All Edge Functions deployed"

    Write-Host ""
    Write-Host "┌─────────────────────────────────────────────────────────┐" -ForegroundColor Yellow
    Write-Host "│  REMINDER: Set Edge Function secrets in Supabase       │" -ForegroundColor Yellow
    Write-Host "│  Dashboard -> Edge Functions -> Manage Secrets:        │" -ForegroundColor Yellow
    Write-Host "│                                                        │" -ForegroundColor Yellow
    Write-Host "│  * SUPABASE_SERVICE_ROLE_KEY  (Settings -> API)        │" -ForegroundColor Yellow
    Write-Host "│  * ANTHROPIC_API_KEY          (claude.ai account)      │" -ForegroundColor Yellow
    Write-Host "│  * RESEND_API_KEY             (resend.com dashboard)   │" -ForegroundColor Yellow
    Write-Host "│  * INVITE_REDIRECT_URL        (your app URL + /app)    │" -ForegroundColor Yellow
    Write-Host "└─────────────────────────────────────────────────────────┘" -ForegroundColor Yellow
}
else {
    if ($SkipSupabase) {
        Info "Skipping Supabase (-SkipSupabase flag)"
    } else {
        Info "Skipping Supabase (prototype mode)"
    }
}

# ═══════════════════════════════════════════════════════════════
#  STEP 4 — Build
# ═══════════════════════════════════════════════════════════════
if (-not $SkipBuild) {
    Write-Host ""
    $modeLabel = if ($Prod) { "production" } else { "prototype" }
    Info "Building for $modeLabel mode..."
    npm run build
    if ($LASTEXITCODE -ne 0) { Err "Build failed" }
    Ok "Build complete — output in dist\"

    # Report bundle size
    if (Test-Path "dist") {
        $total = (Get-ChildItem "dist" -Recurse | Measure-Object -Property Length -Sum).Sum
        $totalMB = [math]::Round($total / 1MB, 2)
        Info "Bundle size: ${totalMB}MB"
        Write-Host "  Files:"
        Get-ChildItem "dist" -Recurse -Include "*.js","*.css" | ForEach-Object {
            $sizeKB = [math]::Round($_.Length / 1KB, 1)
            Write-Host "    ${sizeKB}KB  $($_.Name)"
        }
    }
}
else {
    Info "Skipping build (-SkipBuild flag)"
}

# ═══════════════════════════════════════════════════════════════
#  STEP 5 — Vercel deploy
# ═══════════════════════════════════════════════════════════════
if (-not $SkipVercel) {
    Write-Host ""
    Info "Deploying to Vercel..."

    if ($Prod) {
        vercel --prod
    } else {
        vercel
    }

    if ($LASTEXITCODE -ne 0) { Err "Vercel deploy failed" }
    Ok "Deployed to Vercel!"
    Write-Host ""

    Write-Host "┌─────────────────────────────────────────────────────────┐" -ForegroundColor Cyan
    Write-Host "│  POST-DEPLOY CHECKLIST                                 │" -ForegroundColor Cyan
    Write-Host "├─────────────────────────────────────────────────────────┤" -ForegroundColor Cyan
    Write-Host "│  1. Add your Vercel URL to Supabase Auth providers:    │" -ForegroundColor Cyan
    Write-Host "│     Dashboard -> Auth -> URL Configuration             │" -ForegroundColor Cyan
    Write-Host "│     * Site URL: https://your-app.vercel.app            │" -ForegroundColor Cyan
    Write-Host "│     * Redirect URL: https://your-app.vercel.app/app    │" -ForegroundColor Cyan
    Write-Host "│                                                        │" -ForegroundColor Cyan
    Write-Host "│  2. Add Vercel URL to Google OAuth consent screen:     │" -ForegroundColor Cyan
    Write-Host "│     console.cloud.google.com -> Credentials            │" -ForegroundColor Cyan
    Write-Host "│     * Authorized redirect URI:                         │" -ForegroundColor Cyan
    Write-Host "│       https://YOUR_PROJECT.supabase.co/auth/v1/        │" -ForegroundColor Cyan
    Write-Host "│       callback                                         │" -ForegroundColor Cyan
    Write-Host "│                                                        │" -ForegroundColor Cyan
    Write-Host "│  3. Set env vars in Vercel Dashboard -> Settings:      │" -ForegroundColor Cyan
    Write-Host "│     * VITE_SUPABASE_URL                                │" -ForegroundColor Cyan
    Write-Host "│     * VITE_SUPABASE_ANON_KEY                           │" -ForegroundColor Cyan
    Write-Host "│     * VITE_MODE=production                             │" -ForegroundColor Cyan
    Write-Host "└─────────────────────────────────────────────────────────┘" -ForegroundColor Cyan
}
else {
    Info "Skipping Vercel deploy (-SkipVercel flag)"
    Write-Host ""
    Info "To preview locally: npx vite preview"
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Deployment complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
