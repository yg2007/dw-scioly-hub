import { useState, useMemo } from "react";
import { Users, UserPlus, Mail, X, ChevronDown, ChevronUp, Check, AlertTriangle, Shield, GraduationCap, Microscope, Trash2, RefreshCw, Search } from "lucide-react";
import { C } from "../ui";
import { EVENTS, STUDENTS } from "../data/mockData";

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
export default function TeamManagement({ navigate }) {
  const [tab, setTab] = useState("roster");       // roster | invite | events
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [toast, setToast] = useState(null);

  // ── PROTOTYPE MODE: use mock data ──────────────────
  const [mockRoster] = useState(() =>
    STUDENTS.map((s) => ({
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

  const roster = mockRoster;
  const invitations = mockInvites;
  const events = EVENTS;

  // ── Filtered roster ────────────────────────────────
  const filtered = useMemo(() => {
    let list = roster;
    if (filterRole !== "all") list = list.filter((u) => u.role === filterRole);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [roster, filterRole, search]);

  // ── Stats ──────────────────────────────────────────
  const stats = useMemo(() => ({
    total: roster.length,
    coaches: roster.filter((u) => u.role === "coach").length,
    students: roster.filter((u) => u.role === "student").length,
    pending: invitations.length,
  }), [roster, invitations]);

  // ── Toast helper ───────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Mock invite handler ────────────────────────────
  const handleInvite = ({ fullName, email, role, eventIds }) => {
    setMockInvites((prev) => [
      ...prev,
      {
        id: Date.now(),
        full_name: fullName,
        email,
        role,
        event_ids: eventIds,
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ]);
    showToast(`Invitation sent to ${email}`);
    setShowInviteForm(false);
  };

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
        <button
          onClick={() => setShowInviteForm(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "12px 20px",
            background: C.gold, color: C.white, border: "none", borderRadius: 10,
            fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <UserPlus size={16} /> Invite Member
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Members", value: stats.total, color: C.navy },
          { label: "Coaches", value: stats.coaches, color: C.gold },
          { label: "Students", value: stats.students, color: C.tealDark },
          { label: "Pending Invites", value: stats.pending, color: C.slate },
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
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 2fr 1fr 3fr 80px",
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

          {filtered.map((user, i) => {
            const rc = ROLE_CONFIG[user.role] || ROLE_CONFIG.student;
            const userEvents = events.filter((e) => user.eventIds?.includes(e.id));
            return (
              <div key={user.id || i} style={{
                display: "grid", gridTemplateColumns: "2fr 2fr 1fr 3fr 80px",
                padding: "14px 20px", alignItems: "center",
                borderTop: `1px solid ${C.gray100}`,
              }}>
                {/* Name + avatar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: user.avatar_color || C.teal,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.white, fontSize: 12, fontWeight: 700,
                  }}>
                    {user.initials}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{user.full_name}</span>
                </div>

                {/* Email */}
                <span style={{ fontSize: 13, color: C.gray600 }}>{user.email}</span>

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
                  {userEvents.slice(0, 4).map((ev) => (
                    <span key={ev.id} style={{
                      padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                      background: TYPE_COLORS[ev.type]?.bg || C.gray100,
                      color: TYPE_COLORS[ev.type]?.text || C.gray600,
                    }}>
                      {ev.icon} {ev.name.length > 14 ? ev.name.slice(0, 14) + "…" : ev.name}
                    </span>
                  ))}
                  {userEvents.length > 4 && (
                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: C.gray100, color: C.gray400 }}>
                      +{userEvents.length - 4}
                    </span>
                  )}
                  {userEvents.length === 0 && (
                    <span style={{ fontSize: 12, color: C.gray400, fontStyle: "italic" }}>No events</span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => { /* open event assignment modal */ }}
                    title="Manage events"
                    style={{
                      width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.gray200}`,
                      background: C.white, cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center", color: C.gray400,
                    }}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            );
          })}
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

          {invitations.map((inv) => {
            const rc = ROLE_CONFIG[inv.role] || ROLE_CONFIG.student;
            const invEvents = events.filter((e) => inv.event_ids?.includes(e.id));
            return (
              <div key={inv.id} style={{
                display: "grid", gridTemplateColumns: "2fr 2fr 1fr 2fr 120px",
                padding: "14px 20px", alignItems: "center", borderTop: `1px solid ${C.gray100}`,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{inv.full_name}</span>
                <span style={{ fontSize: 13, color: C.gray600 }}>{inv.email}</span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: rc.bg, color: rc.color, width: "fit-content",
                }}>
                  <rc.icon size={12} /> {rc.label}
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {invEvents.map((ev) => (
                    <span key={ev.id} style={{
                      padding: "3px 8px", borderRadius: 6, fontSize: 11,
                      background: C.gray100, color: C.gray600,
                    }}>{ev.icon} {ev.name.length > 14 ? ev.name.slice(0, 14) + "…" : ev.name}</span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { /* resend */ showToast("Invite resent"); }}
                    title="Resend"
                    style={{
                      padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.gray200}`,
                      background: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600,
                      color: C.tealDark, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
                    }}>
                    <RefreshCw size={12} /> Resend
                  </button>
                  <button onClick={() => {
                    setMockInvites((prev) => prev.filter((i) => i.id !== inv.id));
                    showToast("Invite revoked", "warn");
                  }}
                    title="Revoke"
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
        <EventAssignmentsView events={events} roster={roster} onAssign={(userId, eventId) => {
          // In prototype mode, update the mock roster's eventIds
          // In production mode, this would call assignEvent from useTeamManagement
          showToast(`Assigned to event`);
        }} />
      )}

      {/* ── INVITE MODAL ──────────────────────────────── */}
      {showInviteForm && (
        <InviteModal
          events={events}
          onSubmit={handleInvite}
          onClose={() => setShowInviteForm(false)}
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


// ═══════════════════════════════════════════════════════════════
//  INVITE MODAL
// ═══════════════════════════════════════════════════════════════
function InviteModal({ events, onSubmit, onClose }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [error, setError] = useState(null);

  const toggleEvent = (id) => {
    setSelectedEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!fullName.trim()) return setError("Name is required");
    if (!email.includes("@")) return setError("Valid email is required");
    setError(null);
    onSubmit({ fullName: fullName.trim(), email: email.trim().toLowerCase(), role, eventIds: selectedEvents });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }} onClick={onClose}>
      <div style={{
        background: C.white, borderRadius: 20, width: 560, maxHeight: "85vh",
        overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: "24px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.navy, marginBottom: 4 }}>
              Invite Team Member
            </h2>
            <p style={{ fontSize: 13, color: C.gray400 }}>They'll receive an email to sign in with Google.</p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.gray200}`,
            background: C.white, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", color: C.gray400,
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "20px 28px 28px" }}>
          {/* Error */}
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, background: "#FDE8EC",
              color: C.coral, fontSize: 13, fontWeight: 500, marginBottom: 16,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {/* Name */}
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1 }}>
              Full Name
            </span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jordan Smith"
              style={{
                display: "block", width: "100%", marginTop: 6, padding: "12px 14px",
                border: `1px solid ${C.gray200}`, borderRadius: 10, fontSize: 14,
                fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              }}
            />
          </label>

          {/* Email */}
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1 }}>
              Email Address
            </span>
            <input value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jordan.smith@school.edu"
              type="email"
              style={{
                display: "block", width: "100%", marginTop: 6, padding: "12px 14px",
                border: `1px solid ${C.gray200}`, borderRadius: 10, fontSize: 14,
                fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              }}
            />
          </label>

          {/* Role */}
          <div style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
              Role
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { id: "student", label: "Student", icon: GraduationCap, desc: "Takes quizzes, views study paths" },
                { id: "coach", label: "Event Coach", icon: Microscope, desc: "Manages assigned events" },
              ].map((r) => (
                <button key={r.id} onClick={() => setRole(r.id)} style={{
                  flex: 1, padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  border: role === r.id ? `2px solid ${C.gold}` : `1px solid ${C.gray200}`,
                  background: role === r.id ? C.goldLight : C.white,
                  fontFamily: "inherit", textAlign: "left",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <r.icon size={16} color={role === r.id ? C.gold : C.gray400} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: role === r.id ? C.gold : C.navy }}>
                      {r.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: C.gray400 }}>{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Event Selection */}
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
              Assign Events <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: C.gray400 }}>(optional — can do later)</span>
            </span>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
              maxHeight: 240, overflow: "auto", padding: 2,
            }}>
              {events.map((ev) => {
                const sel = selectedEvents.includes(ev.id);
                return (
                  <button key={ev.id} onClick={() => toggleEvent(ev.id)} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                    borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    border: sel ? `2px solid ${C.teal}` : `1px solid ${C.gray200}`,
                    background: sel ? "#E2F0E6" : C.white,
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{ev.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: sel ? C.tealDark : C.navy }}>
                      {ev.name}
                    </span>
                    {sel && <Check size={14} color={C.teal} style={{ marginLeft: "auto" }} />}
                  </button>
                );
              })}
            </div>
            {selectedEvents.length > 0 && (
              <p style={{ fontSize: 12, color: C.tealDark, fontWeight: 600, marginTop: 8 }}>
                {selectedEvents.length} event{selectedEvents.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Submit */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "14px", borderRadius: 10, border: `1px solid ${C.gray200}`,
              background: C.white, color: C.gray600, fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Cancel
            </button>
            <button onClick={handleSubmit} style={{
              flex: 2, padding: "14px", borderRadius: 10, border: "none",
              background: C.gold, color: C.white, fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <Mail size={16} /> Send Invitation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
//  EVENT ASSIGNMENTS VIEW (shows each event → who's assigned)
// ═══════════════════════════════════════════════════════════════
function EventAssignmentsView({ events, roster, onAssign }) {
  const [expandedEvent, setExpandedEvent] = useState(null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {events.map((ev) => {
        const assigned = roster.filter((u) => u.eventIds?.includes(ev.id));
        const expanded = expandedEvent === ev.id;
        const tc = TYPE_COLORS[ev.type] || {};

        return (
          <div key={ev.id} style={{
            background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`,
            overflow: "hidden",
          }}>
            <div
              onClick={() => setExpandedEvent(expanded ? null : ev.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
                cursor: "pointer", userSelect: "none",
              }}
            >
              <span style={{ fontSize: 24 }}>{ev.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{ev.name}</div>
                <div style={{ fontSize: 12, color: C.gray400 }}>
                  {assigned.length} / {ev.team_size} assigned
                  <span style={{
                    marginLeft: 8, padding: "2px 8px", borderRadius: 4,
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    background: tc.bg, color: tc.text,
                  }}>{ev.type}</span>
                </div>
              </div>
              {/* Fill indicator */}
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: assigned.length >= ev.team_size ? "#E2F0E6" : C.gray100,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800,
                color: assigned.length >= ev.team_size ? C.tealDark : C.gray400,
              }}>
                {assigned.length}/{ev.team_size}
              </div>
              {expanded ? <ChevronUp size={16} color={C.gray400} /> : <ChevronDown size={16} color={C.gray400} />}
            </div>

            {expanded && (
              <div style={{ padding: "0 18px 14px", borderTop: `1px solid ${C.gray100}` }}>
                {assigned.length === 0 ? (
                  <p style={{ fontSize: 13, color: C.gray400, padding: "12px 0", fontStyle: "italic" }}>
                    No one assigned yet.
                  </p>
                ) : (
                  assigned.map((u) => (
                    <div key={u.id} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                      borderBottom: `1px solid ${C.gray100}`,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: u.avatar_color || C.teal,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: C.white, fontSize: 10, fontWeight: 700,
                      }}>
                        {u.initials}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.navy, flex: 1 }}>
                        {u.full_name}
                      </span>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 4,
                        background: ROLE_CONFIG[u.role]?.bg, color: ROLE_CONFIG[u.role]?.color,
                        fontWeight: 600,
                      }}>
                        {ROLE_CONFIG[u.role]?.label}
                      </span>
                    </div>
                  ))
                )}

                {/* Unassigned students for quick-add */}
                {assigned.length < ev.team_size && (
                  <div style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: 1 }}>
                      Quick Add
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {roster
                        .filter((u) => !u.eventIds?.includes(ev.id) && u.role === "student")
                        .slice(0, 6)
                        .map((u) => (
                          <button key={u.id} onClick={() => onAssign?.(u.id, ev.id)} style={{
                            padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                            border: `1px dashed ${C.gray200}`, background: C.offWhite,
                            color: C.gray600, cursor: "pointer", fontFamily: "inherit",
                          }}>
                            + {u.full_name.split(" ")[0]}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
