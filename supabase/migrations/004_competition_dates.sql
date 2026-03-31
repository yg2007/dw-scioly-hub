-- ═══════════════════════════════════════════════════════════════
--  Migration 004: Competition Dates
--  Track invitationals, regionals, state, and which events are entered
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE competition_type AS ENUM ('invitational', 'regional', 'state', 'national', 'other');

CREATE TABLE competitions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type competition_type NOT NULL DEFAULT 'invitational',
  location TEXT,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  event_ids INT[] DEFAULT '{}',       -- which events the team is entering
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for chronological listing
CREATE INDEX idx_competitions_date ON competitions(date);

-- Enable RLS
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

-- Everyone can view competitions
CREATE POLICY "Authenticated users can view competitions"
  ON competitions FOR SELECT TO authenticated
  USING (true);

-- Only staff can create/update/delete
CREATE POLICY "Staff can manage competitions"
  ON competitions FOR INSERT TO authenticated
  WITH CHECK (is_staff());

CREATE POLICY "Staff can update competitions"
  ON competitions FOR UPDATE TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

CREATE POLICY "Staff can delete competitions"
  ON competitions FOR DELETE TO authenticated
  USING (is_staff());

-- Auto-update updated_at
CREATE TRIGGER trg_competitions_set_updated_at
  BEFORE UPDATE ON competitions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
