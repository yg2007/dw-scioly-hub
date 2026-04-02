-- Part A: Create events
-- ═══════════════════════════════════════════════════════════════
--  Migration 020: Import Badger Invitational 2025 Questions
--                  (Division B only)
--
--  Imports 136 questions extracted from the
--  Badger Invitational 2025 tournament tests.
--  Source: PDF/DOCX test documents
--  Events: Ecology, Meteorology, Optics,
--          Reach for the Stars, Wind Power
--  Batched in groups of 10 to avoid SQL editor timeouts.
-- ═══════════════════════════════════════════════════════════════


-- ─── 1. Create events not yet in the database ──────────────────
INSERT INTO events (name, type, team_size, icon, is_trial, season)
VALUES ('Ecology', 'study', 2, '🌿', true, '2025-2026')
ON CONFLICT (name) DO NOTHING;

INSERT INTO events (name, type, team_size, icon, is_trial, season)
VALUES ('Optics', 'lab', 2, '🔭', true, '2025-2026')
ON CONFLICT (name) DO NOTHING;

INSERT INTO events (name, type, team_size, icon, is_trial, season)
VALUES ('Wind Power', 'build', 2, '💨', true, '2025-2026')
ON CONFLICT (name) DO NOTHING;


-- ─── 2. Insert questions (batched) ─────────────────────────────
-- True/False questions use: A=True, B=False, C='', D=''

-- ── Ecology (50 questions) ──
