import { useState, useMemo } from "react";
import { Calendar, Plus, Edit3, Trash2, MapPin, Clock, X, Check, AlertTriangle, Loader2, Save, Users } from "lucide-react";
import { SkeletonDashboard } from "./shared/Skeleton";
import { C } from "../ui";
import { IS_PRODUCTION } from "../lib/featureFlags";
import { useCompetitions } from "../hooks/useCompetitions";
import { useAppContext } from "../lib/AppContext";
import CompetitionDetail from "./CompetitionDetail";

const TYPE_OPTIONS = [
  { value: "invitational", label: "Invitational" },
  { value: "regional", label: "Regional" },
  { value: "state", label: "State" },
  { value: "national", label: "National" },
  { value: "other", label: "Other" },
];

const TYPE_COLORS = {
  invitational: { bg: C.goldLight, text: "#A0522D" },
  regional: { bg: "#E2F0E6", text: C.tealDark },
  state: { bg: "#EDE9FE", text: "#7C3AED" },
  national: { bg: "#FEF2F2", text: C.coral },
  other: { bg: C.gray100, text: C.gray600 },
};

// ── Mock data for prototype mode ─────────────────────────
const MOCK_COMPETITIONS = [
  { id: 1, name: "Wheeling Invitational", type: "invitational", date: "2026-03-22", location: "Wheeling HS", event_ids: [], notes: "" },
  { id: 2, name: "Regional Tournament", type: "regional", date: "2026-04-04", location: "Lake Forest HS", event_ids: [], notes: "" },
  { id: 3, name: "State Tournament", type: "state", date: "2026-04-18", location: "U of I Champaign", event_ids: [], notes: "" },
  { id: 4, name: "National Tournament", type: "national", date: "2026-05-29", location: "TBD", event_ids: [], notes: "" },
  { id: 5, name: "Lincoln-Way Invitational", type: "invitational", date: "2026-03-08", location: "Lincoln-Way East", event_ids: [], notes: "" },
  { id: 6, name: "Niles West Invitational", type: "invitational", date: "2026-02-22", location: "Niles West HS", event_ids: [], notes: "" },
];

