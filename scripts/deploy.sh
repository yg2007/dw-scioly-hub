#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  DW SciOly Hub — Automated Deployment Script
#  Handles: Supabase setup, Edge Functions, Vercel deploy
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[ERR]${NC}   $1"; exit 1; }

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# ─── Parse flags ──────────────────────────────────────────────
SKIP_SUPABASE=false
SKIP_VERCEL=false
SKIP_BUILD=false
PROD=false

for arg in "$@"; do
  case $arg in
    --skip-supabase) SKIP_SUPABASE=true ;;
    --skip-vercel)   SKIP_VERCEL=true ;;
    --skip-build)    SKIP_BUILD=true ;;
    --prod)          PROD=true ;;
    --help|-h)
      echo "Usage: ./scripts/deploy.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --prod            Deploy in production mode (VITE_MODE=production)"
      echo "  --skip-supabase   Skip Supabase migrations and function deploys"
      echo "  --skip-vercel     Skip Vercel deployment (local build only)"
      echo "  --skip-build      Skip npm build step"
      echo "  -h, --help        Show this help"
      exit 0
      ;;
    *) warn "Unknown flag: $arg" ;;
  esac
done

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    DW SciOly Hub — Deployment                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
#  STEP 0 — Prerequisites check
# ═══════════════════════════════════════════════════════════════
info "Checking prerequisites..."

check_cmd() {
  if command -v "$1" &>/dev/null; then
    ok "$1 found ($(command -v "$1"))"
    return 0
  else
    return 1
  fi
}

check_cmd "node" || err "Node.js not found. Install from https://nodejs.org (v18+)"
check_cmd "npm"  || err "npm not found"

NODE_VER=$(node -v | grep -oP '\d+' | head -1)
if [ "$NODE_VER" -lt 18 ]; then
  err "Node.js v18+ required (found $(node -v))"
fi
ok "Node.js $(node -v)"

if [ "$SKIP_SUPABASE" = false ]; then
  if ! check_cmd "supabase"; then
    warn "Supabase CLI not found. Installing..."
    npm install -g supabase@latest
    check_cmd "supabase" || err "Supabase CLI install failed. See https://supabase.com/docs/guides/cli"
  fi
fi

if [ "$SKIP_VERCEL" = false ]; then
  if ! check_cmd "vercel"; then
    warn "Vercel CLI not found. Installing..."
    npm install -g vercel@latest
    check_cmd "vercel" || err "Vercel CLI install failed. Run: npm i -g vercel"
  fi
fi

# ═══════════════════════════════════════════════════════════════
#  STEP 1 — Install dependencies
# ═══════════════════════════════════════════════════════════════
echo ""
info "Installing dependencies..."
npm ci --prefer-offline 2>/dev/null || npm install
ok "Dependencies installed"

# ═══════════════════════════════════════════════════════════════
#  STEP 2 — Environment file
# ═══════════════════════════════════════════════════════════════
echo ""
if [ ! -f .env ]; then
  warn ".env file not found — creating from .env.example"
  cp .env.example .env
  if [ "$PROD" = true ]; then
    sed -i 's/VITE_MODE=prototype/VITE_MODE=production/' .env
  fi
  echo ""
  echo -e "${YELLOW}┌─────────────────────────────────────────────────────────┐${NC}"
  echo -e "${YELLOW}│  ACTION REQUIRED: Edit .env with your Supabase keys    │${NC}"
  echo -e "${YELLOW}│                                                        │${NC}"
  echo -e "${YELLOW}│  1. Go to https://supabase.com/dashboard               │${NC}"
  echo -e "${YELLOW}│  2. Select your project → Settings → API               │${NC}"
  echo -e "${YELLOW}│  3. Copy Project URL → VITE_SUPABASE_URL               │${NC}"
  echo -e "${YELLOW}│  4. Copy anon/public key → VITE_SUPABASE_ANON_KEY      │${NC}"
  echo -e "${YELLOW}│                                                        │${NC}"
  echo -e "${YELLOW}│  Then re-run this script.                              │${NC}"
  echo -e "${YELLOW}└─────────────────────────────────────────────────────────┘${NC}"
  echo ""
  exit 0
else
  ok ".env file exists"
  # Validate required vars if in production mode
  source <(grep -v '^#' .env | grep -v '^\s*$' | sed 's/^/export /')
  if [ "$PROD" = true ] || [ "${VITE_MODE:-prototype}" = "production" ]; then
    if [[ "${VITE_SUPABASE_URL:-}" == *"YOUR_PROJECT_ID"* ]] || [ -z "${VITE_SUPABASE_URL:-}" ]; then
      err "VITE_SUPABASE_URL not set in .env. Fill it in and re-run."
    fi
    if [[ "${VITE_SUPABASE_ANON_KEY:-}" == *"your-anon-key"* ]] || [ -z "${VITE_SUPABASE_ANON_KEY:-}" ]; then
      err "VITE_SUPABASE_ANON_KEY not set in .env. Fill it in and re-run."
    fi
    ok "Supabase env vars look valid"
  fi
fi

