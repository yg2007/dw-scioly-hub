-- ═══════════════════════════════════════════════════════════════
--  Migration 005: Direct Add Member RPC
--  Allows admin to add a member directly to the roster
--  without requiring the person to sign in first.
--  Uses SECURITY DEFINER to bypass RLS and FK constraints.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION add_team_member(
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'student',
  p_event_ids INT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_new_user_id UUID;
  v_initials TEXT;
  v_result JSONB;
BEGIN
  -- Check caller is admin
  SELECT role INTO v_caller_role FROM users WHERE id = auth.uid();
  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Validate inputs
  IF p_email IS NULL OR p_email = '' OR position('@' in p_email) = 0 THEN
    RAISE EXCEPTION 'Valid email is required';
  END IF;
  IF p_full_name IS NULL OR length(trim(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'Full name is required (min 2 characters)';
  END IF;
  IF p_role NOT IN ('student', 'coach') THEN
    RAISE EXCEPTION 'Role must be student or coach';
  END IF;

  -- Check if email already exists in users table
  IF EXISTS (SELECT 1 FROM users WHERE email = lower(trim(p_email))) THEN
    RAISE EXCEPTION 'This email is already on the team';
  END IF;

  -- Generate initials
  v_initials := upper(
    left(trim(p_full_name), 1) ||
    coalesce(left(split_part(trim(p_full_name), ' ', 2), 1), '')
  );

  -- Check if auth user already exists (they may have signed in before)
  SELECT id INTO v_new_user_id FROM auth.users WHERE email = lower(trim(p_email));

  IF v_new_user_id IS NULL THEN
    -- Create a new auth user with a random password
    -- They'll sign in with Google later which links via email
    v_new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      aud, role
    ) VALUES (
      v_new_user_id,
      '00000000-0000-0000-0000-000000000000',
      lower(trim(p_email)),
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', trim(p_full_name)),
      'authenticated',
      'authenticated'
    );
  END IF;

  -- Create profile in users table
  INSERT INTO users (id, email, full_name, initials, role)
  VALUES (v_new_user_id, lower(trim(p_email)), trim(p_full_name), v_initials, p_role::user_role)
  ON CONFLICT (id) DO UPDATE SET
    full_name = trim(p_full_name),
    role = p_role::user_role,
    initials = v_initials;

  -- Assign events
  IF array_length(p_event_ids, 1) > 0 THEN
    INSERT INTO user_events (user_id, event_id)
    SELECT v_new_user_id, unnest(p_event_ids)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Return the new member
  SELECT jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'full_name', u.full_name,
    'initials', u.initials,
    'role', u.role,
    'avatar_color', u.avatar_color,
    'eventIds', coalesce(
      (SELECT array_agg(event_id) FROM user_events WHERE user_id = u.id),
      '{}'::int[]
    )
  ) INTO v_result
  FROM users u WHERE u.id = v_new_user_id;

  RETURN v_result;
END;
$$;
