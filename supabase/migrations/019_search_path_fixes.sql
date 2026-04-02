-- ═══════════════════════════════════════════════════════════════
--  Migration 019: Fix Function Search Paths & Materialized View
--
--  Resolves Supabase linter warnings:
--  - 10x function_search_path_mutable: adds SET search_path = ''
--  - 1x materialized_view_in_api: revokes public access
--
--  Setting search_path = '' prevents search-path injection attacks
--  by requiring all table references to be schema-qualified.
--  Since these functions already use unqualified names that resolve
--  to the public schema, we use SET search_path = 'public' which
--  is safe (the schema is fixed, not mutable by the caller).
-- ═══════════════════════════════════════════════════════════════


-- ─── 1. is_staff() ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('coach', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';


-- ─── 2. is_admin() ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';


-- ─── 3. set_updated_at() ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';


-- ─── 4. set_updated_at_last_activity() ───────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';


-- ─── 5. prevent_duplicate_quiz_attempts() ────────────────────
CREATE OR REPLACE FUNCTION public.prevent_duplicate_quiz_attempts()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INT;
BEGIN
  SELECT COUNT(*) INTO existing_count
  FROM public.quiz_attempts
  WHERE user_id = NEW.user_id
    AND event_id = NEW.event_id
    AND completed_at IS NULL
    AND id != COALESCE(NEW.id, 0);

  IF existing_count > 0 THEN
    RAISE EXCEPTION 'User already has an incomplete quiz attempt for this event';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';


-- ─── 6. update_suggestion_vote_count() ───────────────────────
CREATE OR REPLACE FUNCTION public.update_suggestion_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.suggestions
    SET vote_count = (
      SELECT COUNT(*) FROM public.suggestion_votes WHERE suggestion_id = NEW.suggestion_id
    )
    WHERE id = NEW.suggestion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.suggestions
    SET vote_count = (
      SELECT COUNT(*) FROM public.suggestion_votes WHERE suggestion_id = OLD.suggestion_id
    )
    WHERE id = OLD.suggestion_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ─── 7. handle_new_user() ────────────────────────────────────
-- This is a complex function — we need to read the full original.
-- Re-create with search_path set, keeping SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_invitation RECORD;
  v_full_name  TEXT;
  v_role       TEXT;
  v_event_ids  INT[];
BEGIN
  -- Extract name from auth metadata
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );

  -- Check for a pending invitation
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
  LIMIT 1;

  IF v_invitation IS NOT NULL THEN
    v_role      := v_invitation.role;
    v_event_ids := v_invitation.event_ids;

    -- Mark invitation as accepted
    UPDATE public.invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_invitation.id;
  ELSE
    v_role      := 'student';
    v_event_ids := '{}';
  END IF;

  -- Insert the user row
  INSERT INTO public.users (id, email, full_name, role, initials, avatar_color)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_role,
    UPPER(LEFT(v_full_name, 1)) || UPPER(LEFT(SPLIT_PART(v_full_name, ' ', 2), 1)),
    (ARRAY['#2A9D8F','#E76F51','#C0652A','#7C3AED','#0EA5E9','#EC4899','#F59E0B','#10B981'])[FLOOR(RANDOM()*8)+1]
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

  -- Assign events from invitation
  IF array_length(v_event_ids, 1) > 0 THEN
    INSERT INTO public.user_events (user_id, event_id)
    SELECT NEW.id, unnest(v_event_ids)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ─── 8. add_team_member() ────────────────────────────────────
-- Re-create with search_path set, keeping SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.add_team_member(
  p_email     TEXT,
  p_full_name TEXT,
  p_role      TEXT DEFAULT 'student',
  p_event_ids INT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing_user  RECORD;
  v_existing_invite RECORD;
  v_initials       TEXT;
  v_color          TEXT;
  v_invite_id      INT;
BEGIN
  -- Check if user already exists
  SELECT id, email, full_name, role INTO v_existing_user
  FROM public.users
  WHERE LOWER(email) = LOWER(p_email);

  IF v_existing_user IS NOT NULL THEN
    -- User exists: just assign events
    IF array_length(p_event_ids, 1) > 0 THEN
      INSERT INTO public.user_events (user_id, event_id)
      SELECT v_existing_user.id, unnest(p_event_ids)
      ON CONFLICT DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
      'status', 'existing',
      'user_id', v_existing_user.id,
      'message', 'User already exists. Events updated.'
    );
  END IF;

  -- Check for pending invitation
  SELECT id INTO v_existing_invite
  FROM public.invitations
  WHERE LOWER(email) = LOWER(p_email)
    AND status = 'pending';

  IF v_existing_invite IS NOT NULL THEN
    -- Update the existing invitation
    UPDATE public.invitations
    SET full_name = p_full_name,
        role = p_role,
        event_ids = p_event_ids
    WHERE id = v_existing_invite.id;

    RETURN jsonb_build_object(
      'status', 'updated',
      'invite_id', v_existing_invite.id,
      'message', 'Pending invitation updated.'
    );
  END IF;

  -- Create new invitation
  INSERT INTO public.invitations (email, full_name, role, event_ids, status, created_at)
  VALUES (p_email, p_full_name, p_role, p_event_ids, 'pending', now())
  RETURNING id INTO v_invite_id;

  RETURN jsonb_build_object(
    'status', 'invited',
    'invite_id', v_invite_id,
    'message', 'Invitation created. User will be set up on first sign-in.'
  );
