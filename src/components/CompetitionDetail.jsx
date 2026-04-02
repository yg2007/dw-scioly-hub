import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { C } from "../ui";
import { IS_PRODUCTION } from "../lib/featureFlags";
import { supabase, resilientQuery } from "../lib/supabase";
import { EVENTS, STUDENTS } from "../data/mockData";
import { useAppContext } from "../lib/AppContext";
import EventCard from "./CompetitionDetail/EventCard";
export default function CompetitionDetail({ competition, onClose }) {
  // ─────────────────────────────────────────────────────────────
  //  STATE
  // ─────────────────────────────────────────────────────────────
  const { userRole } = useAppContext();
  const isStaff = userRole === "admin" || userRole === "coach";

  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState({}); // { eventId: { userId: 'green'|'white' } }
  const [scores, setScores] = useState({}); // { `${eventId}-${team}`: { score, placement } }
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // { eventId, team } or null
  const [toast, setToast] = useState(null);

  // ─────────────────────────────────────────────────────────────
  //  LOAD DATA ON MOUNT
  // ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [competition?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (IS_PRODUCTION) {
        await loadProductionData();
      } else {
        loadPrototypeData();
      }
    } catch (err) {
      showToast(err.message || "Failed to load data", "warn");
    } finally {
      setLoading(false);
    }
  };

  const loadProductionData = async () => {
    // Fetch all events
    const { data: eventsData, error: eventsErr } = await resilientQuery(() =>
      supabase
        .from("events")
        .select("*")
    );
    if (eventsErr) throw eventsErr;
    setEvents(eventsData || []);

    // Fetch all students (role='student') with user_events join
    const { data: usersData, error: usersErr } = await resilientQuery(() =>
      supabase
        .from("users")
        .select(
          `
        id, full_name, initials, avatar_color, role,
        user_events (event_id)
      `
        )
        .eq("role", "student")
    );
    if (usersErr) throw usersErr;
    setStudents(usersData || []);

    // Fetch team assignments for this competition
    const { data: assignmentsData, error: assignmentsErr } = await resilientQuery(() =>
      supabase
        .from("competition_team_assignments")
        .select("*")
        .eq("competition_id", competition.id)
    );
    if (assignmentsErr) throw assignmentsErr;

    // Build assignments map
    const assignmentMap = {};
    (assignmentsData || []).forEach((a) => {
      if (!assignmentMap[a.event_id]) assignmentMap[a.event_id] = {};
      assignmentMap[a.event_id][a.user_id] = a.team;
    });
    setAssignments(assignmentMap);

    // Fetch scores for this competition
    const { data: scoresData, error: scoresErr } = await resilientQuery(() =>
      supabase
        .from("competition_event_scores")
        .select("*")
        .eq("competition_id", competition.id)
    );
    if (scoresErr) throw scoresErr;

    // Build scores map: key = "${eventId}-${team}"
    const scoreMap = {};
    (scoresData || []).forEach((s) => {
      const key = `${s.event_id}-${s.team}`;
      scoreMap[key] = {
        score: s.score,
        placement: s.placement,
        notes: s.notes,
      };
    });
    setScores(scoreMap);
  };

  const loadPrototypeData = () => {
    // Use mock data
    setEvents(EVENTS);
    setStudents(STUDENTS);
    setAssignments({});
    setScores({});
  };

  // ─────────────────────────────────────────────────────────────
  //  STUDENT ASSIGNMENT LOGIC
  // ─────────────────────────────────────────────────────────────
  const getStudentEventIds = (studentId) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return [];
    if (IS_PRODUCTION) {
      return (student.user_events || []).map((ue) => ue.event_id);
    } else {
      return student.events || [];
    }
  };

  const getAvailableStudents = (eventId) => {
    const eventStudentIds = students
      .filter((s) => {
        const eventIds = getStudentEventIds(s.id);
        return eventIds.includes(eventId);
      })
      .map((s) => s.id);

    const assigned = assignments[eventId] || {};
    return eventStudentIds.filter((sid) => !assigned[sid]);
  };

  const assignStudent = async (eventId, studentId, team) => {
    if (!isStaff) {
      showToast("Only staff can assign students", "warn");
      return;
    }

    if (IS_PRODUCTION) {
      try {
        const { error } = await supabase.from("competition_team_assignments").insert(
          {
            competition_id: competition.id,
            event_id: eventId,
            user_id: studentId,
            team: team,
          },
          { onConflict: "competition_id,event_id,user_id" }
        );
        if (error) throw error;
      } catch (err) {
        showToast(err.message || "Failed to assign student", "warn");
        return;
      }
    }

    setAssignments((prev) => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] || {}),
        [studentId]: team,
      },
    }));
  };

  const removeStudent = async (eventId, studentId) => {
    if (!isStaff) {
      showToast("Only staff can remove students", "warn");
      return;
    }

    if (IS_PRODUCTION) {
      try {
        const { error } = await supabase
          .from("competition_team_assignments")
          .delete()
          .eq("competition_id", competition.id)
          .eq("event_id", eventId)
          .eq("user_id", studentId);
        if (error) throw error;
      } catch (err) {
        showToast(err.message || "Failed to remove student", "warn");
        return;
      }
    }

    setAssignments((prev) => {
      const updated = { ...prev };
      if (updated[eventId]) {
        const { [studentId]: _removed, ...rest } = updated[eventId];
        updated[eventId] = rest;
      }
      return updated;
    });
  };

  // ─────────────────────────────────────────────────────────────
  //  SCORE ENTRY LOGIC
  // ─────────────────────────────────────────────────────────────
  const saveScore = async (eventId, team, score, placement) => {
    if (!isStaff) {
      showToast("Only staff can save scores", "warn");
      return;
    }

    setSaving({ eventId, team });
    try {
      if (IS_PRODUCTION) {
        const { error } = await supabase
          .from("competition_event_scores")
          .upsert(
            {
              competition_id: competition.id,
              event_id: eventId,
              team: team,
              score: score ? parseInt(score, 10) : null,
              placement: placement ? parseInt(placement, 10) : null,
            },
            { onConflict: "competition_id,event_id,team" }
          );
        if (error) throw error;
      }

      const key = `${eventId}-${team}`;
      setScores((prev) => ({
        ...prev,
        [key]: {
          score: score ? parseInt(score, 10) : null,
          placement: placement ? parseInt(placement, 10) : null,
        },
      }));

      showToast("Score saved", "success");
    } catch (err) {
      showToast(err.message || "Failed to save score", "warn");
    } finally {
      setSaving(null);
    }
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─────────────────────────────────────────────────────────────
  //  HELPERS
  // ─────────────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStudentName = (studentId) => {
    const s = students.find((st) => st.id === studentId);
    return s ? s.full_name || s.name : "Unknown";
  };

  const getStudentInitials = (studentId) => {
    const s = students.find((st) => st.id === studentId);
    return s ? s.initials : "?";
  };

  const getStudentColor = (studentId) => {
    const s = students.find((st) => st.id === studentId);
    return s ? s.avatar_color || s.color || C.teal : C.gray400;
  };


  const getTeamSize = (eventId) => {
    const e = events.find((ev) => ev.id === eventId);
    return e ? e.team_size : 2;
  };

  // ─────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────
  const eventList = useMemo(() => {
    // Show all events — the team competes in all of them.
    // If competition.event_ids is populated, use that to filter; otherwise show all.
    const ids = competition?.event_ids;
    if (ids && ids.length > 0) {
      return ids.map((id) => events.find((e) => e.id === id)).filter(Boolean);
    }
    return events;
  }, [competition?.event_ids, events]);

  // ── Quick Score Mode for mobile live scoring ────────────────
  // NOTE: All hooks MUST be before any conditional return to satisfy Rules of Hooks
  const [quickScoreMode, setQuickScoreMode] = useState(false);
  const [quickScores, setQuickScores] = useState({}); // { eventId: { team: { score, placement } } }
  const [quickSaving, setQuickSaving] = useState(false);

  // Overall placement state — initialized from competition record
  const [overallPlacement, setOverallPlacement] = useState(competition?.overall_placement ?? null);
  const [totalTeams, setTotalTeams] = useState(competition?.total_teams ?? null);
  const [totalPoints, setTotalPoints] = useState(competition?.total_points ?? null);

  // Initialize quick scores from existing scores
  useEffect(() => {
    if (quickScoreMode && Object.keys(scores).length > 0) {
      const qs = {};
      for (const [key, val] of Object.entries(scores)) {
        const [eid, team] = key.split("-");
        if (!qs[eid]) qs[eid] = {};
        qs[eid][team] = { score: val.score ? String(val.score) : "", placement: val.placement ? String(val.placement) : "" };
      }
      setQuickScores(qs);
    }
  }, [quickScoreMode, scores]);

  if (loading) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 12,
            color: C.gray400,
          }}
        >
          <Loader2
            size={32}
            style={{ animation: "spin 1s linear infinite" }}
          />
          <span style={{ fontSize: 16, fontWeight: 500 }}>
            Loading competition details...
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const updateQuickScore = (eventId, team, field, value) => {
    setQuickScores(prev => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] || {}),
        [team]: {
          ...(prev[eventId]?.[team] || { score: "", placement: "" }),
          [field]: value,
        },
      },
    }));
  };

  const saveAllQuickScores = async () => {
    setQuickSaving(true);
    try {
      // Save per-event scores
      for (const [eventId, teams] of Object.entries(quickScores)) {
        for (const [team, data] of Object.entries(teams)) {
          if (data.score || data.placement) {
            await saveScore(parseInt(eventId), team, data.score, data.placement);
          }
        }
      }

      // Save overall placement to competition record
      if (IS_PRODUCTION && competition?.id) {
        const { error: placementErr } = await supabase
          .from("competitions")
          .update({
            overall_placement: overallPlacement,
            total_teams: totalTeams,
            total_points: totalPoints,
          })
          .eq("id", competition.id);
        if (placementErr) throw placementErr;
      }

      showToast("All scores saved!", "success");
    } catch (err) {
      showToast("Some scores failed to save", "warn");
    } finally {
      setQuickSaving(false);
    }
  };

  return (
    <div
      className="comp-detail-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        zIndex: 40,
        padding: "20px",
      }}
      onClick={onClose}
    >
      {/* Mobile-responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .comp-detail-overlay { padding: 0 !important; }
          .comp-detail-modal { border-radius: 0 !important; margin: 0 !important; min-height: 100vh; max-width: 100% !important; }
          .comp-detail-header { padding: 16px !important; }
          .comp-detail-body { padding: 16px !important; }
          .team-grid { grid-template-columns: 1fr !important; }
          .score-grid { grid-template-columns: 1fr !important; }
          .quick-score-row { grid-template-columns: 1fr !important; }
          .avail-student-btn { padding: 6px 8px !important; }
        }
      `}</style>
      <div
        className="comp-detail-modal"
        style={{
          background: C.white,
          borderRadius: 16,
          width: "100%",
          maxWidth: 900,
          marginTop: 20,
          marginBottom: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div
          className="comp-detail-header"
          style={{
            padding: "24px 28px",
            borderBottom: `1px solid ${C.gray200}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.gray200}`,
                  background: C.white,
                  color: C.gray600,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ← Back
              </button>
              {isStaff && (
                <button
                  onClick={() => setQuickScoreMode(!quickScoreMode)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "none",
                    background: quickScoreMode ? C.coral : C.teal,
                    color: C.white,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {quickScoreMode ? "✕ Exit Quick Score" : "⚡ Quick Score"}
                </button>
              )}
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: C.navy,
                marginBottom: 6,
              }}
            >
              {competition?.name}
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 13,
                color: C.gray600,
                flexWrap: "wrap",
              }}
            >
              <span>{formatDate(competition?.date)}</span>
              {competition?.location && (
                <>
                  <span>•</span>
                  <span>{competition?.location}</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${C.gray200}`,
              background: C.white,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.gray400,
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* EVENT CARDS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="comp-detail-body" style={{ padding: "24px 28px" }}>
          {/* ═══════ QUICK SCORE MODE ═══════ */}
          {quickScoreMode ? (
            <div>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 16, flexWrap: "wrap", gap: 8,
              }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 2 }}>
                    ⚡ Quick Score Entry
                  </h2>
                  <p style={{ fontSize: 12, color: C.gray400 }}>
                    Enter placements for each event — tap Save All when done
                  </p>
                </div>
                <button
                  onClick={saveAllQuickScores}
                  disabled={quickSaving}
                  style={{
                    padding: "12px 24px", borderRadius: 10, border: "none",
                    background: quickSaving ? C.gray400 : C.teal, color: C.white,
                    fontSize: 14, fontWeight: 700, cursor: quickSaving ? "default" : "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
                    minHeight: 44,
                  }}
                >
                  {quickSaving ? (
                    <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Saving...</>
                  ) : (
                    <><Check size={16} /> Save All Scores</>
                  )}
                </button>
              </div>

              {/* ── Overall Team Placement ── */}
              <div style={{
                display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
                padding: "14px 16px", marginBottom: 16,
                background: overallPlacement && overallPlacement <= 3 ? C.goldLight : C.offWhite || "#F9FAFB",
                borderRadius: 12, border: `1px solid ${C.gray200}`,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.navy, whiteSpace: "nowrap" }}>
                  🏆 Overall Placement
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="number" inputMode="numeric" min="1"
                    value={overallPlacement ?? ""}
                    onChange={e => setOverallPlacement(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="#"
                    style={{
                      width: 60, padding: "10px 6px", borderRadius: 8,
                      border: `1px solid ${C.gray200}`, fontSize: 18, fontWeight: 800,
                      fontFamily: "inherit", outline: "none", textAlign: "center",
                      boxSizing: "border-box", minHeight: 44,
                    }}
                  />
                  <span style={{ fontSize: 13, color: C.gray400 }}>of</span>
                  <input
                    type="number" inputMode="numeric" min="1"
                    value={totalTeams ?? ""}
                    onChange={e => setTotalTeams(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="teams"
                    style={{
                      width: 72, padding: "10px 6px", borderRadius: 8,
                      border: `1px solid ${C.gray200}`, fontSize: 16, fontWeight: 700,
                      fontFamily: "inherit", outline: "none", textAlign: "center",
                      boxSizing: "border-box", minHeight: 44,
                    }}
                  />
                  <span style={{ fontSize: 13, color: C.gray400, marginLeft: 8 }}>pts</span>
                  <input
                    type="number" inputMode="decimal" min="0"
                    value={totalPoints ?? ""}
                    onChange={e => setTotalPoints(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="—"
                    style={{
                      width: 72, padding: "10px 6px", borderRadius: 8,
                      border: `1px solid ${C.gray200}`, fontSize: 16, fontWeight: 700,
                      fontFamily: "inherit", outline: "none", textAlign: "center",
                      boxSizing: "border-box", minHeight: 44,
                    }}
                  />
                </div>
              </div>

              {/* Quick score table header */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px",
                gap: 8, padding: "8px 12px", fontSize: 11, fontWeight: 700,
                color: C.gray400, textTransform: "uppercase", letterSpacing: 0.5,
                borderBottom: `1px solid ${C.gray200}`,
              }}
                className="quick-score-row"
              >
                <span>Event</span>
                <span style={{ textAlign: "center" }}>🟢 Place</span>
                <span style={{ textAlign: "center" }}>🟢 Score</span>
                <span style={{ textAlign: "center" }}>⚪ Place</span>
                <span style={{ textAlign: "center" }}>⚪ Score</span>
              </div>

              {/* Quick score rows */}
              {eventList.map(event => {
                const eid = event?.id;
                const greenData = quickScores[eid]?.green || { score: "", placement: "" };
                const whiteData = quickScores[eid]?.white || { score: "", placement: "" };
                const qInputStyle = {
                  width: "100%", padding: "10px 6px", borderRadius: 8,
                  border: `1px solid ${C.gray200}`, fontSize: 16, fontWeight: 700,
                  fontFamily: "inherit", outline: "none", textAlign: "center",
                  boxSizing: "border-box", minHeight: 44,
                };
                return (
                  <div key={eid} style={{
                    display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px",
                    gap: 8, padding: "10px 12px", alignItems: "center",
                    borderBottom: `1px solid ${C.gray100}`,
                  }}
                    className="quick-score-row"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{event?.icon || "📋"}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {event?.name}
                      </span>
                    </div>
                    <input type="number" inputMode="numeric" value={greenData.placement}
                      onChange={e => updateQuickScore(eid, "green", "placement", e.target.value)}
                      placeholder="#" style={{ ...qInputStyle, background: "#F0FFF0" }} />
                    <input type="number" inputMode="numeric" value={greenData.score}
                      onChange={e => updateQuickScore(eid, "green", "score", e.target.value)}
                      placeholder="—" style={{ ...qInputStyle, background: "#F0FFF0" }} />
                    <input type="number" inputMode="numeric" value={whiteData.placement}
                      onChange={e => updateQuickScore(eid, "white", "placement", e.target.value)}
                      placeholder="#" style={{ ...qInputStyle, background: "#F8F8F8" }} />
                    <input type="number" inputMode="numeric" value={whiteData.score}
                      onChange={e => updateQuickScore(eid, "white", "score", e.target.value)}
                      placeholder="—" style={{ ...qInputStyle, background: "#F8F8F8" }} />
                  </div>
                );
              })}
            </div>
          ) : (
          /* ═══════ NORMAL MODE ═══════ */
          eventList.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: C.gray400,
                fontSize: 14,
                background: C.offWhite,
                borderRadius: 12,
                border: `1px solid ${C.gray200}`,
              }}
            >
              No events assigned to this competition.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {eventList.map((event) => (
                <EventCard
                  key={event?.id}
                  event={event}
                  expanded={expandedEvent === event?.id}
                  onToggle={() =>
                    setExpandedEvent(
                      expandedEvent === event?.id ? null : event?.id
                    )
                  }
                  assignments={assignments[event?.id] || {}}
                  availableStudents={getAvailableStudents(event?.id)}
                  onAssignStudent={(studentId, team) =>
                    assignStudent(event?.id, studentId, team)
                  }
                  onRemoveStudent={(studentId) =>
                    removeStudent(event?.id, studentId)
                  }
                  scores={scores}
                  onSaveScore={(team, score, placement) =>
                    saveScore(event?.id, team, score, placement)
                  }
                  isSaving={saving?.eventId === event?.id}
                  students={students}
                  getStudentName={getStudentName}
                  getStudentInitials={getStudentInitials}
                  getStudentColor={getStudentColor}
                  getTeamSize={getTeamSize}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TOAST */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "14px 24px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            background:
              toast.type === "warn" ? "#FFF3E0" : "#E8F5E9",
            color: toast.type === "warn" ? "#E65100" : "#2E7D32",
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            zIndex: 100,
          }}
        >
          {toast.type === "warn" ? (
            <AlertTriangle size={16} />
          ) : (
            <Check size={16} />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

