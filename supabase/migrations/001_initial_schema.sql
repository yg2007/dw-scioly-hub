-- ═══════════════════════════════════════════════════════════════
--  DW SciOly Hub — Production Schema
--  Run against your Supabase project via SQL Editor or CLI
-- ═══════════════════════════════════════════════════════════════

-- ─── ENUMS ───────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('student', 'coach', 'admin');
CREATE TYPE event_type AS ENUM ('study', 'lab', 'build');
CREATE TYPE study_stage AS ENUM ('foundation', 'application', 'mastery', 'competition');
CREATE TYPE quiz_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE trend_direction AS ENUM ('up', 'stable', 'down');

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  initials TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  avatar_color TEXT DEFAULT '#2EC4B6',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── EVENTS ──────────────────────────────────────────────────
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type event_type NOT NULL,
  team_size INT NOT NULL DEFAULT 2,
  icon TEXT NOT NULL,  -- emoji
  is_trial BOOLEAN DEFAULT false,
  season TEXT NOT NULL DEFAULT '2025-2026',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── EVENT TOPICS ────────────────────────────────────────────
CREATE TABLE event_topics (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE(event_id, name)
);

-- ─── USER ↔ EVENT ASSIGNMENTS ────────────────────────────────
CREATE TABLE user_events (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- ─── PARTNERSHIPS (2 students paired for an event) ───────────
CREATE TABLE partnerships (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  partner_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, partner_a, partner_b)
);

-- ─── QUIZ QUESTIONS ──────────────────────────────────────────
CREATE TABLE quiz_questions (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,        -- ["Option A", "Option B", "Option C", "Option D"]
  correct_index INT NOT NULL,    -- 0-based index into options
  explanation TEXT,
  difficulty quiz_difficulty NOT NULL DEFAULT 'medium',
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── QUIZ ATTEMPTS ───────────────────────────────────────────
CREATE TABLE quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  score INT NOT NULL,            -- number correct
  total INT NOT NULL,            -- total questions
  answers JSONB NOT NULL,        -- [{questionId, selectedIndex, correct: bool}]
  time_taken_seconds INT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ─── TOPIC MASTERY (per user per event per topic) ────────────
CREATE TABLE topic_mastery (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,    -- 0-100
  trend trend_direction DEFAULT 'stable',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_id, topic)
);

