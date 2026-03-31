import { useState, useMemo } from "react";
import { Users, UserPlus, Mail, X, ChevronDown, ChevronUp, Check, AlertTriangle, Shield, GraduationCap, Microscope, Trash2, RefreshCw, Search, UserMinus, RotateCcw, BookOpen, Pencil } from "lucide-react";
import { SkeletonDashboard } from "./shared/Skeleton";
import { C } from "../ui";
import { IS_PRODUCTION } from "../lib/featureFlags";
import { EVENTS, STUDENTS } from "../data/mockData";
import { useTeamManagement } from "../hooks/useTeamManagement";
import InviteModal from "./TeamManagement/InviteModal";
import BulkImportModal from "./TeamManagement/BulkImportModal";
import EventAssignmentModal from "./TeamManagement/EventAssignmentModal";
import EventAssignmentsView from "./TeamManagement/EventAssignmentsView";

// ─── Role badge config ───────────────────────────────────────
const ROLE_CONFIG = {
  admin:   { label: "Head Coach", icon: Shield,         color: C.coral,   bg: "#F5E2DC" },
  coach:   { label: "Coach",      icon: Microscope,     color: C.gold,    bg: C.goldLight },
  student: { label: "Student",    icon: GraduationCap,  color: C.tealDark, bg: "#E2F0E6" },
};

const TYPE_COLORS = {
  study: { bg: C.goldLight, text: "#A0522D" },
  lab:   { bg: "#E2F0E6", text: C.tealDark },
  build: { bg: "#F5E2DC", text: C.coral },
};

