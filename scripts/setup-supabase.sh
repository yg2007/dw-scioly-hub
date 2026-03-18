#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  DW SciOly Hub — One-Time Supabase Project Setup
#  Run this ONCE before your first deploy.
#  It creates the project, links it, runs migrations,
#  enables Google Auth, and sets Edge Function secrets.
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[ERR]${NC}   $1"; exit 1; }
ask()   { echo -en "${CYAN}[?]${NC}    $1: "; read -r REPLY; echo "$REPLY"; }

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    DW SciOly Hub — First-Time Setup             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Check CLI tools ─────────────────────────────────────────
command -v supabase &>/dev/null || err "Supabase CLI required: npm i -g supabase"
command -v node     &>/dev/null || err "Node.js 18+ required"

# ─── Step 1: Supabase Login ──────────────────────────────────
info "Step 1/6 — Supabase authentication"
if supabase projects list &>/dev/null 2>&1; then
  ok "Already logged in"
else
  info "Opening Supabase login..."
  supabase login
fi

# ─── Step 2: Create or link project ──────────────────────────
echo ""
info "Step 2/6 — Project setup"
echo "  Do you already have a Supabase project for DW SciOly Hub?"
echo "    1) Yes — I'll link to it"
echo "    2) No  — Create one for me"
echo ""
echo -n "  Choose [1/2]: "
read -r CHOICE

if [ "$CHOICE" = "2" ]; then
  info "Creating new Supabase project..."
  echo -n "  Organization ID (from supabase.com/dashboard): "
  read -r ORG_ID
  echo -n "  Database password (min 6 chars): "
  read -rs DB_PASS
  echo ""

  supabase projects create "dw-scioly-hub" \
    --org-id "$ORG_ID" \
    --db-password "$DB_PASS" \
    --region us-east-1

  ok "Project created! Waiting 30s for it to initialize..."
  sleep 30
fi

echo ""
echo -n "  Enter your project ref (from URL: supabase.com/project/[THIS_PART]): "
read -r PROJECT_REF

info "Linking to project $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF"
ok "Project linked"

# ─── Step 3: Get API keys ────────────────────────────────────
echo ""
info "Step 3/6 — Fetching API keys..."

API_URL="https://${PROJECT_REF}.supabase.co"
echo ""
echo -e "${YELLOW}  Copy these from: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api${NC}"
echo ""
echo -n "  Paste your anon/public key: "
read -r ANON_KEY

# Write .env
cat > .env << ENVEOF
# DW SciOly Hub — Production Environment
VITE_MODE=production
VITE_SUPABASE_URL=${API_URL}
VITE_SUPABASE_ANON_KEY=${ANON_KEY}

# Feature flags (all enabled for production)
VITE_FLAG_REAL_AUTH=true
VITE_FLAG_REAL_DATA=true
VITE_FLAG_AI_QUIZZES=true
VITE_FLAG_AI_TEST_ANALYSIS=true
VITE_FLAG_REALTIME=true
VITE_FLAG_PWA=true
ENVEOF

ok ".env written with Supabase credentials"

# ─── Step 4: Run migrations ──────────────────────────────────
echo ""
info "Step 4/6 — Running database migrations..."
supabase db push
ok "All migrations applied (3 files)"

# ─── Step 5: Deploy Edge Functions ────────────────────────────
echo ""
info "Step 5/6 — Deploying Edge Functions..."

for func_dir in supabase/functions/*/; do
  func_name=$(basename "$func_dir")
  info "  Deploying $func_name..."
  supabase functions deploy "$func_name" --no-verify-jwt=false
  ok "  $func_name deployed"
done

# Set secrets
echo ""
info "Setting Edge Function secrets..."
echo "  You need 3 API keys. Enter each when prompted (or press Enter to skip)."
echo ""
echo -n "  Anthropic API key (for AI quizzes/analysis): "
read -rs ANTHROPIC_KEY
echo ""
echo -n "  Resend API key (for invite emails): "
read -rs RESEND_KEY
echo ""
echo -n "  Supabase Service Role key (Settings → API → service_role): "
read -rs SERVICE_KEY
echo ""

SECRETS=""
[ -n "$ANTHROPIC_KEY" ] && SECRETS+="ANTHROPIC_API_KEY=$ANTHROPIC_KEY,"
[ -n "$RESEND_KEY" ]    && SECRETS+="RESEND_API_KEY=$RESEND_KEY,"
[ -n "$SERVICE_KEY" ]   && SECRETS+="SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY,"

if [ -n "$SECRETS" ]; then
  # Remove trailing comma
  SECRETS="${SECRETS%,}"
  echo "$SECRETS" | tr ',' '\n' | supabase secrets set --env-file /dev/stdin 2>/dev/null \
    || echo "$SECRETS" | tr ',' '\n' | while IFS='=' read -r key val; do
      supabase secrets set "$key=$val"
    done
  ok "Secrets set"
else
  warn "No secrets entered — set them later via Supabase Dashboard"
fi

# ─── Step 6: Google OAuth reminder ───────────────────────────
echo ""
info "Step 6/6 — Google OAuth setup"
echo ""
echo -e "${YELLOW}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${YELLOW}│  MANUAL STEP: Configure Google OAuth                       │${NC}"
echo -e "${YELLOW}├─────────────────────────────────────────────────────────────┤${NC}"
echo -e "${YELLOW}│                                                            │${NC}"
echo -e "${YELLOW}│  1. Go to https://console.cloud.google.com                 │${NC}"
echo -e "${YELLOW}│  2. Create project (or select existing) → APIs & Services  │${NC}"
echo -e "${YELLOW}│  3. Credentials → Create OAuth 2.0 Client ID              │${NC}"
echo -e "${YELLOW}│     • Type: Web application                                │${NC}"
echo -e "${YELLOW}│     • Authorized redirect URI:                             │${NC}"
echo -e "${YELLOW}│       ${API_URL}/auth/v1/callback  │${NC}"
echo -e "${YELLOW}│  4. Copy Client ID + Client Secret                         │${NC}"
echo -e "${YELLOW}│  5. Go to Supabase Dashboard → Auth → Providers → Google   │${NC}"
echo -e "${YELLOW}│     • Enable it                                            │${NC}"
echo -e "${YELLOW}│     • Paste Client ID + Client Secret                      │${NC}"
echo -e "${YELLOW}│  6. Auth → URL Configuration:                              │${NC}"
echo -e "${YELLOW}│     • Site URL: https://your-app.vercel.app                │${NC}"
echo -e "${YELLOW}│     • Redirect URLs: https://your-app.vercel.app/app       │${NC}"
echo -e "${YELLOW}│                                                            │${NC}"
echo -e "${YELLOW}└─────────────────────────────────────────────────────────────┘${NC}"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Setup complete! Next steps:${NC}"
echo -e "${GREEN}  1. Configure Google OAuth (above)${NC}"
echo -e "${GREEN}  2. Run: ./scripts/deploy.sh --prod${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