-- ─── STUDY PATHS ─────────────────────────────────────────────
CREATE TABLE study_paths (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  current_stage study_stage NOT NULL DEFAULT 'foundation',
  stage_progress JSONB DEFAULT '{"foundation":0,"application":0,"mastery":0,"competition":0}',
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- ─── STUDY RESOURCES ─────────────────────────────────────────
CREATE TABLE study_resources (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  resource_type TEXT DEFAULT 'link',  -- link | document | video | note
  uploaded_by UUID REFERENCES users(id),
  storage_path TEXT,                   -- Supabase Storage path if uploaded
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── BUILD LOGS ──────────────────────────────────────────────
CREATE TABLE build_logs (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Build Log',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── BUILD LOG ENTRIES ───────────────────────────────────────
CREATE TABLE build_entries (
  id SERIAL PRIMARY KEY,
  build_log_id INT NOT NULL REFERENCES build_logs(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NOT NULL,
  measurements JSONB,                  -- {weight: "45g", height: "30cm", ...}
  photo_paths TEXT[],                  -- array of Supabase Storage paths
  tags TEXT[],                         -- ["design", "testing", "materials"]
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TEST UPLOADS (scanned practice tests) ───────────────────
CREATE TABLE test_uploads (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  ai_analysis JSONB,                   -- Claude's analysis result
  score_earned NUMERIC(5,2),
  score_total NUMERIC(5,2),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ─── PRACTICE SCHEDULE ───────────────────────────────────────
CREATE TABLE practice_sessions (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_ids INT[],                     -- events covered in this session
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── ANNOUNCEMENTS ───────────────────────────────────────────
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',      -- normal | important | urgent
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════
--  INDEXES
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX idx_user_events_user ON user_events(user_id);
CREATE INDEX idx_user_events_event ON user_events(event_id);
CREATE INDEX idx_quiz_questions_event ON quiz_questions(event_id);
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_event ON quiz_attempts(event_id);
CREATE INDEX idx_topic_mastery_user_event ON topic_mastery(user_id, event_id);
CREATE INDEX idx_build_entries_log ON build_entries(build_log_id);
CREATE INDEX idx_test_uploads_user ON test_uploads(user_id);
CREATE INDEX idx_practice_sessions_time ON practice_sessions(start_time);


-- ═══════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is coach or admin
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- USERS: everyone can read, users can update own profile, admins can update roles
CREATE POLICY "Users are viewable by authenticated users"
  ON users FOR SELECT TO authenticated USING (true);
-- SECURITY: WITH CHECK prevents students changing their own role
CREATE POLICY "Users can update own profile (not role)"
  ON users FOR UPDATE TO authenticated USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()));
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Auth trigger can insert users"
  ON users FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- EVENTS: public read, staff can modify
CREATE POLICY "Events are publicly readable"
  ON events FOR SELECT USING (true);
CREATE POLICY "Staff can manage events"
  ON events FOR ALL TO authenticated USING (is_staff());

-- EVENT TOPICS: public read, staff can modify
CREATE POLICY "Topics are publicly readable"
  ON event_topics FOR SELECT USING (true);
CREATE POLICY "Staff can manage topics"
  ON event_topics FOR ALL TO authenticated USING (is_staff());

-- USER_EVENTS: users see own, staff sees all
CREATE POLICY "Users can see own event assignments"
  ON user_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_staff());
CREATE POLICY "Staff can manage assignments"
  ON user_events FOR ALL TO authenticated USING (is_staff());

-- PARTNERSHIPS: visible to partners and staff
CREATE POLICY "Partners and staff can view partnerships"
  ON partnerships FOR SELECT TO authenticated
  USING (partner_a = auth.uid() OR partner_b = auth.uid() OR is_staff());
CREATE POLICY "Staff can manage partnerships"
  ON partnerships FOR ALL TO authenticated USING (is_staff());

-- QUIZ QUESTIONS: readable by all authenticated
CREATE POLICY "Quiz questions readable by authenticated"
  ON quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage quiz questions"
  ON quiz_questions FOR ALL TO authenticated USING (is_staff());

-- QUIZ ATTEMPTS: users see own, staff sees all
CREATE POLICY "Users see own quiz attempts"
  ON quiz_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_staff());
CREATE POLICY "Users can insert own attempts"
  ON quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- TOPIC MASTERY: users see own + partner's, staff sees all
CREATE POLICY "Users see own mastery"
  ON topic_mastery FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_staff());
CREATE POLICY "System can upsert mastery"
  ON topic_mastery FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_staff());

-- STUDY PATHS: users see own, staff sees all
CREATE POLICY "Users see own study paths"
  ON study_paths FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_staff());
CREATE POLICY "Users can manage own study paths"
  ON study_paths FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_staff());

-- STUDY RESOURCES: readable by all authenticated
CREATE POLICY "Resources readable by authenticated"
  ON study_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage resources"
  ON study_resources FOR ALL TO authenticated USING (is_staff());

-- BUILD LOGS: users see own + event partners, staff sees all
CREATE POLICY "Users see own build logs"
  ON build_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_staff());
CREATE POLICY "Users can manage own build logs"
  ON build_logs FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_staff());

-- BUILD ENTRIES: same as build logs (via log ownership)
CREATE POLICY "Users see entries for own logs"
  ON build_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM build_logs WHERE build_logs.id = build_entries.build_log_id
      AND (build_logs.user_id = auth.uid() OR is_staff())
    )
  );
CREATE POLICY "Users can manage entries for own logs"
  ON build_entries FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM build_logs WHERE build_logs.id = build_entries.build_log_id
      AND (build_logs.user_id = auth.uid() OR is_staff())
    )
  );

-- TEST UPLOADS: users see own, staff sees all
CREATE POLICY "Users see own test uploads"
  ON test_uploads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_staff());
CREATE POLICY "Users can insert own uploads"
  ON test_uploads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff can manage all uploads"
  ON test_uploads FOR ALL TO authenticated USING (is_staff());

-- PRACTICE SESSIONS: readable by all authenticated
CREATE POLICY "Practice sessions readable"
  ON practice_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage sessions"
  ON practice_sessions FOR ALL TO authenticated USING (is_staff());