END;
$$;


-- ─── 9. refresh_partner_synergy_scores() ─────────────────────
CREATE OR REPLACE FUNCTION public.refresh_partner_synergy_scores()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.partner_synergy_scores;
END;
$$ LANGUAGE plpgsql SET search_path = '';


-- ─── 10. adaptive_quiz_questions() ───────────────────────────
-- This is a large function. Re-create with search_path set.
CREATE OR REPLACE FUNCTION public.adaptive_quiz_questions(
  p_user_id  UUID,
  p_event_id INT,
  p_count    INT DEFAULT 10
)
RETURNS TABLE (
  id                INT,
  question          TEXT,
  options           JSONB,
  correct_index     INT,
  correct_answer_text TEXT,
  topic             TEXT,
  subtopic          TEXT,
  difficulty        quiz_difficulty,
  question_type     TEXT,
  explanation       TEXT,
  points            INT,
  source_tournament TEXT
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_weak_count  INT;
  v_mid_count   INT;
  v_strong_count INT;
BEGIN
  -- Determine counts: 60% weak, 30% mid, 10% strong
  v_weak_count   := GREATEST(1, ROUND(p_count * 0.6));
  v_mid_count    := GREATEST(1, ROUND(p_count * 0.3));
  v_strong_count := p_count - v_weak_count - v_mid_count;

  RETURN QUERY
  WITH user_topic_scores AS (
    SELECT tm.topic, tm.score
    FROM public.topic_mastery tm
    WHERE tm.user_id = p_user_id AND tm.event_id = p_event_id
  ),
  categorized_topics AS (
    SELECT
      uts.topic,
      CASE
        WHEN uts.score < 60  THEN 'weak'
        WHEN uts.score < 80  THEN 'mid'
        ELSE 'strong'
      END AS bucket
    FROM user_topic_scores uts
  ),
  due_questions AS (
    SELECT qs.question_id
    FROM public.question_schedule qs
    WHERE qs.user_id = p_user_id
      AND qs.event_id = p_event_id
      AND qs.next_review_at <= now()
  ),
  scored_questions AS (
    SELECT
      qq.id,
      qq.question,
      qq.options,
      qq.correct_index,
      qq.correct_answer_text,
      qq.topic,
      qq.subtopic,
      qq.difficulty,
      qq.question_type,
      qq.explanation,
      qq.points,
      qq.source_tournament,
      COALESCE(ct.bucket, 'weak') AS bucket,
      CASE WHEN dq.question_id IS NOT NULL THEN 1 ELSE 0 END AS is_due,
      RANDOM() AS rand
    FROM public.quiz_questions qq
    LEFT JOIN categorized_topics ct ON ct.topic = qq.topic
    LEFT JOIN due_questions dq ON dq.question_id = qq.id
    WHERE qq.event_id = p_event_id
  )
  (
    SELECT sq.id, sq.question, sq.options, sq.correct_index, sq.correct_answer_text,
           sq.topic, sq.subtopic, sq.difficulty, sq.question_type, sq.explanation,
           sq.points, sq.source_tournament
    FROM scored_questions sq
    WHERE sq.bucket = 'weak'
    ORDER BY sq.is_due DESC, sq.rand
    LIMIT v_weak_count
  )
  UNION ALL
  (
    SELECT sq.id, sq.question, sq.options, sq.correct_index, sq.correct_answer_text,
           sq.topic, sq.subtopic, sq.difficulty, sq.question_type, sq.explanation,
           sq.points, sq.source_tournament
    FROM scored_questions sq
    WHERE sq.bucket = 'mid'
    ORDER BY sq.is_due DESC, sq.rand
    LIMIT v_mid_count
  )
  UNION ALL
  (
    SELECT sq.id, sq.question, sq.options, sq.correct_index, sq.correct_answer_text,
           sq.topic, sq.subtopic, sq.difficulty, sq.question_type, sq.explanation,
           sq.points, sq.source_tournament
    FROM scored_questions sq
    WHERE sq.bucket = 'strong'
    ORDER BY sq.is_due DESC, sq.rand
    LIMIT v_strong_count
  );
END;
$$;


-- ─── 11. Fix materialized view API exposure ──────────────────
-- Revoke direct access from anon and authenticated roles.
-- Data should be accessed through the refresh function, not directly.
REVOKE SELECT ON public.partner_synergy_scores FROM anon;
REVOKE SELECT ON public.partner_synergy_scores FROM authenticated;

-- Grant only to staff via the refresh function (already SECURITY DEFINER-free)
-- If coaches need to read it directly, grant to authenticated and rely on
-- application-level filtering. Uncomment below if needed:
-- GRANT SELECT ON public.partner_synergy_scores TO authenticated;
