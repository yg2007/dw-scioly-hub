-- ═══════════════════════════════════════════════════════════════
--  Migration 006: Competition Team Assignments & Event Scores
--
--  Green Team / White Team per event per competition.
--  A student can compete in multiple events but cannot be on
--  both teams for the same event in the same competition.
--  Scores are captured per team per event after the competition.
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE team_color AS ENUM ('green', 'white');

-- ─── Team Assignments ──────────────────────────────────────────
-- One row per student per event per competition
CREATE TABLE competition_team_assignments (
  id SERIAL PRIMARY KEY,
  competition_id INT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team team_color NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- A student can only be on ONE team per event per competition
  UNIQUE(competition_id, event_id, user_id)
);

CREATE INDEX idx_comp_team_assign_comp ON competition_team_assignments(competition_id);
CREATE INDEX idx_comp_team_assign_event ON competition_team_assignments(event_id);
CREATE INDEX idx_comp_team_assign_user ON competition_team_assignments(user_id);

-- ─── Event Scores ──────────────────────────────────────────────
-- One row per team per event per competition
CREATE TABLE competition_event_scores (
  id SERIAL PRIMARY KEY,
  competition_id INT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team team_color NOT NULL,
  score NUMERIC(8,2),          -- raw score (can be points, time, etc.)
  placement INT,               -- 1st, 2nd, 3rd, etc.
  notes TEXT,
  entered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One score entry per team per event per competition
  UNIQUE(competition_id, event_id, team)
);

CREATE INDEX idx_comp_scores_comp ON competition_event_scores(competition_id);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE competition_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_event_scores ENABLE ROW LEVEL SECURITY;

-- Assignments: all authenticated can view, staff can manage
CREATE POLICY "Authenticated can view team assignments"
  ON competition_team_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage team assignments"
  ON competition_team_assignments FOR INSERT TO authenticated WITH CHECK (is_staff());
CREATE POLICY "Staff can update team assignments"
  ON competition_team_assignments FOR UPDATE TO authenticated USING (is_staff());
CREATE POLICY "Staff can delete team assignments"
  ON competition_team_assignments FOR DELETE TO authenticated USING (is_staff());

-- Scores: all authenticated can view, staff can manage
CREATE POLICY "Authenticated can view event scores"
  ON competition_event_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage event scores"
  ON competition_event_scores FOR INSERT TO authenticated WITH CHECK (is_staff());
CREATE POLICY "Staff can update event scores"
  ON competition_event_scores FOR UPDATE TO authenticated USING (is_staff());
CREATE POLICY "Staff can delete event scores"
  ON competition_event_scores FOR DELETE TO authenticated USING (is_staff());