-- ANNOUNCEMENTS: readable by all authenticated
CREATE POLICY "Announcements readable"
  ON announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage announcements"
  ON announcements FOR ALL TO authenticated USING (is_staff());


-- ═══════════════════════════════════════════════════════════════
--  STORAGE BUCKETS
-- ═══════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public) VALUES
  ('build-photos', 'build-photos', false),
  ('test-scans', 'test-scans', false),
  ('resources', 'resources', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (path-isolated: users can only upload/view within their own folder)
CREATE POLICY "Users upload to own build-photos folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'build-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users view own or staff views all build photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'build-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR is_staff()));

CREATE POLICY "Users upload to own test-scans folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'test-scans' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users view own or staff views all test scans"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'test-scans' AND ((storage.foldername(name))[1] = auth.uid()::text OR is_staff()));

CREATE POLICY "Authenticated users can upload resources"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resources');
CREATE POLICY "Authenticated can view resources"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resources');


-- ═══════════════════════════════════════════════════════════════
--  AUTO-CREATE USER PROFILE ON SIGNUP
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, initials, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 1) ||
          LEFT(SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), ' ', 2), 1)),
    'student'  -- default role, admin upgrades manually
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ═══════════════════════════════════════════════════════════════
--  AGGREGATE VIEW: Coach Dashboard Stats
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW coach_dashboard_stats AS
SELECT
  e.id AS event_id,
  e.name AS event_name,
  e.type AS event_type,
  COUNT(DISTINCT ue.user_id) AS assigned_students,
  COALESCE(AVG(qa.score::NUMERIC / NULLIF(qa.total, 0) * 100), 0) AS avg_quiz_score,
  COUNT(DISTINCT qa.id) AS total_quiz_attempts,
  COUNT(DISTINCT bl.id) AS total_build_logs,
  MAX(qa.completed_at) AS last_quiz_activity
FROM events e
LEFT JOIN user_events ue ON ue.event_id = e.id
LEFT JOIN quiz_attempts qa ON qa.event_id = e.id
LEFT JOIN build_logs bl ON bl.event_id = e.id
GROUP BY e.id, e.name, e.type;


-- ═══════════════════════════════════════════════════════════════
--  SEED DATA: Events (from prototype)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO events (name, type, team_size, icon) VALUES
  ('Anatomy & Physiology', 'study', 2, '🫀'),
  ('Disease Detectives', 'study', 2, '🔬'),
  ('Circuit Lab', 'lab', 2, '⚡'),
  ('Codebusters', 'lab', 3, '🔐'),
  ('Heredity', 'study', 2, '🧬'),
  ('Solar System', 'study', 2, '🪐'),
  ('Rocks & Minerals', 'study', 2, '🪨'),
  ('Crime Busters', 'lab', 2, '🕵️'),
  ('Dynamic Planet', 'study', 2, '🌍'),
  ('Entomology', 'study', 2, '🦗'),
  ('Meteorology', 'study', 2, '🌦️'),
  ('Boomilever', 'build', 2, '🏗️'),
  ('Helicopter', 'build', 2, '🚁'),
  ('Hovercraft', 'build', 2, '💨'),
  ('Mission Possible', 'build', 2, '⚙️'),
  ('Scrambler', 'build', 2, '🏎️'),
  ('Experimental Design', 'lab', 3, '🧪'),
  ('Machines', 'lab', 2, '🔧'),
  ('Metric Mastery', 'lab', 2, '📏'),
  ('Potions & Poisons', 'lab', 2, '🧫'),
  ('Water Quality', 'lab', 2, '💧'),
  ('Write It Do It', 'lab', 2, '✍️'),
  ('Remote Sensing', 'lab', 2, '🛰️')
ON CONFLICT (name) DO NOTHING;

