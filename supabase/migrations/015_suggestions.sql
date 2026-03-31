-- ═══════════════════════════════════════════════════════════
-- 015 — Suggestions Log
--
-- Anyone can create suggestions, vote, and view.
-- Coaches/admins can update status.
-- ═══════════════════════════════════════════════════════════

CREATE TYPE suggestion_status AS ENUM ('new', 'considering', 'planned', 'in_progress', 'completed', 'declined');

CREATE TABLE suggestions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) >= 3),
  description TEXT DEFAULT '',
  status      suggestion_status NOT NULL DEFAULT 'new',
  vote_count  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Votes: one vote per user per suggestion
CREATE TABLE suggestion_votes (
  suggestion_id BIGINT NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (suggestion_id, user_id)
);

-- Indexes
CREATE INDEX idx_suggestions_status ON suggestions (status);
CREATE INDEX idx_suggestions_votes  ON suggestions (vote_count DESC);
CREATE INDEX idx_suggestion_votes_user ON suggestion_votes (user_id);

-- RLS
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_votes ENABLE ROW LEVEL SECURITY;

-- Everyone can view suggestions
CREATE POLICY suggestions_select ON suggestions FOR SELECT USING (true);

-- Authenticated users can insert their own suggestions
CREATE POLICY suggestions_insert ON suggestions FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Authors can update their own title/description; coaches can update status
CREATE POLICY suggestions_update ON suggestions FOR UPDATE USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin')
  )
);

-- Everyone can view votes
CREATE POLICY votes_select ON suggestion_votes FOR SELECT USING (true);

-- Users can insert/delete their own votes
CREATE POLICY votes_insert ON suggestion_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY votes_delete ON suggestion_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to keep vote_count in sync
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

CREATE TRIGGER trg_suggestion_vote_count
  AFTER INSERT OR DELETE ON suggestion_votes
  FOR EACH ROW EXECUTE FUNCTION update_suggestion_vote_count();
