-- ═══════════════════════════════════════════════════════════
-- 015 — Suggestions Log (idempotent retry)
--
-- Safe to re-run: skips objects that already exist.
-- ═══════════════════════════════════════════════════════════

-- Enum (skip if exists)
DO $$ BEGIN
  CREATE TYPE suggestion_status AS ENUM ('new', 'considering', 'planned', 'in_progress', 'completed', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS suggestions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) >= 3),
  description TEXT DEFAULT '',
  status      suggestion_status NOT NULL DEFAULT 'new',
  vote_count  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suggestion_votes (
  suggestion_id BIGINT NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (suggestion_id, user_id)
);

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions (status);
CREATE INDEX IF NOT EXISTS idx_suggestions_votes  ON suggestions (vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_suggestion_votes_user ON suggestion_votes (user_id);

-- RLS
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_votes ENABLE ROW LEVEL SECURITY;

-- Policies (drop + recreate to be safe)
DROP POLICY IF EXISTS suggestions_select ON suggestions;
CREATE POLICY suggestions_select ON suggestions FOR SELECT USING (true);

DROP POLICY IF EXISTS suggestions_insert ON suggestions;
CREATE POLICY suggestions_insert ON suggestions FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS suggestions_update ON suggestions;
CREATE POLICY suggestions_update ON suggestions FOR UPDATE USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin')
  )
);

DROP POLICY IF EXISTS votes_select ON suggestion_votes;
CREATE POLICY votes_select ON suggestion_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS votes_insert ON suggestion_votes;
CREATE POLICY votes_insert ON suggestion_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS votes_delete ON suggestion_votes;
CREATE POLICY votes_delete ON suggestion_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Vote count trigger
CREATE OR REPLACE FUNCTION update_suggestion_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE suggestions SET vote_count = vote_count + 1, updated_at = now()
    WHERE id = NEW.suggestion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE suggestions SET vote_count = vote_count - 1, updated_at = now()
    WHERE id = OLD.suggestion_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_suggestion_vote_count ON suggestion_votes;
CREATE TRIGGER trg_suggestion_vote_count
  AFTER INSERT OR DELETE ON suggestion_votes
  FOR EACH ROW EXECUTE FUNCTION update_suggestion_vote_count();
