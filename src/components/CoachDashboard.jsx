import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, RefreshCw, Link2, UsersRound, Calendar, Database } from 'lucide-react';
import { SkeletonDashboard } from './shared/Skeleton';
import { C } from '../ui';
import { IS_PRODUCTION } from '../lib/featureFlags';
import { EVENTS, STUDENTS, generateMastery } from '../data/mockData';
import { useCoachDashboard, useTeamProgressTrend } from '../hooks/useCoachDashboard';
import { useTeamManagement } from '../hooks/useTeamManagement';
import { useCompetitions } from '../hooks/useCompetitions';
import { supabase } from '../lib/supabase';

export default function CoachDashboard({ isAdmin }) {
  const navigate = useNavigate();
  // ── Always call hooks (they no-op if supabase is null) ──
  const dashboard = useCoachDashboard();
  const team = useTeamManagement();
  const { competitions } = useCompetitions();
  const { trendData: liveTrendData, loading: trendLoading } = useTeamProgressTrend();

  // ── Data sources ───────────────────────────────────
  const prodEvents = useMemo(() => IS_PRODUCTION ? (team.events || []) : [], [team.events]);
  const prodStudents = useMemo(() => IS_PRODUCTION ? (dashboard.students || []) : [], [dashboard.students]);
  const prodStats = useMemo(() => IS_PRODUCTION ? (dashboard.stats || []) : [], [dashboard.stats]);
  const loading = IS_PRODUCTION ? (dashboard.loading || team.loading) : false;

  // ── Mock data for prototype mode ───────────────────
  const mockEvents = isAdmin ? EVENTS : EVENTS.slice(0, 4);

  const events = IS_PRODUCTION ? prodEvents : mockEvents;

  const [selectedEventId, setSelectedEventId] = useState(null);
  const activeEventId = selectedEventId || events[0]?.id;
  const selectedEvent = events.find(e => e.id === activeEventId);

  // ── Readiness data ─────────────────────────────────
  const teamReadiness = useMemo(() => {
    if (IS_PRODUCTION) {
      return prodStats.map(stat => {
        const ev = prodEvents.find(e => e.id === stat.event_id);
        return {
          id: stat.event_id,
          name: stat.event_name || ev?.name || `Event ${stat.event_id}`,
          icon: ev?.icon || '📋',
          type: stat.event_type || ev?.type,
          readiness: Math.round(stat.avg_quiz_score || 0),
          studentCount: stat.assigned_students || 0,
          quizAttempts: stat.total_quiz_attempts || 0,
          buildLogs: stat.total_build_logs || 0,
        };
      }).sort((a, b) => a.readiness - b.readiness);
    }
    // Prototype mock
    return (mockEvents || []).map(ev => {
      const evStudents = (STUDENTS || []).filter(s => s?.events?.includes(ev?.id));
      const avg = evStudents.length ? Math.round(evStudents.reduce((sum, s) => {
        const m = generateMastery(s?.id, ev?.id) || [];
        return sum + (m.length > 0 ? Math.round((m || []).reduce((a, b) => a + (b?.score || 0), 0) / m.length) : 0);
      }, 0) / evStudents.length) : 0;
      return { ...ev, readiness: avg, studentCount: evStudents.length };
    }).sort((a, b) => a.readiness - b.readiness);
  }, [prodStats, prodEvents, mockEvents]);

  // ── Event students ─────────────────────────────────
  const eventStudents = useMemo(() => {
    if (!activeEventId) return [];
    if (IS_PRODUCTION) {
      return (prodStudents || []).filter(s => s?.events?.includes(activeEventId));
    }
    return (STUDENTS || []).filter(s => s?.events?.includes(activeEventId));
  }, [activeEventId, prodStudents]);

  // ── Production: per-student mastery for selected event ──────
  // Queries topic_mastery for the active event and averages per student.
  const [masteryByStudent, setMasteryByStudent] = useState({}); // { userId: avgScore }
  useEffect(() => {
    if (!IS_PRODUCTION || !activeEventId) { setMasteryByStudent({}); return; }
    supabase
      .from("topic_mastery")
      .select("user_id, score")
      .eq("event_id", activeEventId)
      .then(({ data }) => {
        if (!data) return;
        const byStudent = {};
        for (const row of data) {
          if (!byStudent[row.user_id]) byStudent[row.user_id] = { sum: 0, count: 0 };
          byStudent[row.user_id].sum += Number(row.score) || 0;
          byStudent[row.user_id].count += 1;
        }
        const averaged = {};
        for (const [uid, { sum, count }] of Object.entries(byStudent)) {
          averaged[uid] = Math.round(sum / count);
        }
        setMasteryByStudent(averaged);
      });
  }, [activeEventId]);

  // ── Summary stats ──────────────────────────────────
  const totalMembers = IS_PRODUCTION ? (team.roster || []).length : STUDENTS.length;

  const summaryStats = useMemo(() => {
    const avgReadiness = teamReadiness.length
      ? Math.round(teamReadiness.reduce((s, e) => s + e.readiness, 0) / teamReadiness.length)
      : 0;

    // Days to state — compute from competitions table
    let daysToState = "—";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const stateComp = (competitions || [])
      .filter(c => (c.type === "state" || c.type === "regional") && new Date(c.date + "T00:00:00") >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (stateComp) {
      const diffMs = new Date(stateComp.date + "T00:00:00") - today;
      daysToState = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    return [
      { label: "Total Members", value: totalMembers, color: C.navy },
      { label: "Events Tracked", value: events.length, color: C.teal },
      { label: "Avg Readiness", value: `${avgReadiness}%`, color: C.gold },
      { label: "Days to Next", value: daysToState, color: C.coral },
    ];
  }, [totalMembers, events, teamReadiness, competitions]);

  // ── Trend data — real in production, generated mock in prototype ──────
  const trendData = useMemo(() => {
    if (IS_PRODUCTION) {
      // liveTrendData is null while loading or if no data yet
      return liveTrendData; // may be null (empty state) or array of { label, avgScore, attemptCount }
    }
    // Prototype: generate a plausible-looking upward curve seeded from today
    const base = [42, 47, 53, 58, 61, 65, 69, 73];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const today = new Date();
    return base.map((score, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (base.length - 1 - i) * 7);
      return {
        label: `${months[d.getMonth()]} ${d.getDate()}`,
        avgScore: score + Math.floor(Math.random() * 4 - 1), // slight jitter
        attemptCount: 8 + i,
      };
    });
  }, [liveTrendData]);

  // ── Next competition for countdown banner ────────
  const nextCompetition = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = (competitions || [])
      .filter(c => new Date(c.date + "T00:00:00") >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!upcoming.length) return null;
    const comp = upcoming[0];
    const diffMs = new Date(comp.date + "T00:00:00") - today;
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return { ...comp, daysLeft };
  }, [competitions]);

  if (loading) {
    return <SkeletonDashboard stats={4} rows={8} style={{ padding: "28px 0" }} />;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
            {isAdmin ? "🛡️ Admin Dashboard" : "📊 Coach Dashboard"}
          </h2>
          <p style={{ color: C.gray600, fontSize: 14 }}>
            {isAdmin ? "Full team oversight — all events" : "Your assigned events overview"}
          </p>
        </div>
        {IS_PRODUCTION && (
          <button onClick={() => { dashboard.refetch(); team.refresh(); }} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
            background: C.white, color: C.gray600, border: `1px solid ${C.gray200}`,
            borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      </div>

      {/* Competition Countdown Banner */}
      {nextCompetition && (
        <div onClick={() => navigate("/app/schedule")} style={{
          background: `linear-gradient(135deg, ${C.navy}, #1e3a5f)`,
          borderRadius: 14, padding: "16px 24px", marginBottom: 20, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          color: C.white, transition: "transform 0.15s ease",
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.005)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 28 }}>🏁</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {nextCompetition.name || "Next Competition"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {new Date(nextCompetition.date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric", year: "numeric",
                })}
                {nextCompetition.location && ` · ${nextCompetition.location}`}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
              {nextCompetition.daysLeft}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>
              day{nextCompetition.daysLeft !== 1 ? "s" : ""} away
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {summaryStats.map((s, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 14, padding: 18, border: `1px solid ${C.gray200}` }}>
            <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { icon: <Link2 size={18} />, label: "Manage Pairings", desc: "Partnership lineups", path: "/app/pairings", color: C.teal },
          { icon: <Calendar size={18} />, label: "Competitions", desc: "Schedule & results", path: "/app/schedule", color: C.coral },
          ...(isAdmin ? [{ icon: <UsersRound size={18} />, label: "Team Management", desc: "Roster & invites", path: "/app/team", color: C.navy }] : []),
          { icon: <Database size={18} />, label: "Question Bank", desc: "Quizzes & content", path: "/app/question-bank", color: C.gold },
        ].map((action, i) => (
          <button key={i} onClick={() => navigate(action.path)} style={{
            background: C.white, borderRadius: 14, padding: "18px 16px", border: `1px solid ${C.gray200}`,
            cursor: "pointer", textAlign: "left", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.gray200; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center",
              justifyContent: "center", color: action.color, background: `${action.color}15`, flexShrink: 0,
            }}>{action.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{action.label}</div>
              <div style={{ fontSize: 11, color: C.gray400 }}>{action.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Event Readiness Rankings */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            {isAdmin ? "🏅 All Events Readiness" : "🏅 Your Events Readiness"}
          </h3>
          {teamReadiness.length === 0 && (
            <p style={{ fontSize: 13, color: C.gray400, fontStyle: "italic", padding: "20px 0" }}>
              No quiz data yet. Readiness scores will appear as students take quizzes.
            </p>
          )}
          <div style={{ maxHeight: 340, overflow: "auto" }}>
            {teamReadiness.map((ev, i) => (
              <div key={ev.id} onClick={() => setSelectedEventId(ev.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 8, marginBottom: 4, cursor: "pointer",
                  background: ev.id === activeEventId ? C.goldLight : "transparent" }}>
                <span style={{ width: 24, fontSize: 12, fontWeight: 700, color: i < 3 ? C.coral : C.gray400 }}>#{i + 1}</span>
                <span style={{ fontSize: 16 }}>{ev.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{ev.name}</span>
                  <div style={{ fontSize: 11, color: C.gray400 }}>
                    {ev.studentCount} student{ev.studentCount !== 1 ? 's' : ''}
                    {IS_PRODUCTION && ev.quizAttempts > 0 && ` · ${ev.quizAttempts} quizzes`}
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: ev.readiness >= 80 ? C.tealDark : ev.readiness >= 60 ? C.gold : C.coral }}>
                  {ev.readiness}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Team Progress Trend */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>📈 Team Progress Trend</h3>
            {IS_PRODUCTION && trendData && trendData.length > 0 && (
              <span style={{ fontSize: 11, color: C.gray400 }}>
                avg quiz score · last {trendData.length} week{trendData.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Loading state */}
          {IS_PRODUCTION && trendLoading && (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: C.gray400 }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 13 }}>Loading trend data…</span>
            </div>
          )}

          {/* Empty state — no quiz attempts yet */}
          {IS_PRODUCTION && !trendLoading && (!trendData || trendData.length === 0) && (
            <div style={{ height: 280, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 10 }}>
              <div style={{ fontSize: 40 }}>📭</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>No quiz data yet</p>
              <p style={{ fontSize: 13, color: C.gray400, textAlign: "center", maxWidth: 260 }}>
                The trend will appear here once students start taking quizzes.
                Weekly average scores will be plotted automatically.
              </p>
            </div>
          )}

          {/* Chart — shown when data exists (production or prototype) */}
          {(!IS_PRODUCTION || (trendData && trendData.length > 0)) && !trendLoading && (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.gray100} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(v) => [`${v}%`, "Avg Score"]}
                  labelFormatter={(label) => `Week of ${label}`}
                  contentStyle={{ borderRadius: 8, border: `1px solid ${C.gray200}`, fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  stroke={C.teal}
                  strokeWidth={2.5}
                  dot={{ fill: C.teal, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: C.tealDark }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Selected Event Detail */}
      {selectedEvent && (
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            {selectedEvent.icon} {selectedEvent.name} — Student Breakdown
          </h3>
          {eventStudents.length === 0 && (
            <p style={{ fontSize: 13, color: C.gray400, fontStyle: "italic", padding: "12px 0" }}>
              No students assigned to this event yet. Use the Team page to assign students.
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {(eventStudents || []).map(s => {
              // Production: use live mastery from topic_mastery table
              // Prototype: derive from mock generateMastery
              let avg = 0;
              if (IS_PRODUCTION) {
                avg = masteryByStudent[s.id] ?? 0;
              } else {
                const mastery = generateMastery(s?.id, activeEventId) || [];
                avg = mastery.length > 0
                  ? Math.round(mastery.reduce((sum, t) => sum + (t?.score || 0), 0) / mastery.length)
                  : 0;
              }
              const name = s?.full_name || s?.name;
              const initials = s?.initials || name?.split(' ').map(n => n?.[0]).join('').toUpperCase();
              const scoreColor = avg >= 80 ? C.teal : avg >= 60 ? C.gold : C.coral;
              return (
                <div key={s.id} style={{ padding: "16px", background: C.offWhite, borderRadius: 12, border: `1px solid ${C.gray100}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: avg > 0 ? 10 : 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.avatar_color || s.color || C.teal,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: C.white, flexShrink: 0 }}>{initials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                      <div style={{ fontSize: 11, color: avg > 0 ? scoreColor : C.gray400, fontWeight: avg > 0 ? 600 : 400 }}>
                        {avg > 0 ? `${avg}% mastery` : "No quiz data yet"}
                      </div>
                    </div>
                  </div>
                  {avg > 0 && (
                    <div style={{ height: 6, background: C.gray200, borderRadius: 100, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 100, width: `${avg}%`,
                        background: scoreColor, transition: "width 0.4s ease" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

CoachDashboard.propTypes = {
  isAdmin: PropTypes.bool,
};

CoachDashboard.defaultProps = {
  isAdmin: false,
};
