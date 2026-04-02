import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, CheckCircle2, Search, Plus, Pencil } from 'lucide-react';
import { SkeletonEventGrid } from './shared/Skeleton';
import { C } from '../ui';
import { EVENTS, STUDENTS, PARTNERSHIPS, generateMastery } from '../data/mockData';
import { IS_PRODUCTION } from '../lib/featureFlags';
import { useAppContext } from '../lib/AppContext';
import { useUnifiedEvents } from '../hooks/useUnifiedData';
import { supabase } from '../lib/supabase';
import { useQuery } from '../lib/query';
import EventManagementModal from './EventManagementModal';

// ═══════════════════════════════════════════════════════════════
//  Events List Page
//
//  Student view:  Shows assigned events with personal mastery bars
//  Coach/Admin:   Shows ALL events with team readiness overview —
//                 student count, avg mastery, partnership status,
//                 and color-coded readiness indicators.
// ═══════════════════════════════════════════════════════════════

const TYPE_CONFIG = {
  study: { bg: C.goldLight, text: "#A0522D", label: "Study" },
  lab:   { bg: "#E2F0E6", text: C.tealDark, label: "Lab" },
  build: { bg: "#F5E2DC", text: C.coral, label: "Build" },
};

export default function EventsListPage() {
  const navigate = useNavigate();
  const { currentUser: user, userRole } = useAppContext();
  const isCoach = userRole === "coach" || userRole === "admin";

  const { events, loading: eventsLoading, refetch } = useUnifiedEvents();

  // ── Coach-specific data (production, cached) ─────────────────
  const fetchCoachData = useCallback(async () => {
    const [studentsRes, partnershipsRes, masteryRes, topicsRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, initials, avatar_color, is_alumni, user_events(event_id)")
        .eq("role", "student")
        .or("is_alumni.eq.false,is_alumni.is.null"),
      supabase
        .from("partnerships")
        .select("id, event_id, partner_a, partner_b"),
      supabase
        .from("topic_mastery")
        .select("user_id, event_id, score"),
      supabase
        .from("event_topics")
        .select("event_id, name"),
    ]);
    return {
      students: (studentsRes.data || []).map(s => ({
        ...s,
        eventIds: (s.user_events || []).map(ue => ue.event_id),
      })),
      partnerships: partnershipsRes.data || [],
      mastery: masteryRes.data || [],
      eventTopics: topicsRes.data || [],
    };
  }, []);

  const { data: coachDataCached, loading: coachLoading } = useQuery(
    "events-list-coach-data",
    fetchCoachData,
    { staleTime: 5 * 60 * 1000, enabled: IS_PRODUCTION && isCoach }
  );
  const coachData = coachDataCached || { students: [], partnerships: [], mastery: [], eventTopics: [] };

  // ── Event management modal (coach only) ─────────────────────
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // event object for editing

  // ── Search / filter (coach only) ────────────────────────────
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  // ── Compute per-event stats for coach view ──────────────────
  const coachEventStats = useMemo(() => {
    if (!isCoach) return {};

    const stats = {};

    if (IS_PRODUCTION) {
      // Build lookup maps
      const masteryByEvent = {};  // eventId → [scores]
      for (const row of coachData.mastery) {
        if (!masteryByEvent[row.event_id]) masteryByEvent[row.event_id] = [];
        masteryByEvent[row.event_id].push(Number(row.score) || 0);
      }

      const topicCountByEvent = {};
      for (const t of coachData.eventTopics) {
        topicCountByEvent[t.event_id] = (topicCountByEvent[t.event_id] || 0) + 1;
      }

      const partnershipsByEvent = {};
      for (const p of coachData.partnerships) {
        if (!partnershipsByEvent[p.event_id]) partnershipsByEvent[p.event_id] = [];
        partnershipsByEvent[p.event_id].push(p);
      }

      for (const event of events) {
        const eid = event.id;
        const assignedStudents = coachData.students.filter(s => s.eventIds.includes(eid));
        const scores = masteryByEvent[eid] || [];
        const avgMastery = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;
        const partnerships = partnershipsByEvent[eid] || [];
        const pairedIds = new Set();
        partnerships.forEach(p => { pairedIds.add(p.partner_a); pairedIds.add(p.partner_b); });
        const teamSize = event.team_size || event.teamSize || 2;

        stats[eid] = {
          studentCount: assignedStudents.length,
          students: assignedStudents.slice(0, 5), // for avatar display
          avgMastery,
          hasMasteryData: scores.length > 0,
          partnershipCount: partnerships.length,
          allPaired: assignedStudents.length > 0 && assignedStudents.every(s => pairedIds.has(s.id)),
          unpairedCount: assignedStudents.filter(s => !pairedIds.has(s.id)).length,
          topicCount: topicCountByEvent[eid] || 0,
          teamSize,
        };
      }
    } else {
      // Mock mode
      for (const event of EVENTS) {
        const eid = event.id;
        const assignedStudents = STUDENTS.filter(s => s.events.includes(eid));
        const eventPartnerships = PARTNERSHIPS.filter(p => p.eventId === eid);
        const pairedIds = new Set();
        eventPartnerships.forEach(p => p.partners.forEach(pid => pairedIds.add(pid)));

        // Compute avg mastery across all assigned students
        let totalScore = 0;
        let scoreCount = 0;
        for (const student of assignedStudents) {
          const m = generateMastery(student.id, eid) || [];
          if (m.length > 0) {
            const avg = m.reduce((s, t) => s + t.score, 0) / m.length;
            totalScore += avg;
            scoreCount++;
          }
        }

        stats[eid] = {
          studentCount: assignedStudents.length,
          students: assignedStudents.slice(0, 5),
          avgMastery: scoreCount > 0 ? Math.round(totalScore / scoreCount) : null,
          hasMasteryData: scoreCount > 0,
          partnershipCount: eventPartnerships.length,
          allPaired: assignedStudents.length > 0 && assignedStudents.every(s => pairedIds.has(s.id)),
          unpairedCount: assignedStudents.filter(s => !pairedIds.has(s.id)).length,
          topicCount: (event.topics || []).length,
          teamSize: event.teamSize || 2,
        };
      }
    }

    return stats;
  }, [isCoach, events, coachData]);

  // ── Student: personal mastery per event ─────────────────────
  const studentEvents = useMemo(() => {
    if (isCoach) return [];
    const userEvents = events.filter(e => user?.events?.includes(e.id));
    return userEvents.map(ev => {
      let avg = 0;
      if (!IS_PRODUCTION && user?.id) {
        const m = generateMastery(user.id, ev.id) || [];
        avg = m.length > 0 ? Math.round(m.reduce((s, t) => s + t.score, 0) / m.length) : 0;
      }
      return { ...ev, mastery: avg };
    });
  }, [events, user, isCoach]);

  // ── Filtered events for coach ───────────────────────────────
  const filteredEvents = useMemo(() => {
    if (!isCoach) return [];
    let list = [...events];
    if (filterType !== "all") {
      list = list.filter(e => e.type === filterType);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q));
    }
    return list;
  }, [events, filterType, search, isCoach]);

  // ── Loading ─────────────────────────────────────────────────
  if (eventsLoading || coachLoading) {
    return <SkeletonEventGrid count={6} style={{ padding: "4px 0" }} />;
  }

  // ═══════════════════════════════════════════════════════════════
  //  STUDENT VIEW
  // ═══════════════════════════════════════════════════════════════
  if (!isCoach) {
    return (
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>My Events</h2>
        <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
          {studentEvents.length} events assigned
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {studentEvents.map(ev => {
            const tc = TYPE_CONFIG[ev.type] || TYPE_CONFIG.study;
            const teamSize = ev.teamSize || ev.team_size || 2;
            const topicsCount = (ev.topics || []).length;

            return (
              <div key={ev.id} onClick={() => navigate(`/events/${ev.id}`)}
                className="card-hover"
                style={{ background: C.white, borderRadius: 16, padding: 22, border: `1px solid ${C.gray200}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{ev.icon}</span>
                  <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700,
                    textTransform: "uppercase", background: tc.bg, color: tc.text }}>{ev.type}</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{ev.name}</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1, height: 6, background: C.gray100, borderRadius: 100 }}>
                    <div style={{ height: "100%", borderRadius: 100, width: `${ev.mastery}%`,
                      background: ev.mastery >= 80 ? C.teal : ev.mastery >= 60 ? C.gold : C.coral }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700,
                    color: ev.mastery >= 80 ? C.tealDark : ev.mastery >= 60 ? C.gold : C.coral }}>
                    {ev.mastery}%
                  </span>
                </div>
                <div style={{ fontSize: 12, color: C.gray400 }}>
                  Team of {teamSize} · {topicsCount} topics
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  COACH / ADMIN VIEW — Team Readiness Overview
  // ═══════════════════════════════════════════════════════════════

  // Summary stats
  const totalStudentsAssigned = new Set(
    Object.values(coachEventStats).flatMap(s =>
      (s.students || []).map(st => st.id)
    )
  ).size;
  const eventsWithStudents = Object.values(coachEventStats).filter(s => s.studentCount > 0).length;
  const avgReadiness = (() => {
    const withData = Object.values(coachEventStats).filter(s => s.hasMasteryData);
    if (withData.length === 0) return null;
    return Math.round(withData.reduce((sum, s) => sum + s.avgMastery, 0) / withData.length);
  })();
  const totalUnpaired = Object.values(coachEventStats).reduce((s, e) => s + e.unpairedCount, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>All Events — Team Readiness</h2>
          <p style={{ color: C.gray600, fontSize: 14 }}>
            Overview of student assignments, mastery levels, and partnership status across all {events.length} events.
          </p>
        </div>
        {IS_PRODUCTION && (
          <button onClick={() => { setEditingEvent(null); setShowEventModal(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
              background: C.teal, color: C.white, border: "none", borderRadius: 10,
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              flexShrink: 0,
            }}>
            <Plus size={14} /> Add Event
          </button>
        )}
      </div>

      {/* Summary Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Active Events", value: eventsWithStudents, sub: `of ${events.length}`, color: C.navy },
          { label: "Students Assigned", value: totalStudentsAssigned, sub: "across all events", color: C.teal },
          { label: "Team Readiness", value: avgReadiness !== null ? `${avgReadiness}%` : "—", sub: avgReadiness !== null ? "avg mastery" : "no data yet", color: C.gold },
          { label: "Unpaired Students", value: totalUnpaired, sub: totalUnpaired === 0 ? "all paired" : "need partners", color: totalUnpaired === 0 ? C.teal : C.coral },
        ].map((s, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 12, padding: "14px 20px", border: `1px solid ${C.gray200}` }}>
            <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Search + Type Filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8,
          background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 10, padding: "0 14px",
        }}>
          <Search size={16} color={C.gray400} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search events..."
            style={{ flex: 1, border: "none", outline: "none", padding: "12px 0",
              fontSize: 14, fontFamily: "inherit", background: "transparent" }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "study", "lab", "build"].map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{
              padding: "8px 16px", borderRadius: 8,
              border: filterType === t ? "none" : `1px solid ${C.gray200}`,
              background: filterType === t ? C.navy : C.white,
              color: filterType === t ? C.white : C.gray600,
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              textTransform: "capitalize",
            }}>
              {t === "all" ? "All" : TYPE_CONFIG[t]?.label || t}
            </button>
          ))}
        </div>
      </div>

      {/* Event Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {filteredEvents.map(ev => {
          const s = coachEventStats[ev.id] || {};
          const tc = TYPE_CONFIG[ev.type] || TYPE_CONFIG.study;
          const readiness = s.avgMastery;
          const hasData = s.hasMasteryData;

          // Readiness color
          const readinessColor = !hasData ? C.gray400 : readiness >= 75 ? C.teal : readiness >= 50 ? C.gold : C.coral;
          const readinessBg = !hasData ? C.gray100 : readiness >= 75 ? "#E2F0E6" : readiness >= 50 ? C.goldLight : "#FFEAE2";

          return (
            <div key={ev.id} onClick={() => navigate(`/events/${ev.id}`)}
              className="card-hover"
              style={{
                background: C.white, borderRadius: 16, padding: 22,
                border: `1px solid ${C.gray200}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}>

              {/* Top row: icon, name, type badge */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{ev.icon}</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{ev.name}</h3>
                      {ev.is_trial && (
                        <span style={{ padding: "1px 6px", borderRadius: 100, fontSize: 9, fontWeight: 700,
                          textTransform: "uppercase", background: "#EDE9FE", color: "#7C3AED" }}>Trial</span>
                      )}
                    </div>
                    <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 700,
                      textTransform: "uppercase", background: tc.bg, color: tc.text }}>{tc.label}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {IS_PRODUCTION && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingEvent(ev); setShowEventModal(true); }}
                      style={{
                        width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.gray200}`,
                        background: C.white, cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center", color: C.gray400,
                      }}
                      title="Edit event"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                  {/* Readiness badge */}
                  <div style={{
                    padding: "6px 12px", borderRadius: 10, background: readinessBg,
                    fontSize: 14, fontWeight: 800, color: readinessColor,
                    minWidth: 48, textAlign: "center",
                  }}>
                    {hasData ? `${readiness}%` : "—"}
                  </div>
                </div>
              </div>

              {/* Readiness bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.gray400, marginBottom: 4 }}>
                  <span>Team Readiness</span>
                  <span>{hasData ? `${readiness}% avg mastery` : "No mastery data yet"}</span>
                </div>
                <div style={{ height: 6, background: C.gray100, borderRadius: 100 }}>
                  <div style={{
                    height: "100%", borderRadius: 100,
                    width: hasData ? `${readiness}%` : "0%",
                    background: readinessColor, transition: "width 0.5s ease",
                  }} />
                </div>
              </div>

              {/* Student avatars + count */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Users size={14} color={C.gray400} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: s.studentCount > 0 ? C.navy : C.gray400 }}>
                    {s.studentCount} student{s.studentCount !== 1 ? "s" : ""}
                  </span>
                  {s.studentCount > 0 && (
                    <div style={{ display: "flex", marginLeft: 6 }}>
                      {(s.students || []).slice(0, 4).map((st, i) => (
                        <div key={st.id} style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: st.avatar_color || st.color || C.teal,
                          border: `2px solid ${C.white}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: C.white, fontSize: 8, fontWeight: 700,
                          marginLeft: i > 0 ? -6 : 0, zIndex: 5 - i,
                        }}>
                          {st.initials}
                        </div>
                      ))}
                      {s.studentCount > 4 && (
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: C.gray200, border: `2px solid ${C.white}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: C.gray600, fontSize: 8, fontWeight: 700, marginLeft: -6,
                        }}>
                          +{s.studentCount - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Partnership status */}
                {s.studentCount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {s.allPaired ? (
                      <CheckCircle2 size={14} color={C.teal} />
                    ) : s.unpairedCount > 0 ? (
                      <AlertTriangle size={14} color={C.coral} />
                    ) : null}
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: s.allPaired ? C.teal : s.unpairedCount > 0 ? C.coral : C.gray400,
                    }}>
                      {s.allPaired ? "All paired" : s.unpairedCount > 0 ? `${s.unpairedCount} unpaired` : `${s.partnershipCount} pair${s.partnershipCount !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer: topics + team size */}
              <div style={{ fontSize: 11, color: C.gray400, display: "flex", gap: 12, borderTop: `1px solid ${C.gray100}`, paddingTop: 10 }}>
                <span>Team of {s.teamSize}</span>
                <span>{s.topicCount} topics</span>
                {s.partnershipCount > 0 && <span>{s.partnershipCount} partnership{s.partnershipCount !== 1 ? "s" : ""}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: C.gray400 }}>
          No events match your search.
        </div>
      )}

      {/* Event Management Modal */}
      {showEventModal && (
        <EventManagementModal
          event={editingEvent}
          onClose={() => { setShowEventModal(false); setEditingEvent(null); }}
          onSaved={() => { refetch?.(); }}
        />
      )}
    </div>
  );
}
