import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Play, TrendingUp, Upload, Users, Zap } from 'lucide-react';
import { SkeletonEventGrid } from './shared/Skeleton';
import { C } from '../ui';
import { STUDENTS, generateMastery } from '../data/mockData';
import { IS_PRODUCTION } from '../lib/featureFlags';
import { useAppContext } from '../lib/AppContext';
import {
  useUnifiedEvents,
  useUnifiedQuizStats,
} from '../hooks/useUnifiedData';
import { useCompetitions } from '../hooks/useCompetitions';
import { usePartners } from '../hooks/usePartners';
import { useUserMastery } from '../hooks/useQuizzes';
import { prefetchStudentRoutes } from '../lib/prefetch';
import TodaysFocusCard from './TodaysFocusCard';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { currentUser: user } = useAppContext();

  // ── Data hooks ──────────────────────────────────────────────
  const { events, loading: eventsLoading } = useUnifiedEvents();
  const { quizCount, streakDays } = useUnifiedQuizStats(user?.id);
  const { competitions } = useCompetitions();

  // ── Production: cached hooks replace bare Supabase calls ────
  // usePartners: single JOIN query (partnerships + events + both users), TTL-cached
  const { partnerships: prodPartnershipsRaw } = usePartners(IS_PRODUCTION ? user?.id : null);
  // useUserMastery: all topic_mastery rows for this user, 60s TTL cache
  const { mastery: prodMastery } = useUserMastery(IS_PRODUCTION ? user?.id : null);

  // ── Compute mastery per event ───────────────────────────────
  const { masteryData, overall } = useMemo(() => {
    const userEvents = events.filter(e => user?.events?.includes(e.id));

    let masteryData;
    if (IS_PRODUCTION) {
      // Group real mastery data by event
      const masteryByEvent = {};
      for (const row of prodMastery) {
        if (!masteryByEvent[row.event_id]) masteryByEvent[row.event_id] = [];
        masteryByEvent[row.event_id].push(Number(row.score) || 0);
      }

      masteryData = userEvents.map(ev => {
        const scores = masteryByEvent[ev.id] || [];
        const avg = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        return { ...ev, mastery: avg, hasData: scores.length > 0 };
      });
    } else {
      masteryData = userEvents.map(ev => {
        const m = generateMastery(user?.id, ev.id) || [];
        const avg = m.length > 0 ? Math.round(m.reduce((s, t) => s + t.score, 0) / m.length) : 0;
        return { ...ev, mastery: avg, hasData: true };
      });
    }

    const withData = masteryData.filter(e => e.hasData);
    const overall = withData.length > 0
      ? Math.round(withData.reduce((s, e) => s + e.mastery, 0) / withData.length) : 0;

    return { masteryData, overall };
  }, [events, user, prodMastery]);

  // ── Compute days to next competition ────────────────────────
  const daysToNext = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = (competitions || [])
      .filter(c => new Date(c.date + "T00:00:00") >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (upcoming.length === 0) return null;
    const diffMs = new Date(upcoming[0].date + "T00:00:00") - today;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [competitions]);

  // ── Partnerships list ───────────────────────────────────────
  const partnershipsList = useMemo(() => {
    if (!IS_PRODUCTION) {
      // Mock mode
      const mockPartnerships = [
        { eventId: 1, partners: [1, 2] },
        { eventId: 2, partners: [1, 3] },
      ];
      return mockPartnerships
        .filter(p => p.partners?.includes(user?.id))
        .map(p => {
          const partnerId = p.partners.find(id => id !== user?.id);
          const partner = STUDENTS.find(s => s.id === partnerId);
          const ev = events.find(e => e.id === p.eventId);
          if (!partner || !ev) return null;
          const m = generateMastery(partnerId, p.eventId) || [];
          const avg = m.length > 0 ? Math.round(m.reduce((s, t) => s + t.score, 0) / m.length) : 0;
          return { partner, ev, avg };
        })
        .filter(Boolean);
    }

    // Production: usePartners already joined event + partner user in one query
    const myMasteryByEvent = {};
    for (const row of prodMastery) {
      if (!myMasteryByEvent[row.event_id]) myMasteryByEvent[row.event_id] = [];
      myMasteryByEvent[row.event_id].push({ topic: row.topic, score: Number(row.score) || 0 });
    }

    return prodPartnershipsRaw.map(p => {
      // p.partner = { id, full_name, initials, avatar_color }
      // p.event   = { name, icon, type }
      if (!p.partner || !p.event) return null;
      const ev = events.find(e => e.id === p.eventId) || { ...p.event, id: p.eventId };

      const myTopics = myMasteryByEvent[p.eventId] || [];
      const weakest = myTopics.length > 0
        ? [...myTopics].sort((a, b) => a.score - b.score)[0]
        : null;

      return {
        partner: { ...p.partner, name: p.partner.full_name, color: p.partner.avatar_color || C.teal },
        ev,
        avg: null,
        focusTopic: weakest?.topic || null,
        focusScore: weakest?.score || null,
      };
    }).filter(Boolean);
  }, [prodPartnershipsRaw, prodMastery, events, user]);

  // ── Recently visited events ────────────────────────────────
  const [recentEvents, setRecentEvents] = useState([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dw_recent_events");
      if (raw) {
        const ids = JSON.parse(raw); // array of event ids, newest first
        const matched = ids
          .map(id => events.find(e => e.id === id))
          .filter(Boolean)
          .slice(0, 4);
        setRecentEvents(matched);
      }
    } catch { /* ignore */ }
  }, [events]);

  // Prefetch likely-next routes after dashboard renders
  useEffect(() => { prefetchStudentRoutes(); }, []);

  // ── Loading state ───────────────────────────────────────────
  if (eventsLoading) {
    return <SkeletonEventGrid count={4} style={{ padding: "4px 0" }} />;
  }

  const userName = (user?.name || user?.full_name || "").split(" ")[0];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>Welcome back, {userName}</h2>
      </div>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 20 }}>
        {daysToNext !== null ? (
          <>Next competition in <strong style={{ color: C.coral }}>{daysToNext} days</strong>.</>
        ) : (
          <>No upcoming competitions scheduled.</>
        )}
        {" "}Members of a TEAM before an achiever of one.
      </p>

      {/* Today's Focus — flagship daily study card */}
      <TodaysFocusCard user={user} />

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Overall Mastery", value: overall > 0 ? `${overall}%` : "—", change: overall > 0 ? "" : "Take quizzes to track", color: C.teal, up: overall > 0 },
          { label: "Events Assigned", value: (user?.events || []).length, change: `of ${events.length} total`, color: C.navy, up: null },
          { label: "Quizzes Done", value: quizCount ?? "—", change: quizCount > 0 ? "" : "Start a quiz!", color: C.gold, up: quizCount > 0 },
          { label: "Study Streak", value: streakDays != null ? `${streakDays}d` : "—", change: streakDays > 0 ? "Keep it up!" : "Take a quiz today!", color: C.gold, up: streakDays > 0 ? true : null },
        ].map((s, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 14, padding: 20,
            border: `1px solid ${C.gray200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, margin: "4px 0" }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: s.up ? C.tealDark : C.gray400 }}>{s.change}</div>
          </div>
        ))}
      </div>

      {/* Recently Visited Events */}
      {recentEvents.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.gray600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={14} color={C.gray400} /> Recently Visited
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(recentEvents.length, 4)}, 1fr)`, gap: 12 }}>
            {recentEvents.map(ev => {
              const evMastery = masteryData.find(m => m.id === ev.id);
              return (
                <button key={ev.id} onClick={() => navigate(`/events/${ev.id}`)} style={{
                  background: C.white, borderRadius: 12, padding: "14px 16px",
                  border: `1px solid ${C.gray200}`, cursor: "pointer", textAlign: "left",
                  fontFamily: "inherit", transition: "all 0.15s ease", display: "flex", alignItems: "center", gap: 10,
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.gray200; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <span style={{ fontSize: 20 }}>{ev.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.name}</div>
                    <div style={{ fontSize: 11, color: C.gray400 }}>
                      {evMastery && evMastery.mastery > 0 ? `${evMastery.mastery}% mastery` : "No quiz data"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        {/* Event Mastery */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={16} color={C.teal} /> Event Mastery Breakdown
          </h3>
          {masteryData.length === 0 && (
            <p style={{ fontSize: 13, color: C.gray400, textAlign: "center", padding: "20px 0" }}>
              No events assigned yet. Ask your coach to assign you to events.
            </p>
          )}
          {masteryData.map(ev => (
            <div key={ev.id} style={{ marginBottom: 14, cursor: "pointer" }}
              onClick={() => navigate(`/events/${ev.id}`)}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 500 }}>{ev.icon} {ev.name}</span>
                <span style={{ fontWeight: 700, color: ev.hasData ? (ev.mastery >= 80 ? C.tealDark : ev.mastery >= 60 ? C.gold : C.coral) : C.gray400 }}>
                  {ev.hasData && ev.mastery > 0 ? `${ev.mastery}%` : "—"}
                </span>
              </div>
              <div style={{ height: 8, background: C.gray100, borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 100, width: `${ev.mastery}%`,
                  background: ev.mastery >= 80 ? C.teal : ev.mastery >= 60 ? C.gold : C.coral,
                  transition: "width 0.5s ease" }} />
              </div>
            </div>
          ))}

          {masteryData.length > 0 && (
            <div style={{ marginTop: 18, padding: "14px 16px", background: C.goldLight, borderRadius: 10, fontSize: 13 }}>
              <strong style={{ color: C.gold }}>AI Suggestion:</strong>{" "}
              <span style={{ color: C.gray600 }}>
                {masteryData.some(e => e.hasData && e.mastery > 0)
                  ? `Focus on ${[...masteryData].filter(e => e.hasData).sort((a, b) => a.mastery - b.mastery)[0]?.name || "your weakest event"} — your lowest event. Start with the adaptive quiz to identify specific sub-topic gaps.`
                  : "Take some quizzes to unlock personalized study recommendations!"}
              </span>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* My Event Partners & Study Focus */}
          <div style={{ background: C.white, borderRadius: 16, padding: 20, border: `1px solid ${C.gray200}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} color={C.gold} /> My Event Partners
            </h3>
            {partnershipsList.length === 0 ? (
              <div style={{ fontSize: 13, color: C.gray400, padding: "12px", textAlign: "center" }}>
                Your coach will announce event partners soon.
              </div>
            ) : (
              partnershipsList.map((p, i) => (
                <div key={i} style={{ padding: "12px", background: C.offWhite, borderRadius: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: p.partner.color || C.teal,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: C.white, flexShrink: 0 }}>
                      {p.partner.initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.partner.name || p.partner.full_name}</div>
                      <div style={{ fontSize: 11, color: C.gray400 }}>{p.ev.icon} {p.ev.name}</div>
                    </div>
                  </div>
                  {p.focusTopic && (
                    <div style={{ padding: "8px 10px", background: C.goldLight, borderRadius: 8, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: C.gold, fontWeight: 700 }}>📚 Focus:</span>
                      <span style={{ color: C.gray600 }}>
                        Study <strong>{p.focusTopic}</strong>
                        {p.focusScore !== null && ` (${p.focusScore}%)`}
                      </span>
                    </div>
                  )}
                  {!p.focusTopic && (
                    <div style={{ padding: "8px 10px", background: C.gray100, borderRadius: 8, fontSize: 12, color: C.gray400 }}>
                      Take quizzes for {p.ev.name} to get study suggestions
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Up Next */}
          <div style={{ background: C.white, borderRadius: 16, padding: 20, border: `1px solid ${C.gray200}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={16} color={C.coral} /> Quick Actions
            </h3>
            {[
              { text: "Take a quiz on your weakest event", type: "quiz", action: () => masteryData[0] && navigate(`/events/${[...masteryData].sort((a,b) => a.mastery - b.mastery)[0]?.id}/quiz`) },
              { text: "Upload a practice test", type: "upload", action: () => navigate("/upload") },
              { text: "View your study path", type: "study", action: () => navigate("/studypath") },
            ].map((item, i) => (
              <div key={i} onClick={item.action}
                style={{ padding: "10px 0", borderBottom: i < 2 ? `1px solid ${C.gray100}` : "none",
                  fontSize: 13, color: C.gray600, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                {item.type === "quiz" ? <Play size={14} color={C.teal} /> :
                 item.type === "upload" ? <Upload size={14} color={C.gold} /> :
                 <BookOpen size={14} color={C.coral} />}
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
