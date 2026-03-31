import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronRight, TrendingUp, Minus, TrendingDown, Search, ArrowUpDown, RefreshCw, ChevronLeft } from 'lucide-react';
import { SkeletonDashboard } from './shared/Skeleton';
import { C } from '../ui';
import { IS_PRODUCTION } from '../lib/featureFlags';
import { EVENTS, STUDENTS, generateMastery } from '../data/mockData';
import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════
//  Student Capability Matrix — Coach/Admin Page
//
//  Shows every student's strengths/weaknesses across events.
//  Three views: overview cards → student detail → event heatmap
// ═══════════════════════════════════════════════════════════════

const scoreColor = (score) => score >= 80 ? C.teal : score >= 60 ? C.gold : C.coral;
const scoreBg = (score) => score >= 80 ? '#E6F5F0' : score >= 60 ? '#FEF3E2' : '#FBE8E4';

export default function StudentCapabilityMatrix() {
  // ── UI state ─────────────────────────────────────────────────
  const [view, setView] = useState('overview');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  // ── Production data ──────────────────────────────────────────
  const [prodStudents, setProdStudents] = useState([]);
  const [prodEvents, setProdEvents] = useState([]);
  const [prodMastery, setProdMastery] = useState([]);
  const [dataLoading, setDataLoading] = useState(IS_PRODUCTION);

  const loadProductionData = useCallback(async () => {
    if (!IS_PRODUCTION) return;
    setDataLoading(true);
    try {
      const [studentsRes, eventsRes, masteryRes, topicsRes] = await Promise.all([
        supabase.from("users")
          .select("id, full_name, initials, avatar_color, role, user_events(event_id)")
          .eq("role", "student").order("full_name"),
        supabase.from("events")
          .select("id, name, type, team_size, icon").order("id"),
        supabase.from("topic_mastery")
          .select("user_id, event_id, topic, score, trend"),
        supabase.from("event_topics")
          .select("event_id, name, sort_order").order("sort_order"),
      ]);

      const topicsByEvent = {};
      (topicsRes.data || []).forEach(t => {
        if (!topicsByEvent[t.event_id]) topicsByEvent[t.event_id] = [];
        topicsByEvent[t.event_id].push(t.name);
      });

      setProdStudents((studentsRes.data || []).map(s => ({
        id: s.id, name: s.full_name, initials: s.initials,
        color: s.avatar_color || C.teal,
        events: (s.user_events || []).map(ue => ue.event_id),
      })));
      setProdEvents((eventsRes.data || []).map(e => ({
        ...e, teamSize: e.team_size, topics: topicsByEvent[e.id] || [],
      })));
      setProdMastery(masteryRes.data || []);
    } catch (err) {
      console.error("StudentCapabilityMatrix load:", err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadProductionData(); }, [loadProductionData]);

  // ── Unified data ─────────────────────────────────────────────
  const students = IS_PRODUCTION ? prodStudents : STUDENTS;
  const events = IS_PRODUCTION ? prodEvents : EVENTS;

  const prodMasteryMap = useMemo(() => {
    if (!IS_PRODUCTION) return null;
    const map = {};
    for (const row of prodMastery) {
      if (!map[row.user_id]) map[row.user_id] = {};
      if (!map[row.user_id][row.event_id]) map[row.user_id][row.event_id] = [];
      map[row.user_id][row.event_id].push({
        topic: row.topic, score: Number(row.score) || 0, trend: row.trend || 'stable',
      });
    }
    return map;
  }, [prodMastery]);

  const getMastery = useCallback((studentId, eventId) => {
    if (!IS_PRODUCTION) return generateMastery(studentId, eventId) || [];
    const real = prodMasteryMap?.[studentId]?.[eventId];
    if (real && real.length > 0) return real;
    const event = prodEvents.find(e => e.id === eventId);
    return (event?.topics || []).map(t => ({ topic: t, score: 0, trend: 'stable' }));
  }, [prodMasteryMap, prodEvents]);

  // ── Compute student mastery data ─────────────────────────────
  const studentData = useMemo(() => {
    return students.map(student => {
      const eventMasteries = (student.events || []).map(eventId => {
        const event = events.find(e => e.id === eventId);
        const topics = getMastery(student.id, eventId);
        const hasRealData = topics.some(t => t.score > 0);
        const avg = topics.length > 0 && hasRealData
          ? Math.round(topics.reduce((sum, t) => sum + t.score, 0) / topics.length) : 0;
        return { eventId, eventName: event?.name || '', eventIcon: event?.icon || '', avg, topics, hasRealData };
      });

      const withData = eventMasteries.filter(em => em.hasRealData);
      const overallAvg = withData.length > 0
        ? Math.round(withData.reduce((sum, em) => sum + em.avg, 0) / withData.length) : 0;

      return { ...student, eventMasteries, overallAvg, hasAnyData: withData.length > 0 };
    });
  }, [students, events, getMastery]);

  // ── Filter + sort ────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    let list = studentData.filter(s =>
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return sortAsc
          ? (a.name || '').localeCompare(b.name || '')
          : (b.name || '').localeCompare(a.name || '');
      }
      return sortAsc ? a.overallAvg - b.overallAvg : b.overallAvg - a.overallAvg;
    });
    return list;
  }, [studentData, searchTerm, sortBy, sortAsc]);

  // ── Loading ──────────────────────────────────────────────────
  if (dataLoading) {
    return <SkeletonDashboard stats={4} rows={10} style={{ padding: "4px 0" }} />;
  }

  // ── Back button helper ───────────────────────────────────────
  const BackButton = ({ label }) => (
    <button onClick={() => { setView('overview'); setSelectedStudentId(null); setSelectedEventId(null); }}
      style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
        color: C.gray400, fontSize: 13, cursor: "pointer", marginBottom: 20, fontFamily: "inherit", padding: 0 }}>
      <ChevronLeft size={16} /> {label || "Back to Overview"}
    </button>
  );

  // ═══════════════════════════════════════════════════════════════
  //  VIEW: Student Detail
  // ═══════════════════════════════════════════════════════════════
  if (view === 'student' && selectedStudentId) {
    const student = studentData.find(s => s.id === selectedStudentId);
    if (!student) return <BackButton />;

    // Find strongest/weakest topics across all events
    const allTopics = student.eventMasteries.flatMap(em =>
      em.topics.map(t => ({ ...t, eventName: em.eventName, eventIcon: em.eventIcon }))
    );
    const withScores = allTopics.filter(t => t.score > 0);
    const strongest = withScores.length > 0 ? withScores.reduce((a, b) => a.score > b.score ? a : b) : null;
    const weakest = withScores.length > 0 ? withScores.reduce((a, b) => a.score < b.score ? a : b) : null;

    return (
      <div>
        <BackButton />
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: student.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.white, fontSize: 20, fontWeight: 700 }}>{student.initials}</div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: C.navy, marginBottom: 4 }}>{student.name}</h1>
            <p style={{ fontSize: 13, color: C.gray600 }}>Assigned to {(student.events || []).length} events</p>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: student.hasAnyData ? scoreColor(student.overallAvg) : C.gray400 }}>
              {student.hasAnyData ? `${student.overallAvg}%` : "—"}
            </div>
            <div style={{ fontSize: 12, color: C.gray400 }}>Overall Mastery</div>
          </div>
        </div>

        {/* AI Insight */}
        {strongest && weakest && (
          <div style={{ background: "#F0F8F5", border: `1px solid ${C.teal}40`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.teal, marginBottom: 10 }}>🎯 AI Insight</div>
            <p style={{ fontSize: 13, color: C.gray600, lineHeight: 1.6, margin: 0 }}>
              <strong>{student.name}</strong> is strongest in <strong style={{ color: C.teal }}>{strongest.topic}</strong> ({strongest.score}%, {strongest.eventName}).
              Weakest area: <strong style={{ color: C.coral }}>{weakest.topic}</strong> ({weakest.score}%, {weakest.eventName}).
              Recommend focusing study time on {weakest.topic} to raise overall readiness.
            </p>
          </div>
        )}

        {/* Event cards with topic breakdowns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 20 }}>
          {student.eventMasteries.map(em => (
            <div key={em.eventId} style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.gray200}`, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>{em.eventIcon}</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{em.eventName}</h3>
                  <p style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>{em.topics.length} topics</p>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: em.hasRealData ? scoreColor(em.avg) : C.gray400 }}>
                  {em.hasRealData ? `${em.avg}%` : "—"}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {em.topics.map((topic, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, color: C.gray600 }}>{topic.topic}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 700, color: topic.score > 0 ? scoreColor(topic.score) : C.gray400 }}>
                          {topic.score > 0 ? `${topic.score}%` : "—"}
                        </span>
                        {topic.score > 0 && (
                          topic.trend === 'up' ? <TrendingUp size={12} color={C.teal} /> :
                          topic.trend === 'down' ? <TrendingDown size={12} color={C.coral} /> :
                          <Minus size={12} color={C.gray400} />
                        )}
                      </div>
                    </div>
                    <div style={{ height: 6, background: C.gray100, borderRadius: 100 }}>
                      <div style={{ height: "100%", borderRadius: 100, width: `${topic.score}%`,
                        background: topic.score > 0 ? scoreColor(topic.score) : C.gray200 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  VIEW: Event Drill-down (Topic Heatmap)
  // ═══════════════════════════════════════════════════════════════
  if (view === 'event' && selectedEventId) {
    const event = events.find(e => e.id === selectedEventId);
    if (!event) return <BackButton />;

    const topics = event.topics || [];
    const eventStudents = studentData
      .filter(s => (s.events || []).includes(selectedEventId))
      .map(s => {
        const em = s.eventMasteries.find(e => e.eventId === selectedEventId);
        return { ...s, eventAvg: em?.avg || 0, topics: em?.topics || [], hasRealData: em?.hasRealData || false };
      })
      .sort((a, b) => b.eventAvg - a.eventAvg);

    return (
      <div>
        <BackButton />
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <span style={{ fontSize: 42 }}>{event.icon}</span>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: C.navy, marginBottom: 4 }}>{event.name}</h1>
            <p style={{ fontSize: 13, color: C.gray600 }}>
              {eventStudents.length} students · {topics.length} topics · {event.type}
            </p>
          </div>
        </div>

        {/* Student Rankings */}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 16 }}>Student Rankings</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
          {eventStudents.map((s, rank) => (
            <div key={s.id} onClick={() => { setSelectedStudentId(s.id); setView('student'); }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, cursor: "pointer" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: scoreColor(s.eventAvg),
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.white, fontSize: 12, fontWeight: 700 }}>{rank + 1}</div>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: s.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.white, fontSize: 11, fontWeight: 700 }}>{s.initials}</div>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.navy }}>{s.name}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.hasRealData ? scoreColor(s.eventAvg) : C.gray400 }}>
                {s.hasRealData ? `${s.eventAvg}%` : "—"}
              </div>
            </div>
          ))}
          {eventStudents.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: C.gray400, fontSize: 14 }}>No students assigned to this event.</div>
          )}
        </div>

        {/* Topic Heatmap */}
        {eventStudents.length > 0 && topics.length > 0 && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 16 }}>Topic Coverage Heatmap</h2>
            <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.gray200}`, padding: 20, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr>
                    <th style={{ padding: 10, textAlign: "left", fontSize: 12, fontWeight: 700, color: C.navy,
                      borderBottom: `1px solid ${C.gray200}`, background: C.offWhite, minWidth: 140 }}>Student</th>
                    {topics.map(t => (
                      <th key={t} style={{ padding: 10, textAlign: "center", fontSize: 11, fontWeight: 700, color: C.gray600,
                        borderBottom: `1px solid ${C.gray200}`, background: C.offWhite, maxWidth: 100 }}
                        title={t}>{t.length > 12 ? t.slice(0, 10) + '…' : t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eventStudents.map(s => (
                    <tr key={s.id}>
                      <td style={{ padding: 10, fontSize: 13, fontWeight: 600, color: C.navy, borderBottom: `1px solid ${C.gray100}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 22, height: 22, borderRadius: "50%", background: s.color,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: C.white, fontSize: 9, fontWeight: 700 }}>{s.initials}</div>
                          {(s.name || '').split(' ')[0]}
                        </div>
                      </td>
                      {topics.map(topicName => {
                        const td = (s.topics || []).find(t => t.topic === topicName);
                        const score = td?.score || 0;
                        return (
                          <td key={topicName} style={{ padding: 8, textAlign: "center", fontSize: 11, fontWeight: 700,
                            borderBottom: `1px solid ${C.gray100}`,
                            background: score > 0 ? scoreBg(score) : "transparent",
                            color: score > 0 ? scoreColor(score) : C.gray300 }}
                            title={`${topicName}: ${score}%`}>
                            {score > 0 ? `${score}%` : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Legend */}
            <div style={{ display: "flex", gap: 24, marginTop: 16, fontSize: 12, justifyContent: "center" }}>
              {[["#E6F5F0", "Strong (≥80%)"], ["#FEF3E2", "Moderate (60-79%)"], ["#FBE8E4", "Needs Work (<60%)"]].map(([bg, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: bg }} />
                  <span style={{ color: C.gray600 }}>{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  VIEW: Overview (Student Cards)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: C.navy, marginBottom: 8 }}>Student Capability Matrix</h1>
          <p style={{ fontSize: 14, color: C.gray600 }}>
            {students.length} students across {events.length} events. Click a student to drill into their topic-level breakdown.
          </p>
        </div>
        {IS_PRODUCTION && (
          <button onClick={loadProductionData} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
            background: C.white, color: C.gray600, border: `1px solid ${C.gray200}`,
            borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      </div>

      {/* Search + Sort */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8,
          background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 10, padding: "0 14px" }}>
          <Search size={16} color={C.gray400} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search students..."
            style={{ flex: 1, border: "none", outline: "none", padding: "12px 0",
              fontSize: 14, fontFamily: "inherit", background: "transparent" }} />
        </div>
        <button onClick={() => { setSortBy(sortBy === 'name' ? 'mastery' : 'name'); setSortAsc(true); }}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10,
            border: `1px solid ${C.gray200}`, background: C.white, cursor: "pointer",
            fontSize: 13, fontWeight: 600, color: C.gray600, fontFamily: "inherit" }}>
          <ArrowUpDown size={14} /> Sort: {sortBy === 'name' ? 'Name' : 'Mastery'}
        </button>
      </div>

      {/* Student Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredStudents.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: C.gray400, fontSize: 14 }}>No students found.</div>
        )}

        {filteredStudents.map(student => (
          <div key={student.id}
            onClick={() => { setSelectedStudentId(student.id); setView('student'); }}
            style={{
              background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`,
              padding: "18px 22px", cursor: "pointer", transition: "all 0.15s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>

            {/* Top row: avatar, name, overall score */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: student.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.white, fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                {student.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{student.name}</div>
                <div style={{ fontSize: 12, color: C.gray400 }}>
                  {(student.events || []).length} events assigned
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800,
                  color: student.hasAnyData ? scoreColor(student.overallAvg) : C.gray400 }}>
                  {student.hasAnyData ? `${student.overallAvg}%` : "—"}
                </div>
                <div style={{ fontSize: 10, color: C.gray400 }}>overall</div>
              </div>
              <ChevronRight size={18} color={C.gray400} style={{ flexShrink: 0 }} />
            </div>

            {/* Event mastery pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {student.eventMasteries.map(em => (
                <div key={em.eventId}
                  onClick={e => { e.stopPropagation(); setSelectedEventId(em.eventId); setView('event'); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 10,
                    background: em.hasRealData ? scoreBg(em.avg) : C.gray100,
                    border: `1px solid ${em.hasRealData ? scoreColor(em.avg) + '30' : C.gray200}`,
                    cursor: "pointer",
                  }}>
                  <span style={{ fontSize: 14 }}>{em.eventIcon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.gray600, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {em.eventName}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800,
                    color: em.hasRealData ? scoreColor(em.avg) : C.gray400 }}>
                    {em.hasRealData ? `${em.avg}%` : "—"}
                  </span>
                </div>
              ))}
              {student.eventMasteries.length === 0 && (
                <span style={{ fontSize: 12, color: C.gray400, fontStyle: "italic" }}>No events assigned</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