# ═══════════════════════════════════════════════════════════════
#  STEP 3 — Supabase: migrations + edge functions
# ═══════════════════════════════════════════════════════════════
if [ "$SKIP_SUPABASE" = false ] && [ "${VITE_MODE:-prototype}" = "production" ]; then
  echo ""
  info "Deploying Supabase..."

  # Check if linked to a project
  if ! supabase projects list &>/dev/null; then
    warn "Not logged into Supabase CLI"
    echo "  Run: supabase login"
    echo "  Then: supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
  fi

  # Run migrations
  info "Running database migrations..."
  for migration in supabase/migrations/*.sql; do
    info "  Applying $(basename "$migration")..."
    supabase db push 2>&1 | tail -3
  done
  ok "Database migrations applied"

  # Deploy Edge Functions
  info "Deploying Edge Functions..."
  for func_dir in supabase/functions/*/; do
    func_name=$(basename "$func_dir")
    info "  Deploying $func_name..."
    supabase functions deploy "$func_name" --no-verify-jwt=false 2>&1 | tail -2
    ok "  $func_name deployed"
  done
  ok "All Edge Functions deployed"

  echo ""
  echo -e "${YELLOW}┌─────────────────────────────────────────────────────────┐${NC}"
  echo -e "${YELLOW}│  REMINDER: Set Edge Function secrets in Supabase       │${NC}"
  echo -e "${YELLOW}│  Dashboard → Edge Functions → Manage Secrets:          │${NC}"
  echo -e "${YELLOW}│                                                        │${NC}"
  echo -e "${YELLOW}│  • SUPABASE_SERVICE_ROLE_KEY  (Settings → API)         │${NC}"
  echo -e "${YELLOW}│  • ANTHROPIC_API_KEY          (claude.ai account)      │${NC}"
  echo -e "${YELLOW}│  • RESEND_API_KEY             (resend.com dashboard)   │${NC}"
  echo -e "${YELLOW}│  • INVITE_REDIRECT_URL        (your app URL + /app)    │${NC}"
  echo -e "${YELLOW}└─────────────────────────────────────────────────────────┘${NC}"
else
  if [ "$SKIP_SUPABASE" = true ]; then
    info "Skipping Supabase (--skip-supabase flag)"
  else
    info "Skipping Supabase (prototype mode)"
  fi
fi

# ═══════════════════════════════════════════════════════════════
#  STEP 4 — Build
# ═══════════════════════════════════════════════════════════════
if [ "$SKIP_BUILD" = false ]; then
  echo ""
  info "Building for $([ "$PROD" = true ] && echo 'production' || echo 'prototype') mode..."
  npm run build
  ok "Build complete — output in dist/"

  # Report bundle size
  if [ -d dist ]; then
    TOTAL=$(du -sh dist | cut -f1)
    info "Bundle size: $TOTAL"
    echo "  Files:"
    find dist -name '*.js' -o -name '*.css' | while read -r f; do
      SIZE=$(du -sh "$f" | cut -f1)
      echo "    $SIZE  $(basename "$f")"
    done
  fi
else
  info "Skipping build (--skip-build flag)"
fi

# ═══════════════════════════════════════════════════════════════
#  STEP 5 — Vercel deploy
# ═══════════════════════════════════════════════════════════════
if [ "$SKIP_VERCEL" = false ]; then
  echo ""
  info "Deploying to Vercel..."

  if [ "$PROD" = true ]; then
    vercel --prod
  else
    vercel
  fi

  ok "Deployed to Vercel!"
  echo ""

  # ── Post-deploy reminders ──
  echo -e "${CYAN}┌─────────────────────────────────────────────────────────┐${NC}"
  echo -e "${CYAN}│  POST-DEPLOY CHECKLIST                                 │${NC}"
  echo -e "${CYAN}├─────────────────────────────────────────────────────────┤${NC}"
  echo -e "${CYAN}│  1. Add your Vercel URL to Supabase Auth providers:    │${NC}"
  echo -e "${CYAN}│     Dashboard → Auth → URL Configuration               │${NC}"
  echo -e "${CYAN}│     • Site URL: https://your-app.vercel.app            │${NC}"
  echo -e "${CYAN}│     • Redirect URL: https://your-app.vercel.app/app    │${NC}"
  echo -e "${CYAN}│                                                        │${NC}"
  echo -e "${CYAN}│  2. Add Vercel URL to Google OAuth consent screen:     │${NC}"
  echo -e "${CYAN}│     console.cloud.google.com → Credentials             │${NC}"
  echo -e "${CYAN}│     • Authorized redirect URI:                         │${NC}"
  echo -e "${CYAN}│       https://YOUR_PROJECT.supabase.co/auth/v1/        │${NC}"
  echo -e "${CYAN}│       callback                                         │${NC}"
  echo -e "${CYAN}│                                                        │${NC}"
  echo -e "${CYAN}│  3. Set env vars in Vercel Dashboard → Settings → Env: │${NC}"
  echo -e "${CYAN}│     • VITE_SUPABASE_URL                                │${NC}"
  echo -e "${CYAN}│     • VITE_SUPABASE_ANON_KEY                           │${NC}"
  echo -e "${CYAN}│     • VITE_MODE=production                             │${NC}"
  echo -e "${CYAN}└─────────────────────────────────────────────────────────┘${NC}"
else
  info "Skipping Vercel deploy (--skip-vercel flag)"
  echo ""
  info "To preview locally: npx vite preview"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