-- Seed topics for each event
INSERT INTO event_topics (event_id, name, sort_order) VALUES
  -- Anatomy & Physiology
  (1, 'Nervous System', 1), (1, 'Endocrine System', 2), (1, 'Sensory Organs', 3),
  (1, 'Brain Anatomy', 4), (1, 'Cranial Nerves', 5), (1, 'Spinal Cord', 6),
  (1, 'Hormones & Feedback', 7), (1, 'Neurotransmitters', 8),
  -- Disease Detectives
  (2, 'Epidemiology Basics', 1), (2, 'Outbreak Investigation', 2), (2, 'Study Types', 3),
  (2, 'Attack Rates', 4), (2, 'Bradford Hill Criteria', 5), (2, 'Surveillance', 6),
  (2, 'Epi Curves', 7), (2, 'Odds Ratio & Risk', 8),
  -- Circuit Lab
  (3, 'Ohm''s Law', 1), (3, 'Series Circuits', 2), (3, 'Parallel Circuits', 3),
  (3, 'Kirchhoff''s Laws', 4), (3, 'AC vs DC', 5), (3, 'Magnetism', 6),
  (3, 'Electromagnets', 7), (3, 'LED Characteristics', 8),
  -- Codebusters
  (4, 'Aristocrat Cipher', 1), (4, 'Patristocrat', 2), (4, 'Baconian Cipher', 3),
  (4, 'Morse Code', 4), (4, 'Cryptarithms', 5), (4, 'Porta Cipher', 6),
  (4, 'Columnar Transposition', 7), (4, 'Checkerboard Cipher', 8),
  -- Heredity
  (5, 'Mendelian Genetics', 1), (5, 'Punnett Squares', 2), (5, 'Non-Mendelian Patterns', 3),
  (5, 'DNA Structure', 4), (5, 'Gene Expression', 5), (5, 'Mutations', 6),
  (5, 'Pedigree Analysis', 7), (5, 'Genetic Disorders', 8),
  -- Solar System
  (6, 'Inner Planets', 1), (6, 'Outer Planets', 2), (6, 'Dwarf Planets', 3),
  (6, 'Moons', 4), (6, 'Asteroids & Comets', 5), (6, 'Solar Phenomena', 6),
  (6, 'Space Missions', 7), (6, 'Exoplanets', 8),
  -- Rocks & Minerals
  (7, 'Mineral ID', 1), (7, 'Mohs Hardness', 2), (7, 'Igneous Rocks', 3),
  (7, 'Sedimentary Rocks', 4), (7, 'Metamorphic Rocks', 5), (7, 'Rock Cycle', 6),
  (7, 'Crystal Systems', 7), (7, 'Streak & Luster', 8),
  -- Crime Busters
  (8, 'Chromatography', 1), (8, 'Fingerprints', 2), (8, 'Unknown Solids', 3),
  (8, 'Unknown Liquids', 4), (8, 'Fiber Analysis', 5), (8, 'Hair Analysis', 6),
  (8, 'DNA Evidence', 7), (8, 'Plastics ID', 8),
  -- Dynamic Planet
  (9, 'Plate Tectonics', 1), (9, 'Earthquakes', 2), (9, 'Volcanoes', 3),
  (9, 'Glaciation', 4), (9, 'Weathering', 5), (9, 'Erosion', 6),
  (9, 'Topographic Maps', 7), (9, 'Landforms', 8),
  -- Entomology
  (10, 'Insect Orders', 1), (10, 'Anatomy', 2), (10, 'Life Cycles', 3),
  (10, 'Taxonomy', 4), (10, 'Ecological Roles', 5), (10, 'Pest Management', 6),
  (10, 'Specimen ID', 7), (10, 'Adaptations', 8),
  -- Meteorology
  (11, 'Atmosphere Layers', 1), (11, 'Cloud Types', 2), (11, 'Weather Maps', 3),
  (11, 'Fronts & Systems', 4), (11, 'Severe Weather', 5), (11, 'Climate Zones', 6),
  (11, 'Instruments', 7), (11, 'Data Interpretation', 8),
  -- Boomilever
  (12, 'Wood Selection', 1), (12, 'Joint Design', 2), (12, 'Load Distribution', 3),
  (12, 'Testing Procedure', 4), (12, 'Efficiency Calc', 5), (12, 'Adhesive Types', 6),
  -- Helicopter
  (13, 'Blade Design', 1), (13, 'Weight Balance', 2), (13, 'Flight Duration', 3),
  (13, 'Materials', 4), (13, 'Construction', 5), (13, 'Testing', 6),
  -- Hovercraft
  (14, 'Thrust Design', 1), (14, 'Skirt Design', 2), (14, 'Motor Selection', 3),
  (14, 'Weight Distribution', 4), (14, 'Track Navigation', 5), (14, 'Testing', 6),
  -- Mission Possible
  (15, 'Action Sequence', 1), (15, 'Energy Transfers', 2), (15, 'Device Design', 3),
  (15, 'Timing', 4), (15, 'Reliability', 5), (15, 'Documentation', 6),
  -- Scrambler
  (16, 'Propulsion', 1), (16, 'Braking System', 2), (16, 'Accuracy', 3),
  (16, 'Vehicle Design', 4), (16, 'Egg Protection', 5), (16, 'Testing', 6),
  -- Experimental Design
  (17, 'Variables', 1), (17, 'Hypothesis', 2), (17, 'Data Collection', 3),
  (17, 'Analysis', 4), (17, 'Conclusions', 5), (17, 'Presentation', 6),
  -- Machines
  (18, 'Simple Machines', 1), (18, 'Mechanical Advantage', 2), (18, 'Efficiency', 3),
  (18, 'Lever Types', 4), (18, 'Pulleys', 5), (18, 'Inclined Planes', 6),
  -- Metric Mastery
  (19, 'Length', 1), (19, 'Mass', 2), (19, 'Volume', 3),
  (19, 'Temperature', 4), (19, 'Conversions', 5), (19, 'Measurement Technique', 6),
  -- Potions & Poisons
  (20, 'Chemical Reactions', 1), (20, 'Safety', 2), (20, 'Indicators', 3),
  (20, 'Concentrations', 4), (20, 'Lab Techniques', 5), (20, 'Toxicology Basics', 6),
  -- Water Quality
  (21, 'pH Testing', 1), (21, 'Dissolved O2', 2), (21, 'Turbidity', 3),
  (21, 'Nitrates', 4), (21, 'Macroinvertebrates', 5), (21, 'Water Treatment', 6),
  -- Write It Do It
  (22, 'Descriptive Writing', 1), (22, 'Spatial Awareness', 2),
  (22, 'Technical Vocab', 3), (22, 'Assembly Skills', 4),
  -- Remote Sensing
  (23, 'Satellite Imagery', 1), (23, 'EM Spectrum', 2), (23, 'Image Interpretation', 3),
  (23, 'GIS Basics', 4), (23, 'Map Projections', 5), (23, 'Data Analysis', 6)
