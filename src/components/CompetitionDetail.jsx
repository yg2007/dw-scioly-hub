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
import { supabase } from "../lib/supabase";
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
    const { data: eventsData, error: eventsErr } = await supabase
      .from("events")
      .select("*");
    if (eventsErr) throw eventsErr;
    setEvents(eventsData || []);

    // Fetch all students (role='student') with user_events join
    const { data: usersData, error: usersErr } = await supabase
      .from("users")
      .select(
        `
        id, full_name, initials, avatar_color, role,
        user_events (event_id)
      `
      )
      .eq("role", "student");
    if (usersErr) throw usersErr;
    setStudents(usersData || []);

    // Fetch team assignments for this competition
    const { data: assignmentsData, error: assignmentsErr } = await supabase
      .from("competition_team_assignments")
      .select("*")
      .eq("competition_id", competition.id);
    if (assignmentsErr) throw assignmentsErr;

    // Build assignments map
    const assignmentMap = {};
    (assignmentsData || []).forEach((a) => {
      if (!assignmentMap[a.event_id]) assignmentMap[a.event_id] = {};
      assignmentMap[a.event_id][a.user_id] = a.team;
    });
    setAssignments(assignmentMap);

    // Fetch scores for this competition
    const { data: scoresData, error: scoresErr } = await supabase
      .from("competition_event_scores")
      .select("*")
      .eq("competition_id", competition.id);
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

  return (
    <div
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
      <div
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
        <div style={{ padding: "24px 28px" }}>
          {eventList.length === 0 ? (
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
          )}
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