export default function SchedulePage() {
  const { userRole } = useAppContext();
  const hook = useCompetitions(); // always call (hook no-ops if supabase is null)
  const [mockComps, setMockComps] = useState(MOCK_COMPETITIONS);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedComp, setSelectedComp] = useState(null); // competition to show detail

  const competitions = useMemo(() => IS_PRODUCTION ? (hook?.competitions || []) : (mockComps || []), [hook?.competitions, mockComps]);
  const loading = IS_PRODUCTION ? hook?.loading : false;
  const isStaff = userRole === "admin" || userRole === "coach";

  const today = new Date().toISOString().split("T")[0];
  const upcoming = useMemo(() => (competitions || []).filter((c) => c?.date >= today).sort((a, b) => (a?.date || "").localeCompare(b?.date || "")), [competitions, today]);
  const past = useMemo(() => (competitions || []).filter((c) => c?.date < today).sort((a, b) => (b?.date || "").localeCompare(a?.date || "")), [competitions, today]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (comp) => {
    try {
      if (IS_PRODUCTION) {
        if (editing) {
          await hook.updateCompetition(editing.id, comp);
        } else {
          await hook.createCompetition(comp);
        }
      } else {
        if (editing) {
          setMockComps((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...comp } : c)));
        } else {
          setMockComps((prev) => [...prev, { id: Date.now(), ...comp }]);
        }
      }
      showToast(editing ? "Competition updated" : "Competition added");
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      showToast(err.message || "Failed to save", "warn");
    }
  };

  const handleDelete = async (comp) => {
    if (!confirm(`Delete "${comp.name}"? This cannot be undone.`)) return;
    try {
      if (IS_PRODUCTION) {
        await hook.deleteCompetition(comp.id);
      } else {
        setMockComps((prev) => prev.filter((c) => c.id !== comp.id));
      }
      showToast("Competition deleted", "warn");
    } catch (err) {
      showToast(err.message || "Failed to delete", "warn");
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  const formatDateParts = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return { month: d.toLocaleDateString("en-US", { month: "short" }), day: d.getDate() };
  };

  if (loading) {
    return <SkeletonDashboard stats={2} rows={6} style={{ padding: "4px 0" }} />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Calendar size={20} color={C.gold} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Competition Schedule
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: C.navy, marginBottom: 4 }}>
            2025–2026 Season
          </h1>
          <p style={{ color: C.gray400, fontSize: 14 }}>
            {upcoming.length} upcoming · {past.length} completed
          </p>
        </div>
        {isStaff && (
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "12px 20px",
            background: C.gold, color: C.white, border: "none", borderRadius: 10,
            fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            <Plus size={16} /> Add Competition
          </button>
        )}
      </div>

      {/* Upcoming */}
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: C.tealDark, textTransform: "uppercase", letterSpacing: 1 }}>
        Upcoming ({upcoming.length})
      </h3>
      {upcoming.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", color: C.gray400, fontSize: 14, background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, marginBottom: 24 }}>
          No upcoming competitions. {isStaff && "Click 'Add Competition' to schedule one."}
        </div>
      )}
      {(upcoming || []).map((comp) => {
        const tc = TYPE_COLORS[comp?.type] || TYPE_COLORS.other;
        const dp = formatDateParts(comp?.date);
        return (
          <div key={comp?.id} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "16px 20px",
            background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, marginBottom: 10,
            flexWrap: "wrap",
          }}>
            <div style={{ width: 52, textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: C.gray400, fontWeight: 600, textTransform: "uppercase" }}>{dp?.month}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.navy, lineHeight: 1 }}>{dp?.day}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{comp?.name}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                {comp?.location && (
                  <span style={{ fontSize: 12, color: C.gray400, display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={12} /> {comp?.location}
                  </span>
                )}
                {comp?.start_time && (
                  <span style={{ fontSize: 12, color: C.gray400, display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} /> {comp?.start_time?.slice(0, 5)}
                    {comp?.end_time && ` – ${comp?.end_time?.slice(0, 5)}`}
                  </span>
                )}
              </div>
              {comp?.notes && <p style={{ fontSize: 12, color: C.gray400, marginTop: 4, fontStyle: "italic" }}>{comp?.notes}</p>}
            </div>
            <span style={{
              padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", background: tc?.bg, color: tc?.text, flexShrink: 0,
            }}>{comp?.type}</span>
            {isStaff && (
              <div style={{ display: "flex", gap: 4, flexShrink: 0, flexWrap: "wrap" }}>
                <button onClick={() => setSelectedComp(comp)} title="Manage Teams & Scores"
                  style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.teal}40`, background: "#E8F5E9",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: C.tealDark,
                    fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
                  <Users size={14} /> Teams
                </button>
                <button onClick={() => { setEditing(comp); setShowForm(true); }} title="Edit"
                  style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.gray200}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.gray400 }}>
                  <Edit3 size={14} />
                </button>
                <button onClick={() => handleDelete(comp)} title="Delete"
                  style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.gray200}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.coral }}>
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Past */}
      {past.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "28px 0 14px", color: C.gray400, textTransform: "uppercase", letterSpacing: 1 }}>
            Past ({past.length})
          </h3>
          {(past || []).map((comp) => {
            const hasPlacement = comp?.overall_placement != null;
            const tc = TYPE_COLORS[comp?.type] || TYPE_COLORS.other;
            const dp = formatDateParts(comp?.date);
            return (
            <div key={comp?.id} style={{
              display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
              background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, marginBottom: 10,
            }}>
              {/* Date or placement badge */}
              {hasPlacement ? (
                <div style={{
                  width: 52, textAlign: "center", flexShrink: 0,
                  background: comp.overall_placement <= 3 ? C.goldLight : C.gray100,
                  borderRadius: 10, padding: "6px 0",
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: comp.overall_placement <= 3 ? "#A0522D" : C.gray600, lineHeight: 1 }}>
                    {comp.overall_placement}<span style={{ fontSize: 11, fontWeight: 600 }}>
                      {comp.overall_placement === 1 ? "st" : comp.overall_placement === 2 ? "nd" : comp.overall_placement === 3 ? "rd" : "th"}
                    </span>
                  </div>
                  {comp.total_teams && (
                    <div style={{ fontSize: 10, color: C.gray400, marginTop: 2 }}>of {comp.total_teams}</div>
                  )}
                </div>
              ) : (
                <div style={{ width: 52, textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: C.gray400, fontWeight: 600, textTransform: "uppercase" }}>{dp?.month}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.gray400, lineHeight: 1 }}>{dp?.day}</div>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{comp?.name}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                  {comp?.location && (
                    <span style={{ fontSize: 12, color: C.gray400, display: "flex", alignItems: "center", gap: 3 }}>
                      <MapPin size={11} /> {comp?.location}
                    </span>
                  )}
                  {comp?.total_points != null && (
                    <span style={{ fontSize: 12, color: C.gray400 }}>{comp.total_points} pts</span>
                  )}
                </div>
              </div>
              <span style={{
                padding: "4px 10px", borderRadius: 100, fontSize: 10, fontWeight: 700,
                textTransform: "uppercase", background: tc?.bg, color: tc?.text, flexShrink: 0,
              }}>{comp?.type}</span>
              {isStaff && (
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setSelectedComp(comp)} title="Manage Teams & Scores"
                    style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.gold}40`, background: C.goldLight,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#A0522D",
                      fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
                    <Users size={12} /> Scores
                  </button>
                  <button onClick={() => { setEditing(comp); setShowForm(true); }} title="Edit"
                    style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.gray200}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.gray400 }}>
                    <Edit3 size={12} />
                  </button>
                  <button onClick={() => handleDelete(comp)} title="Delete"
                    style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.gray200}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.coral }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
            );
          })}
        </>
      )}

      {/* Competition Detail (Team Assignments + Scores) */}
      {selectedComp && (
        <CompetitionDetail
          competition={selectedComp}
          onClose={() => setSelectedComp(null)}
        />
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <CompetitionForm
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Toast */}
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
//  ADD / EDIT COMPETITION FORM
// ═══════════════════════════════════════════════════════════════
function CompetitionForm({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState(initial?.type || "invitational");
  const [date, setDate] = useState(initial?.date || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [startTime, setStartTime] = useState(initial?.start_time?.slice(0, 5) || "");
  const [endTime, setEndTime] = useState(initial?.end_time?.slice(0, 5) || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [overallPlacement, setOverallPlacement] = useState(initial?.overall_placement ?? "");
  const [totalTeams, setTotalTeams] = useState(initial?.total_teams ?? "");
  const [totalPoints, setTotalPoints] = useState(initial?.total_points ?? "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return setError("Name is required");
    if (!date) return setError("Date is required");
    setError(null);
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        type,
        date,
        location: location.trim() || null,
        start_time: startTime || null,
        end_time: endTime || null,
        notes: notes.trim() || null,
        overall_placement: overallPlacement ? parseInt(overallPlacement) : null,
        total_teams: totalTeams ? parseInt(totalTeams) : null,
        total_points: totalPoints ? parseFloat(totalPoints) : null,
      });
    } catch (err) {
      setError(err.message || "Failed to save");
    }
    setSaving(false);
  };

  const inputStyle = {
    display: "block", width: "100%", marginTop: 6, padding: "12px 14px",
    border: `1px solid ${C.gray200}`, borderRadius: 10, fontSize: 14,
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }} onClick={onClose}>
      <div style={{
        background: C.white, borderRadius: 20, width: 500, maxWidth: "calc(100vw - 24px)", maxHeight: "85vh",
        overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "24px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>
            {initial ? "Edit Competition" : "Add Competition"}
          </h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.gray200}`,
            background: C.white, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", color: C.gray400,
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "20px 28px 28px" }}>
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, background: "#FDE8EC",
              color: C.coral, fontSize: 13, fontWeight: 500, marginBottom: 16,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1 }}>Competition Name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wheeling Invitational" style={inputStyle} />
          </label>

          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <label style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1 }}>Type</span>
              <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1 }}>Date *</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1 }}>Location</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Wheeling High School" style={inputStyle} />
          </label>

          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <label style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1 }}>Start Time</span>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1 }}>End Time</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
            </label>
          </div>

          {/* Overall Placement (optional — typically filled after competition) */}
          <div style={{ marginBottom: 14, padding: "12px 14px", background: "#FAFAFA", borderRadius: 10, border: `1px solid ${C.gray200}` }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
              Results (optional)
            </span>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <label style={{ flex: 1 }}>
                <span style={{ fontSize: 11, color: C.gray400 }}>Placement</span>
                <input type="number" min="1" value={overallPlacement} onChange={(e) => setOverallPlacement(e.target.value)}
                  placeholder="#" style={{ ...inputStyle, textAlign: "center" }} />
              </label>
              <label style={{ flex: 1 }}>
                <span style={{ fontSize: 11, color: C.gray400 }}>Total Teams</span>
                <input type="number" min="1" value={totalTeams} onChange={(e) => setTotalTeams(e.target.value)}
                  placeholder="e.g. 24" style={{ ...inputStyle, textAlign: "center" }} />
              </label>
              <label style={{ flex: 1 }}>
                <span style={{ fontSize: 11, color: C.gray400 }}>Total Points</span>
                <input type="number" min="0" step="0.5" value={totalPoints} onChange={(e) => setTotalPoints(e.target.value)}
                  placeholder="—" style={{ ...inputStyle, textAlign: "center" }} />
              </label>
            </div>
          </div>

          <label style={{ display: "block", marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1 }}>Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional details..."
              rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "14px", borderRadius: 10, border: `1px solid ${C.gray200}`,
              background: C.white, color: C.gray600, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} style={{
              flex: 2, padding: "14px", borderRadius: 10, border: "none",
              background: saving ? C.gray400 : C.gold, color: C.white, fontSize: 14, fontWeight: 700,
              cursor: saving ? "wait" : "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
              {saving ? "Saving..." : (initial ? "Update" : "Add Competition")}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