// ═══════════════════════════════════════════════════════════════
//  TEAM MANAGEMENT PAGE (Admin only)
// ═══════════════════════════════════════════════════════════════
export default function TeamManagement() {
  const [tab, setTab] = useState("roster");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [editingEventsFor, setEditingEventsFor] = useState(null); // user object for event assignment modal
  const [showBulkImport, setShowBulkImport] = useState(false);   // bulk import modal
  const [editingEmailFor, setEditingEmailFor] = useState(null);   // user id whose email is being edited
  const [emailDraft, setEmailDraft] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Production: real Supabase data via hook ──────────
  const team = useTeamManagement();

  // ── Prototype: mock data fallback ────────────────────
  const [mockRoster] = useState(() =>
    IS_PRODUCTION ? [] : STUDENTS.map((s) => ({
      id: s.id,
      full_name: s.name,
      initials: s.initials,
      email: `${s.name.toLowerCase().replace(" ", ".")}@school.edu`,
      role: "student",
      avatar_color: s.color,
      eventIds: s.events,
    }))
  );
  const [mockInvites, setMockInvites] = useState([]);

  // ── Unified data source ──────────────────────────────
  const roster = useMemo(() => IS_PRODUCTION ? (team?.roster || []) : (mockRoster || []), [team?.roster, mockRoster]);
  const invitations = useMemo(() => IS_PRODUCTION ? (team?.invitations || []) : (mockInvites || []), [team?.invitations, mockInvites]);
  const events = IS_PRODUCTION ? (team?.events || []) : (EVENTS || []);
  const loading = IS_PRODUCTION ? team?.loading : false;

  // ── Split roster: active vs alumni ─────────────────
  const activeRoster = useMemo(() =>
    (roster || []).filter((u) => !u?.is_alumni),
    [roster]
  );
  const alumniRoster = useMemo(() =>
    (roster || []).filter((u) => u?.is_alumni === true),
    [roster]
  );

  // ── Filtered active roster ──────────────────────────
  const filtered = useMemo(() => {
    let list = activeRoster;
    if (filterRole !== "all") list = list.filter((u) => u?.role === filterRole);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          (u?.full_name || "").toLowerCase().includes(q) ||
          (u?.email || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeRoster, filterRole, search]);

  // ── Stats ──────────────────────────────────────────
  const stats = useMemo(() => ({
    total: activeRoster.length,
    coaches: activeRoster.filter((u) => u?.role === "coach" || u?.role === "admin").length,
    students: activeRoster.filter((u) => u?.role === "student").length,
    alumni: alumniRoster.length,
    pending: (invitations || []).length,
  }), [activeRoster, alumniRoster, invitations]);

  // ── Toast helper ───────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Add member directly (no email) ──────────────────
  const handleAddDirect = async ({ fullName, email, role, eventIds, _keepOpen }) => {
    try {
      if (IS_PRODUCTION) {
        await team.addMemberDirectly({ fullName, email, role, eventIds });
        // Silently reload the full roster from the server so the next add
        // always starts with fresh server state (avoids stale-session issues
        // where subsequent adds fail until logout/login).
        team.silentRefresh();
      }
      showToast(`${fullName} added to the team`);
      if (!_keepOpen) setShowInviteForm(false);
    } catch (err) {
      showToast(err.message || "Failed to add member", "warn");
      throw err; // re-throw so the modal can stop its spinner
    }
  };

  // ── Invite handler (send email) ────────────────────
  const handleInvite = async ({ fullName, email, role, eventIds, _keepOpen }) => {
    try {
      if (IS_PRODUCTION) {
        await team.sendInvite({ fullName, email, role, eventIds });
      } else {
        setMockInvites((prev) => [
          ...prev,
          { id: Date.now(), full_name: fullName, email, role, event_ids: eventIds, status: "pending", created_at: new Date().toISOString() },
        ]);
      }
      showToast(`Invitation sent to ${email}`);
      if (!_keepOpen) setShowInviteForm(false);
    } catch (err) {
      showToast(err.message || "Failed to send invite", "warn");
    }
  };

  // ── Revoke handler ─────────────────────────────────
  const handleRevoke = async (inv) => {
    try {
      if (IS_PRODUCTION) {
        await team.revokeInvite(inv.id);
      } else {
        setMockInvites((prev) => prev.filter((i) => i.id !== inv.id));
      }
      showToast("Invite revoked", "warn");
    } catch (err) {
      showToast(err.message || "Failed to revoke", "warn");
    }
  };

  // ── Resend handler ─────────────────────────────────
  const handleResend = async (inv) => {
    try {
      if (IS_PRODUCTION) {
        await team.resendInvite(inv);
      }
      showToast("Invite resent");
    } catch (err) {
      showToast(err.message || "Failed to resend", "warn");
    }
  };

  // ── Assign event handler ───────────────────────────
  const handleAssign = async (userId, eventId) => {
    try {
      if (IS_PRODUCTION) {
        await team.assignEvent(userId, eventId);
      }
      showToast("Assigned to event");
    } catch (err) {
      showToast(err.message || "Failed to assign", "warn");
    }
  };

  // ── Unassign event handler ─────────────────────────
  const handleUnassign = async (userId, eventId) => {
    try {
      if (IS_PRODUCTION) {
        await team.unassignEvent(userId, eventId);
      }
      showToast("Removed from event");
    } catch (err) {
      showToast(err.message || "Failed to unassign", "warn");
    }
  };

  // ── Toggle event for a user ────────────────────────
  // The modal's EventAssignmentModal reads from the `roster` prop which
  // auto-updates via useMemo whenever team.roster state changes, so
  // there's no need to manually close/reopen the modal.
  const handleToggleEvent = async (userId, eventId, currentlyAssigned) => {
    if (currentlyAssigned) {
      await handleUnassign(userId, eventId);
    } else {
      await handleAssign(userId, eventId);
    }
    // Silently reload from the server to confirm the change persisted
    if (IS_PRODUCTION) team.silentRefresh();
  };

  // ── Remove user handler ────────────────────────────
  const handleRemove = async (user) => {
    if (!confirm(`Remove ${user.full_name} from the team? This cannot be undone.`)) return;
    try {
      if (IS_PRODUCTION) {
        await team.removeUser(user.id);
      }
      showToast(`${user.full_name} removed`);
    } catch (err) {
      showToast(err.message || "Failed to remove", "warn");
    }
  };

  // ── Graduate handler (mark as alumni) ─────────────
  const handleGraduate = async (user) => {
    if (!confirm(`Mark ${user.full_name} as Alumni? They'll be moved to the Alumni tab and excluded from active rosters. Their quiz history and progress are preserved.`)) return;
    try {
      if (IS_PRODUCTION) {
        await team.setAlumni(user.id, true);
      }
      showToast(`${user.full_name} moved to Alumni`);
    } catch (err) {
      showToast(err.message || "Failed to update status", "warn");
    }
  };

  // ── Email edit handlers ────────────────────────────
  const handleStartEditEmail = (user) => {
    setEditingEmailFor(user.id);
    setEmailDraft(user.email || "");
  };

  const handleSaveEmail = async (user) => {
    if (emailDraft.trim() === user.email) { setEditingEmailFor(null); return; }
    setEmailSaving(true);
    try {
      if (IS_PRODUCTION) {
        await team.updateEmail(user.id, emailDraft);
      }
      showToast(`Email updated for ${user.full_name}`);
      setEditingEmailFor(null);
    } catch (err) {
      showToast(err.message || "Failed to update email", "warn");
    }
    setEmailSaving(false);
  };

  const handleCancelEditEmail = () => {
    setEditingEmailFor(null);
    setEmailDraft("");
  };

  // ── Restore handler (reactivate alumni) ───────────
  const handleRestore = async (user) => {
    try {
      if (IS_PRODUCTION) {
        await team.setAlumni(user.id, false);
      }
      showToast(`${user.full_name} restored to Active`);
    } catch (err) {
      showToast(err.message || "Failed to restore", "warn");
    }
  };

  // ── Loading state ──────────────────────────────────
  if (loading) {
    return <SkeletonDashboard stats={3} rows={8} style={{ padding: "4px 0" }} />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Users size={20} color={C.gold} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Team Management
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: C.navy, marginBottom: 4 }}>
            Roster & Assignments
          </h1>
          <p style={{ color: C.gray400, fontSize: 14 }}>
            Invite coaches and students, assign events, manage roles.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {IS_PRODUCTION && (
            <button onClick={() => team.refresh()} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "12px 16px",
              background: C.white, color: C.gray600, border: `1px solid ${C.gray200}`,
              borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>
              <RefreshCw size={14} /> Refresh
            </button>
          )}
          <button onClick={() => setShowBulkImport(true)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "12px 16px",
            background: C.white, color: C.navy, border: `1px solid ${C.gray200}`,
            borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            <Users size={14} /> Bulk Import
          </button>
          <button onClick={() => setShowInviteForm(true)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "12px 20px",
            background: C.gold, color: C.white, border: "none", borderRadius: 10,
            fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            <UserPlus size={16} /> Invite Member
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Active Members", value: stats.total, color: C.navy },
          { label: "Coaches", value: stats.coaches, color: C.gold },
          { label: "Students", value: stats.students, color: C.tealDark },
          { label: "Alumni", value: stats.alumni, color: C.slate },
          { label: "Pending Invites", value: stats.pending, color: "#9E9E9E" },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, background: C.white, borderRadius: 12, padding: "14px 20px",
            border: `1px solid ${C.gray200}`,
          }}>
            <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.gray100, borderRadius: 10, padding: 4 }}>
        {[
          { id: "roster", label: "Active Roster", count: stats.total },
          { id: "alumni", label: "Alumni", count: stats.alumni },
          { id: "pending", label: "Pending Invites", count: stats.pending },
          { id: "events", label: "Event Assignments", count: events.length },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 16px", borderRadius: 8, border: "none",
            background: tab === t.id ? C.white : "transparent",
            color: tab === t.id ? C.navy : C.gray400,
            fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s",
          }}>
            {t.label} <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.6 }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Search + Filter (for roster tab) */}
      {tab === "roster" && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8,
            background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 10, padding: "0 14px",
          }}>
            <Search size={16} color={C.gray400} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              style={{
                flex: 1, border: "none", outline: "none", padding: "12px 0",
                fontSize: 14, fontFamily: "inherit", background: "transparent",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["all", "coach", "student"].map((r) => (
              <button key={r} onClick={() => setFilterRole(r)} style={{
                padding: "8px 16px", borderRadius: 8,
                border: filterRole === r ? "none" : `1px solid ${C.gray200}`,
                background: filterRole === r ? C.navy : C.white,
                color: filterRole === r ? C.white : C.gray600,
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>
                {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1) + "s"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ROSTER TAB ──────────────────────────────── */}
      {tab === "roster" && (
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 2fr 1fr 3fr 110px",
            padding: "12px 20px", background: C.offWhite, fontSize: 11, fontWeight: 700,
            color: C.gray400, textTransform: "uppercase", letterSpacing: 1,
          }}>
            <span>Name</span><span>Email</span><span>Role</span><span>Events</span><span></span>
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: C.gray400, fontSize: 14 }}>
              No members found.
            </div>
          )}

          {(filtered || []).map((user, i) => {
            const rc = ROLE_CONFIG[user?.role] || ROLE_CONFIG.student;
            const userEvents = (events || []).filter((e) => (user?.eventIds || []).includes(e?.id));
            const isEditingEmail = editingEmailFor === user?.id;
            return (
              <div key={user?.id || i} style={{
                display: "grid", gridTemplateColumns: "2fr 2fr 1fr 3fr 110px",
                padding: "14px 20px", alignItems: "center",
                borderTop: `1px solid ${C.gray100}`,
              }}>
                {/* Name */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: user?.avatar_color || C.teal,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.white, fontSize: 12, fontWeight: 700,
                  }}>
                    {user?.initials}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{user?.full_name}</span>
                </div>

                {/* Email — inline edit */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  {isEditingEmail ? (
                    <>
                      <input
                        value={emailDraft}
                        onChange={(e) => setEmailDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEmail(user);
                          if (e.key === "Escape") handleCancelEditEmail();
                        }}
                        autoFocus
                        style={{
                          flex: 1, fontSize: 12, padding: "5px 8px", border: `1.5px solid ${C.teal}`,
                          borderRadius: 6, outline: "none", fontFamily: "inherit", minWidth: 0,
                        }}
                      />
                      <button onClick={() => handleSaveEmail(user)} disabled={emailSaving} title="Save"
                        style={{
                          width: 24, height: 24, borderRadius: 5, border: "none",
                          background: C.teal, color: C.white, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                        <Check size={12} />
                      </button>
                      <button onClick={handleCancelEditEmail} title="Cancel"
                        style={{
                          width: 24, height: 24, borderRadius: 5, border: `1px solid ${C.gray200}`,
                          background: C.white, color: C.gray400, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 13, color: C.gray600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user?.email}
                      </span>
                      <button onClick={() => handleStartEditEmail(user)} title="Edit email"
                        style={{
                          flexShrink: 0, width: 22, height: 22, borderRadius: 4,
                          border: `1px solid ${C.gray200}`, background: "none",
                          cursor: "pointer", display: "flex", alignItems: "center",
                          justifyContent: "center", color: C.gray400,
                          opacity: 0, transition: "opacity 0.15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                      >
                        <Pencil size={11} />
                      </button>
                    </>
                  )}
                </div>

                {/* Role badge */}
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: rc.bg, color: rc.color, width: "fit-content",
                }}>
                  <rc.icon size={12} /> {rc.label}
                </span>

                {/* Events */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(userEvents || []).slice(0, 4).map((ev) => (
                    <span key={ev?.id} style={{
                      padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                      background: TYPE_COLORS[ev?.type]?.bg || C.gray100,
                      color: TYPE_COLORS[ev?.type]?.text || C.gray600,
                    }}>
                      {ev?.icon} {(ev?.name || "").length > 14 ? (ev?.name || "").slice(0, 14) + "…" : ev?.name}
                    </span>
                  ))}
                  {(userEvents || []).length > 4 && (
                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: C.gray100, color: C.gray400 }}>
                      +{(userEvents || []).length - 4}
                    </span>
                  )}
                  {(userEvents || []).length === 0 && (
                    <span style={{ fontSize: 12, color: C.gray400, fontStyle: "italic" }}>No events</span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button onClick={() => setEditingEventsFor(user)} title="Edit events"
                    style={{
                      width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.gray200}`,
                      background: C.white, cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center", color: C.gray400,
                    }}>
                    <ChevronDown size={14} />
                  </button>
                  {user?.role === "student" && (
                    <button onClick={() => handleGraduate(user)} title="Mark as Alumni"
                      style={{
                        width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.gray200}`,
                        background: C.white, cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center", color: C.tealDark,
                      }}>
                      <GraduationCap size={14} />
                    </button>
                  )}
                  {user?.role !== "admin" && (
                    <button onClick={() => handleRemove(user)} title="Remove member"
                      style={{
                        width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.gray200}`,
                        background: C.white, cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center", color: C.coral,
                      }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ALUMNI TAB ──────────────────────────────── */}
      {tab === "alumni" && (
        <div>
          {/* Info banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
            background: "linear-gradient(135deg, #EEF2FF 0%, #E8F5E9 100%)",
            borderRadius: 12, border: "1px solid #C5CAE9", marginBottom: 16,
          }}>
            <BookOpen size={18} color={C.tealDark} />
            <p style={{ margin: 0, fontSize: 13, color: C.gray600, lineHeight: 1.5 }}>
              Alumni are former students who have graduated or left the team. Their quiz history, mastery data,
              and build logs are fully preserved. They can still log in but won't appear in active rosters or event assignments.
            </p>
          </div>

          <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, overflow: "hidden" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 2fr 2fr 100px",
              padding: "12px 20px", background: C.offWhite, fontSize: 11, fontWeight: 700,
              color: C.gray400, textTransform: "uppercase", letterSpacing: 1,
            }}>
              <span>Name</span><span>Email</span><span>Former Events</span><span></span>
            </div>

            {alumniRoster.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: C.gray400, fontSize: 14 }}>
                No alumni yet. Use the 🎓 button on a student's row to graduate them.
              </div>
            )}

            {alumniRoster.map((user, i) => {
              const userEvents = (events || []).filter((e) => (user?.eventIds || []).includes(e?.id));
              return (
                <div key={user?.id || i} style={{
                  display: "grid", gridTemplateColumns: "2fr 2fr 2fr 100px",
                  padding: "14px 20px", alignItems: "center",
                  borderTop: `1px solid ${C.gray100}`,
                  opacity: 0.8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8,
                      background: user?.avatar_color || "#B0BEC5",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: C.white, fontSize: 12, fontWeight: 700,
                    }}>
                      {user?.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{user?.full_name}</div>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: "#ECEFF1", color: "#546E7A", marginTop: 2,
                      }}>
                        <GraduationCap size={10} /> Alumni
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 13, color: C.gray600 }}>{user?.email}</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(userEvents || []).slice(0, 3).map((ev) => (
                      <span key={ev?.id} style={{
                        padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                        background: C.gray100, color: C.gray600,
                      }}>
                        {ev?.icon} {(ev?.name || "").length > 14 ? (ev?.name || "").slice(0, 14) + "…" : ev?.name}
                      </span>
                    ))}
                    {(userEvents || []).length === 0 && (
                      <span style={{ fontSize: 12, color: C.gray400, fontStyle: "italic" }}>—</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button onClick={() => handleRestore(user)} title="Restore to Active"
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        border: `1px solid ${C.tealDark}`, background: C.white,
                        color: C.tealDark, cursor: "pointer", fontFamily: "inherit",
                      }}>
                      <RotateCcw size={12} /> Restore
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PENDING INVITES TAB ─────────────────────── */}
      {tab === "pending" && (
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 2fr 1fr 2fr 120px",
            padding: "12px 20px", background: C.offWhite, fontSize: 11, fontWeight: 700,
            color: C.gray400, textTransform: "uppercase", letterSpacing: 1,
          }}>
            <span>Name</span><span>Email</span><span>Role</span><span>Events</span><span>Actions</span>
          </div>

          {invitations.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: C.gray400, fontSize: 14 }}>
              No pending invitations. Click <strong>Invite Member</strong> to add someone.
            </div>
          )}

          {(invitations || []).map((inv) => {
            const rc = ROLE_CONFIG[inv?.role] || ROLE_CONFIG.student;
            const invEvents = (events || []).filter((e) => (inv?.event_ids || []).includes(e?.id));
            return (
              <div key={inv?.id} style={{
                display: "grid", gridTemplateColumns: "2fr 2fr 1fr 2fr 120px",
                padding: "14px 20px", alignItems: "center", borderTop: `1px solid ${C.gray100}`,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{inv?.full_name}</span>
                <span style={{ fontSize: 13, color: C.gray600 }}>{inv?.email}</span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: rc.bg, color: rc.color, width: "fit-content",
                }}>
                  <rc.icon size={12} /> {rc.label}
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(invEvents || []).map((ev) => (
                    <span key={ev?.id} style={{
                      padding: "3px 8px", borderRadius: 6, fontSize: 11,
                      background: C.gray100, color: C.gray600,
                    }}>{ev?.icon} {(ev?.name || "").length > 14 ? (ev?.name || "").slice(0, 14) + "…" : ev?.name}</span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleResend(inv)} title="Resend"
                    style={{
                      padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.gray200}`,
                      background: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600,
                      color: C.tealDark, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
                    }}>
                    <RefreshCw size={12} /> Resend
                  </button>
                  <button onClick={() => handleRevoke(inv)} title="Revoke"
                    style={{
                      padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.gray200}`,
                      background: C.white, cursor: "pointer", color: C.coral,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── EVENT ASSIGNMENTS TAB ───────────────────── */}
      {tab === "events" && (
        <EventAssignmentsView events={events} roster={activeRoster} onAssign={handleAssign} />
      )}

      {/* ── INVITE MODAL ──────────────────────────────── */}
      {showInviteForm && (
        <InviteModal events={events} onSubmit={handleInvite} onAddDirect={handleAddDirect} onClose={() => setShowInviteForm(false)} />
      )}

      {/* ── BULK IMPORT MODAL ────────────────────────── */}
      {showBulkImport && (
        <BulkImportModal events={events} onAddDirect={handleAddDirect} onClose={() => { setShowBulkImport(false); if (IS_PRODUCTION) team.silentRefresh(); }} />
      )}

      {/* ── EVENT ASSIGNMENT MODAL ──────────────────────── */}
      {editingEventsFor && (
        <EventAssignmentModal
          user={editingEventsFor}
          events={events}
          roster={roster}
          onToggle={handleToggleEvent}
          onClose={() => setEditingEventsFor(null)}
        />
      )}

      {/* ── TOAST ─────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, padding: "14px 24px",
          borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: "'Inter', sans-serif",
          background: toast.type === "warn" ? "#FFF3E0" : "#E8F5E9",
          color: toast.type === "warn" ? "#E65100" : "#2E7D32",
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          display: "flex", alignItems: "center", gap: 8, zIndex: 100,
        }}>
          {toast.type === "warn" ? <AlertTriangle size={16} /> : <Check size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
