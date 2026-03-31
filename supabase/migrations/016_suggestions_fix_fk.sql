-- ═══════════════════════════════════════════════════════════
-- 016 — Fix Suggestions FK for PostgREST joins
--
-- The original migration references auth.users(id), but
-- PostgREST joins like "users!author_id" need a FK to
-- the public.users table. Add that FK so the join resolves.
-- ═══════════════════════════════════════════════════════════

-- Add FK from suggestions.author_id → public.users(id)
ALTER TABLE suggestions
  ADD CONSTRAINT suggestions_author_id_public_users_fk
  FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Add FK from suggestion_votes.user_id → public.users(id)
ALTER TABLE suggestion_votes
  ADD CONSTRAINT suggestion_votes_user_id_public_users_fk
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
