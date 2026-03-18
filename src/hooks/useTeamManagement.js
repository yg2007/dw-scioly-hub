import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

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
        supabase
          .from("users")
          .select("*, user_events(event_id)")
          .order("role")
          .order("full_name"),
        supabase
          .from("invitations")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("events")
          .select("id, name, type, team_size, icon")
          .order("id"),
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
  const sendInvite = useCallback(async ({ fullName, email, role, eventIds = [] }) => {
    const { data, error: fnErr } = await supabase.functions.invoke("send-invite", {
      body: { fullName, email, role, eventIds },
    });
    if (fnErr) throw fnErr;
    if (data.error) throw new Error(data.error);

    // Add to local state
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

    return data;
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
    const { error: err } = await supabase
      .from("user_events")
      .delete()
      .eq("user_id", userId)
      .eq("event_id", eventId);
    if (err) throw err;
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

  // ─── Remove user from team ─────────────────────────
  const removeUser = useCallback(async (userId) => {
    // Delete event assignments first, then user
    await supabase.from("user_events").delete().eq("user_id", userId);
    const { error: err } = await supabase.from("users").delete().eq("id", userId);
    if (err) throw err;
    setRoster((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  return {
    roster,
    invitations,
    events,
    loading,
    error,
    sendInvite,
    revokeInvite,
    resendInvite,
    assignEvent,
    unassignEvent,
    changeRole,
    removeUser,
    refresh: loadAll,
  };
}