ON CONFLICT (event_id, name) DO NOTHING;


-- Seed quiz questions from prototype question bank (skip if already seeded)
-- Wrapped in DO block to make it idempotent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM quiz_questions LIMIT 1) THEN
    INSERT INTO quiz_questions (event_id, topic, question, options, correct_index, explanation, difficulty) VALUES
  -- Anatomy & Physiology
  (1, 'Cranial Nerves', 'Which cranial nerve is responsible for the sense of smell?', '["Olfactory (I)", "Optic (II)", "Trigeminal (V)", "Vagus (X)"]', 0, 'Cranial nerve I (Olfactory) carries sensory information for smell from the nasal cavity to the brain.', 'medium'),
  (1, 'Endocrine System', 'The adrenal glands are located on top of which organs?', '["Lungs", "Kidneys", "Liver", "Pancreas"]', 1, 'The adrenal (suprarenal) glands sit atop the kidneys and produce hormones including cortisol and adrenaline.', 'easy'),
  (1, 'Neurotransmitters', 'What neurotransmitter is primarily associated with the fight or flight response?', '["Serotonin", "Dopamine", "Norepinephrine", "GABA"]', 2, 'Norepinephrine (noradrenaline) is the primary neurotransmitter of the sympathetic nervous system.', 'medium'),
  (1, 'Hormones & Feedback', 'The hypothalamus connects the nervous system to the endocrine system via which gland?', '["Thyroid", "Pituitary", "Pineal", "Thymus"]', 1, 'The hypothalamus communicates with the pituitary gland, often called the master gland.', 'medium'),
  (1, 'Brain Anatomy', 'Which part of the brain is responsible for coordinating voluntary movement and balance?', '["Cerebrum", "Cerebellum", "Medulla oblongata", "Thalamus"]', 1, 'The cerebellum coordinates voluntary movements, balance, and motor learning.', 'easy'),
  (1, 'Sensory Organs', 'Rods and cones are photoreceptor cells found in which layer of the eye?', '["Cornea", "Iris", "Retina", "Lens"]', 2, 'The retina contains rods (low-light vision) and cones (color vision).', 'easy'),
  (1, 'Hormones & Feedback', 'A positive feedback loop in the body is best exemplified by:', '["Blood glucose regulation", "Body temperature regulation", "Blood clotting cascade", "Blood pressure regulation"]', 2, 'Blood clotting is a positive feedback loop — once clotting begins, it signals for more clotting factors.', 'hard'),
  (1, 'Spinal Cord', 'The spinal cord ends at approximately which vertebral level in adults?', '["T12", "L1-L2", "L5", "S1"]', 1, 'The spinal cord typically ends at L1-L2, forming the conus medullaris.', 'hard'),
  -- Disease Detectives
  (2, 'Attack Rates', 'An attack rate is calculated by dividing the number of ill people by:', '["Total population", "Number exposed", "Number not ill", "Number of cases"]', 1, 'Attack rate = (Number of ill / Number exposed) x 100.', 'easy'),
  (2, 'Study Types', 'Which study compares people with a disease to people without it, looking backward for exposures?', '["Cohort study", "Case-control study", "Cross-sectional study", "Randomized controlled trial"]', 1, 'Case-control studies start with cases and controls, then look backward to compare exposures.', 'medium'),
  (2, 'Odds Ratio & Risk', 'An odds ratio greater than 1 indicates:', '["No association", "Protective factor", "Increased risk", "Decreased exposure"]', 2, 'OR > 1 means the exposure is associated with higher odds of disease.', 'medium'),
  (2, 'Epi Curves', 'What does an epidemic curve primarily show?', '["Geographic spread", "Case count over time", "Age distribution", "Mortality rate"]', 1, 'An epi curve is a histogram showing new cases over time.', 'easy'),
  (2, 'Bradford Hill Criteria', 'Which Bradford Hill criterion refers to the larger the exposure, the greater the disease risk?', '["Consistency", "Biological gradient", "Temporality", "Plausibility"]', 1, 'Biological gradient means greater exposure leads to greater incidence of disease.', 'hard'),
  (2, 'Surveillance', 'Active surveillance differs from passive surveillance in that active surveillance:', '["Relies on providers to report", "Involves health departments seeking cases", "Is less expensive", "Is less accurate"]', 1, 'Active surveillance involves proactively searching for cases.', 'medium'),
  -- Heredity
  (5, 'Punnett Squares', 'In Aa x Aa, what fraction of offspring are homozygous recessive?', '["1/4", "1/2", "3/4", "1/3"]', 0, 'Aa x Aa produces AA (1/4), Aa (2/4), aa (1/4).', 'easy'),
  (5, 'Non-Mendelian Patterns', 'Codominance is best illustrated by:', '["Pink flowers from red x white", "AB blood type", "Carrier of sickle cell", "Incomplete dominance of height"]', 1, 'In codominance, both alleles are fully expressed. AB blood type shows both antigens.', 'medium'),
  (5, 'DNA Structure', 'Which nitrogen base is found in RNA but NOT in DNA?', '["Adenine", "Uracil", "Guanine", "Cytosine"]', 1, 'RNA uses Uracil instead of Thymine.', 'easy'),
  (5, 'Pedigree Analysis', 'A trait in every generation affecting both sexes equally suggests:', '["Autosomal recessive", "Autosomal dominant", "X-linked recessive", "X-linked dominant"]', 1, 'Autosomal dominant traits appear in every generation and affect both sexes equally.', 'medium'),
  (5, 'Genetic Disorders', 'Sickle cell disease is caused by a mutation in the gene encoding:', '["Insulin", "Hemoglobin", "Collagen", "Myosin"]', 1, 'Sickle cell results from a point mutation in the hemoglobin gene.', 'easy'),
  (5, 'Gene Expression', 'Which meiosis process exchanges segments between homologous chromosomes?', '["Mitosis", "Crossing over", "Cytokinesis", "DNA replication"]', 1, 'Crossing over during prophase I creates new allele combinations.', 'medium'),
  -- Solar System
  (6, 'Outer Planets', 'Which planet has the Great Red Spot?', '["Saturn", "Jupiter", "Neptune", "Mars"]', 1, 'Jupiter''s Great Red Spot is a massive anticyclonic storm.', 'easy'),
  (6, 'Asteroids & Comets', 'The asteroid belt is located between:', '["Earth and Mars", "Mars and Jupiter", "Jupiter and Saturn", "Venus and Earth"]', 1, 'The main asteroid belt lies between Mars and Jupiter.', 'easy'),
  (6, 'Moons', 'Which Jupiter moon likely has a subsurface ocean?', '["Io", "Ganymede", "Europa", "Callisto"]', 2, 'Europa has a thick ice shell covering a liquid water ocean.', 'medium'),
  (6, 'Asteroids & Comets', 'A comet''s tail always points:', '["Toward the Sun", "Away from the Sun", "In direction of travel", "Toward Earth"]', 1, 'Solar wind pushes cometary material away from the Sun.', 'medium'),
  (6, 'Outer Planets', 'Which planet rotates on its side (~98 degree tilt)?', '["Neptune", "Saturn", "Uranus", "Pluto"]', 2, 'Uranus has an extreme axial tilt of ~98 degrees.', 'medium'),
  (6, 'Dwarf Planets', 'The Kuiper Belt extends from Neptune''s orbit to approximately:', '["50 AU", "100 AU", "500 AU", "1000 AU"]', 0, 'The Kuiper Belt extends from ~30 AU to approximately 50 AU.', 'hard'),
  -- Circuit Lab
  (3, 'Ohm''s Law', 'If voltage doubles and resistance stays the same, current will:', '["Halve", "Double", "Stay the same", "Quadruple"]', 1, 'V = IR, so I = V/R. Double V with constant R means double I.', 'easy'),
  (3, 'Series Circuits', 'Three 10 ohm resistors in series have total resistance of:', '["3.33 ohm", "10 ohm", "30 ohm", "100 ohm"]', 2, 'In series: R_total = R1 + R2 + R3 = 30 ohm.', 'easy'),
  (3, 'Parallel Circuits', 'Two identical 20 ohm resistors in parallel have total resistance of:', '["40 ohm", "20 ohm", "10 ohm", "5 ohm"]', 2, 'For identical parallel resistors: R_total = R/n = 20/2 = 10 ohm.', 'easy'),
  (3, 'Kirchhoff''s Laws', 'Kirchhoff''s Current Law states that at any junction:', '["Voltage in = out", "Current in = out", "Power is conserved", "Resistance is minimized"]', 1, 'KCL: Sum of currents entering a junction equals sum leaving.', 'medium'),
  (3, 'LED Characteristics', 'An LED only works when connected with:', '["Any polarity", "Correct polarity (forward bias)", "Reverse polarity", "AC current only"]', 1, 'LEDs are diodes — they only conduct in one direction.', 'medium'),
  -- Rocks & Minerals
  (7, 'Mohs Hardness', 'On the Mohs scale, which mineral has hardness 7?', '["Feldspar", "Quartz", "Topaz", "Calcite"]', 1, 'Mohs scale: 7 = Quartz.', 'easy'),
  (7, 'Igneous Rocks', 'Granite is classified as:', '["Sedimentary", "Metamorphic", "Intrusive igneous", "Extrusive igneous"]', 2, 'Granite forms from slowly cooling magma underground (intrusive).', 'easy'),
  (7, 'Streak & Luster', 'The streak of hematite is characteristically:', '["White", "Black", "Red-brown", "Yellow"]', 2, 'Hematite always produces a red-brown streak.', 'medium'),
  (7, 'Sedimentary Rocks', 'Which rock forms from cementation of sand-sized grains?', '["Shale", "Limestone", "Sandstone", "Conglomerate"]', 2, 'Sandstone forms from compacted and cemented sand grains.', 'easy'),
  (7, 'Metamorphic Rocks', 'Marble forms from metamorphism of:', '["Sandstone", "Shale", "Limestone", "Granite"]', 2, 'Marble forms when limestone undergoes heat and pressure.', 'medium');
  END IF;
END $$;
