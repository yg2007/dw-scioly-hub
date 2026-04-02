import { useState, useEffect, useCallback } from "react";
import { supabase, resilientQuery } from "../lib/supabase";

/**
 * Hook for head coach team management:
 * - View full roster (active users + pending invites)
 * - Send invitations (coach or student)
 * - Assign/unassign events
 * - Change roles
 */
export function useTeamManagement() {
  const [roster, setRoster] = useState([]);      // active users
  const [invitations, setInvitations] = useState([]); // pending invites
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Load roster + invites + events ────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, invitesRes, eventsRes] = await Promise.all([
        resilientQuery(() =>
          supabase.from("users").select("*, user_events(event_id)").order("role").order("full_name")
        ),
        resilientQuery(() =>
          supabase.from("invitations").select("*").eq("status", "pending").order("created_at", { ascending: false })
        ),
        resilientQuery(() =>
          supabase.from("events").select("id, name, type, team_size, icon").order("id")
        ),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (invitesRes.error) throw invitesRes.error;
      if (eventsRes.error) throw eventsRes.error;

      setRoster(
        usersRes.data.map((u) => ({
          ...u,
          eventIds: (u.user_events || []).map((ue) => ue.event_id),
        }))
      );
      setInvitations(invitesRes.data);
      setEvents(eventsRes.data);
    } catch (err) {
      console.error("useTeamManagement load:", err);
      setError("Failed to load team data");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Send invitation ───────────────────────────────
  // Calls the send-invite Edge Function (creates record + sends email).
  // Falls back to direct DB insert if Edge Function isn't deployed.
  const sendInvite = useCallback(async ({ fullName, email, role, eventIds = [] }) => {
    try {
      // Try Edge Function first (creates record + sends email via Resend)
      const { data, error: fnErr } = await supabase.functions.invoke("send-invite", {
        body: { fullName, email, role, eventIds },
      });

      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      setInvitations((prev) => [
        {
          id: data.invitation.id,
          email: data.invitation.email,
          full_name: data.invitation.fullName,
          role: data.invitation.role,
          event_ids: data.invitation.eventIds,
          status: "pending",
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      return { ...data.invitation, emailSent: data.emailSent };
    } catch (edgeFnErr) {
      console.warn("Edge Function unavailable, falling back to direct insert:", edgeFnErr.message);

      // Fallback: insert directly (no email sent)
      const { data: existing } = await supabase
        .from("users").select("id").eq("email", email.toLowerCase()).maybeSingle();
      if (existing) throw new Error(`${email} is already on the team`);

      const { data: existingInvite } = await supabase
        .from("invitations").select("id").eq("email", email.toLowerCase()).eq("status", "pending").maybeSingle();
      if (existingInvite) throw new Error(`A pending invite already exists for ${email}`);

      const { data, error: err } = await supabase
        .from("invitations")
        .insert({ email: email.toLowerCase(), full_name: fullName, role, event_ids: eventIds })
        .select().single();
      if (err) throw err;

      setInvitations((prev) => [data, ...prev]);
      return { ...data, emailSent: false };
    }
  }, []);

  // ─── Add member directly (no invite/email) ─────────
  // Uses the add-member Edge Function which has service role access
  // to create both the auth.users row and the public.users profile.
  // Includes a 15 s timeout so the UI spinner never hangs forever.
  const addMemberDirectly = useCallback(async ({ fullName, email, role, eventIds = [] }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let data, fnErr;
    try {
      const res = await supabase.functions.invoke("add-member", {
        body: { fullName, email, role, eventIds },
      });
      data = res.data;
      fnErr = res.error;
    } catch (networkErr) {
      clearTimeout(timeout);
      // AbortController fires a DOMException with name "AbortError"
      if (networkErr?.name === "AbortError") {
        throw new Error("Request timed out — the server took too long. Try again.");
      }
      throw new Error(networkErr?.message || "Network error while adding member.");
    }
    clearTimeout(timeout);

    // supabase.functions.invoke can return error in multiple ways:
    // 1. fnErr is set (network error or non-2xx status)
    // 2. data contains an { error: "..." } field
    // When the function returns non-2xx, data may still have the error JSON
    if (fnErr) {
      const msg = data?.error || fnErr.message || "Failed to add member";
      console.error("add-member Edge Function error:", { fnErr, data });
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);

    const member = data?.member;
    if (!member) throw new Error("No member data returned. Check Edge Function logs.");

    setRoster((prev) => [
      ...prev,
      {
        ...member,
        eventIds: member.eventIds || eventIds,
      },
    ]);

    return member;
  }, []);

  // ─── Revoke invitation ─────────────────────────────
  const revokeInvite = useCallback(async (inviteId) => {
    const { error: err } = await supabase
      .from("invitations")
      .update({ status: "revoked" })
      .eq("id", inviteId);
    if (err) throw err;
    setInvitations((prev) => prev.filter((i) => i.id !== inviteId));
  }, []);

  // ─── Resend invitation ─────────────────────────────
  const resendInvite = useCallback(async (invite) => {
    // Revoke old, send new
    await revokeInvite(invite.id);
    return sendInvite({
      fullName: invite.full_name,
      email: invite.email,
      role: invite.role,
      eventIds: invite.event_ids || [],
    });
  }, [revokeInvite, sendInvite]);

  // ─── Assign event to user ──────────────────────────
  const assignEvent = useCallback(async (userId, eventId) => {
    const { error: err } = await supabase
      .from("user_events")
      .insert({ user_id: userId, event_id: eventId });
    if (err) throw err;
    setRoster((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, eventIds: [...u.eventIds, eventId] } : u
      )
    );
  }, []);

  // ─── Unassign event from user ──────────────────────
  const unassignEvent = useCallback(async (userId, eventId) => {
    const { error: err, count } = await supabase
      .from("user_events")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("event_id", eventId);
    if (err) throw err;
    // count === 0 means RLS silently blocked the delete (no permission)
    if (count === 0) throw new Error("Could not remove event assignment — check database permissions.");
    setRoster((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, eventIds: u.eventIds.filter((id) => id !== eventId) }
          : u
      )
    );
  }, []);

  // ─── Change user role ──────────────────────────────
  const changeRole = useCallback(async (userId, newRole) => {
    const { error: err } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", userId);
    if (err) throw err;
    setRoster((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  }, []);

  // ─── Set alumni status ─────────────────────────────
  // Marks a student as alumni (graduated / inactive) or restores them to active.
  // All history is preserved; only the is_alumni flag changes.
  const setAlumni = useCallback(async (userId, isAlumni) => {
    const { error: err } = await supabase
      .from("users")
      .update({ is_alumni: isAlumni })
      .eq("id", userId);
    if (err) throw err;
    setRoster((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_alumni: isAlumni } : u))
    );
  }, []);

  // ─── Update email address ──────────────────────────
  const updateEmail = useCallback(async (userId, newEmail) => {
    const clean = newEmail.trim().toLowerCase();
    // Basic format check before hitting the DB
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      throw new Error("Please enter a valid email address.");
    }
    // Check no one else already has that address
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", clean)
      .neq("id", userId)
      .maybeSingle();
    if (existing) throw new Error(`${clean} is already in use by another member.`);

    const { error: err } = await supabase
      .from("users")
      .update({ email: clean })
      .eq("id", userId);
    if (err) throw err;
    setRoster((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, email: clean } : u))
    );
  }, []);

  // ─── Remove user from team ─────────────────────────
  // Clean up all related records first, then delete the user profile.
  // Note: we don't delete the auth.users row — only the public profile.
  // If the person signs in again, the trigger will recreate their profile.
  const removeUser = useCallback(async (userId) => {
    // Delete from all tables that reference users(id)
    await Promise.all([
      supabase.from("user_events").delete().eq("user_id", userId),
      supabase.from("partnerships").delete().or(`partner_a.eq.${userId},partner_b.eq.${userId}`),
      supabase.from("quiz_attempts").delete().eq("user_id", userId),
      supabase.from("topic_mastery").delete().eq("user_id", userId),
      supabase.from("study_paths").delete().eq("user_id", userId),
      supabase.from("build_logs").delete().eq("user_id", userId),
      supabase.from("test_uploads").delete().eq("user_id", userId),
      supabase.from("competition_team_assignments").delete().eq("user_id", userId),
    ]);

    const { error: err } = await supabase.from("users").delete().eq("id", userId);
    if (err) throw err;
    setRoster((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  // ─── Silent refresh (no loading spinner) ──────────
  // Used after add/edit operations to sync with server without
  // disrupting the UI with a full loading state.
  const silentRefresh = useCallback(async () => {
    try {
      const [usersRes, invitesRes] = await Promise.all([
        resilientQuery(() =>
          supabase.from("users").select("*, user_events(event_id)").order("role").order("full_name")
        ),
        resilientQuery(() =>
          supabase.from("invitations").select("*").eq("status", "pending").order("created_at", { ascending: false })
        ),
      ]);
      if (!usersRes.error) {
        setRoster(
          usersRes.data.map((u) => ({
            ...u,
            eventIds: (u.user_events || []).map((ue) => ue.event_id),
          }))
        );
      }
      if (!invitesRes.error) {
        setInvitations(invitesRes.data);
      }
    } catch (err) {
      console.warn("silentRefresh failed:", err);
    }
  }, []);

  return {
    roster,
    invitations,
    events,
    loading,
    error,
    sendInvite,
    addMemberDirectly,
    revokeInvite,
    resendInvite,
    assignEvent,
    unassignEvent,
    changeRole,
    setAlumni,
    updateEmail,
    removeUser,
    refresh: loadAll,
    silentRefresh,
  };
}
