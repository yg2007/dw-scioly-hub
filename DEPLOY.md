# DW SciOly Hub — Deployment Guide (Windows)

## Quick Start (Prototype Mode)

Prototype mode uses mock data — no Supabase or API keys needed.

```powershell
npm install
npm run dev          # opens http://localhost:5173/app.html
```

Deploy the prototype to Vercel:
```powershell
.\scripts\deploy.ps1 -SkipSupabase
```

---

## Full Production Deployment

### What the scripts automate

| Step | Automated? | Script |
|------|-----------|--------|
| Install dependencies | Yes | `deploy.ps1` |
| Create .env from template | Yes | `deploy.ps1` |
| Validate env vars | Yes | `deploy.ps1` |
| Create Supabase project | Yes | `setup-supabase.ps1` |
| Link Supabase CLI | Yes | `setup-supabase.ps1` |
| Run DB migrations (3 files) | Yes | both scripts |
| Deploy Edge Functions (3) | Yes | both scripts |
| Set Edge Function secrets | Yes | `setup-supabase.ps1` |
| Build frontend | Yes | `deploy.ps1` |
| Deploy to Vercel | Yes | `deploy.ps1` |
| Configure Google OAuth | Manual | Google Cloud Console |
| Enable Google provider in Supabase | Manual | Supabase Dashboard |
| Set Auth redirect URLs | Manual | Supabase Dashboard |
| Create Resend account + verify domain | Manual | resend.com |
| Set Vercel env vars | Manual | Vercel Dashboard |

### Step 1 — One-time setup (run once)

Open PowerShell in the project folder and run:

```powershell
.\scripts\setup-supabase.ps1
```

This interactive script walks you through:

1. Logging into Supabase CLI
2. Creating or linking a Supabase project
3. Collecting your API keys and writing `.env`
4. Running all 3 database migrations
5. Deploying all 3 Edge Functions (generate-quiz, analyze-test, send-invite)
6. Setting Edge Function secrets (Anthropic, Resend, Service Role keys)

### Step 2 — Google OAuth (manual, ~10 min)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
5. Copy the **Client ID** and **Client Secret**
6. Go to [Supabase Dashboard](https://supabase.com/dashboard) > your project > **Auth > Providers > Google**
   - Toggle **Enable**
   - Paste Client ID and Client Secret
7. Still in Auth > **URL Configuration**:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: add `https://your-app.vercel.app/app`

### Step 3 — Resend (manual, ~5 min)

1. Create account at [resend.com](https://resend.com)
2. Add and verify your sending domain (or use the free `onboarding@resend.dev` for testing)
3. Create an API key
4. Set it in Supabase: Dashboard > Edge Functions > Manage Secrets > `RESEND_API_KEY`
5. Also set `INVITE_REDIRECT_URL` to `https://your-app.vercel.app/app`

### Step 4 — Deploy

```powershell
.\scripts\deploy.ps1 -Prod
```

This will:

1. Verify all prerequisites and env vars
2. Install dependencies
3. Push any new DB migrations
4. Deploy Edge Functions
5. Build the React app
6. Deploy to Vercel (production)

### Step 5 — Vercel env vars (manual, ~2 min)

In [Vercel Dashboard](https://vercel.com) > your project > **Settings > Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `VITE_MODE` | `production` |
| `VITE_SUPABASE_URL` | `https://YOUR_REF.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your anon key |

Then trigger a redeploy from the Vercel dashboard, or re-run:

```powershell
.\scripts\deploy.ps1 -Prod -SkipSupabase
```

---

## Script Reference

```powershell
# Full deploy (Supabase + build + Vercel)
.\scripts\deploy.ps1 -Prod

# Just build and deploy to Vercel (skip DB work)
.\scripts\deploy.ps1 -Prod -SkipSupabase

# Build only, no deploy
.\scripts\deploy.ps1 -SkipVercel

# Prototype mode deploy (mock data, no Supabase)
.\scripts\deploy.ps1 -SkipSupabase

# See all options
.\scripts\deploy.ps1 -Help
```

### PowerShell Execution Policy

If you get an error about scripts being disabled, run this once as Administrator:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Prerequisites

Before running either script, make sure you have these installed:

| Tool | Install Command | Notes |
|------|----------------|-------|
| Node.js 18+ | — | [nodejs.org](https://nodejs.org) |
| Supabase CLI | `scoop install supabase` or `winget install Supabase.CLI` | Scripts fall back to `npx supabase` if not installed globally |
| Vercel CLI | `npm i -g vercel` | Auto-installed by deploy script if missing |

**Note:** Supabase CLI does **not** support `npm i -g supabase` on Windows. Use Scoop or Winget instead, or the scripts will automatically use `npx supabase` (slower but works without a global install).

---

## Architecture Overview

```
Browser (Vercel)          Supabase
+---------------+     +--------------------+
|  React SPA    |---->|  Auth (Google)     |
|  Vite build   |     |  PostgreSQL        |
|               |     |  RLS policies      |
|  /            |     |  Storage           |
|  /app         |     |  Realtime          |
+---------------+     |                    |
                      |  Edge Functions:    |
                      |  - generate-quiz    |
                      |  - analyze-test     |
                      |  - send-invite      |
                      +--------------------+
                             |
                      +------+------+
                      |  Claude API |  (Haiku + Sonnet)
                      |  Resend     |  (invite emails)
                      +-------------+
```

## Cost Summary

| Service | Free Tier | Estimated Annual |
|---------|-----------|-----------------|
| Vercel | 100GB bandwidth | $0 |
| Supabase | 500MB DB, 1GB storage, 500K edge invocations | $0 |
| Claude API | Pay-per-use | $20-80/yr |
| Resend | 3,000 emails/mo free | $0 |
| Google OAuth | Free | $0 |
| **Total** | | **$20-80/yr** |
