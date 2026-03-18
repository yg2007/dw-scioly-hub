-- ═══════════════════════════════════════════════════════════════
--  Invitation-based onboarding
--
--  Flow:
--  1. Head coach creates invite (name, email, role, events)
--  2. System sends email with sign-in link
--  3. Invitee signs in with Google OAuth
--  4. on_auth_user_created trigger matches email → sets role + events
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

CREATE TABLE invitations (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  event_ids INT[] DEFAULT '{}',          -- pre-assigned events
  invited_by UUID REFERENCES users(id),
  status invitation_status NOT NULL DEFAULT 'pending',
  token UUID DEFAULT gen_random_uuid(),   -- unique link token
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, status)                   -- one pending invite per email
);

CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);

-- RLS: only admins can manage invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations"
  ON invitations FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Staff can view invitations"
  ON invitations FOR SELECT TO authenticated USING (is_staff());


-- ═══════════════════════════════════════════════════════════════
--  Replace the signup trigger to match invitations
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  inv RECORD;
BEGIN
  -- Check if there's a pending invitation for this email
  SELECT * INTO inv
  FROM public.invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF inv IS NOT NULL THEN
    -- Create user from invitation (with pre-assigned role)
    INSERT INTO public.users (id, email, full_name, initials, role)
    VALUES (
      NEW.id,
      NEW.email,
      inv.full_name,
      UPPER(
        LEFT(inv.full_name, 1) ||
        COALESCE(LEFT(SPLIT_PART(inv.full_name, ' ', 2), 1), '')
      ),
      inv.role
    );

    -- Auto-assign pre-selected events
    IF array_length(inv.event_ids, 1) > 0 THEN
      INSERT INTO public.user_events (user_id, event_id)
      SELECT NEW.id, unnest(inv.event_ids);
    END IF;

    -- Mark invitation as accepted
    UPDATE public.invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = inv.id;

  ELSE
    -- No invitation — create as student with no events (coach must assign)
    INSERT INTO public.users (id, email, full_name, initials, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      UPPER(
        LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 1) ||
        COALESCE(
          LEFT(SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2), 1),
          ''
        )
      ),
      'student'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════
--  Helper view: Roster with invite status
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW team_roster AS
SELECT
  u.id,
  u.email,
  u.full_name,
  u.initials,
  u.role,
  u.avatar_color,
  u.created_at,
  ARRAY_AGG(DISTINCT ue.event_id) FILTER (WHERE ue.event_id IS NOT NULL) AS event_ids,
  'active' AS status
FROM users u
LEFT JOIN user_events ue ON ue.user_id = u.id
GROUP BY u.id, u.email, u.full_name, u.initials, u.role, u.avatar_color, u.created_at

UNION ALL

SELECT
  NULL AS id,
  i.email,
  i.full_name,
  NULL AS initials,
  i.role,
  NULL AS avatar_color,
  i.created_at,
  i.event_ids,
  i.status::text
FROM invitations i
WHERE i.status = 'pending';
