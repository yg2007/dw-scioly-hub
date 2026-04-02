import { useState, useEffect, useMemo, useCallback } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Brain, Clock, Play, Upload, Wrench, Users, AlertTriangle, TrendingUp, Lock } from 'lucide-react';
import Breadcrumbs from './shared/Breadcrumbs';
import { SkeletonDashboard } from './shared/Skeleton';
import { useNavigate } from 'react-router-dom';
import { C } from '../ui';
import { STUDENTS, generateMastery } from '../data/mockData';
import { IS_PRODUCTION } from '../lib/featureFlags';
import { useTopicMastery } from '../hooks';
import { useAppContext } from '../lib/AppContext';
import { useCurrentEvent } from '../hooks/useCurrentEvent';
import { supabase, resilientQuery } from '../lib/supabase';
import { useQuery } from '../lib/query';

// ═══════════════════════════════════════════════════════════════
//  Event Detail Page
//
//  Student view:  Personal mastery, quiz/upload/study path buttons
//  Coach view:    Team readiness, student rankings, risk areas,
//                 competition scores — per the concept doc
// ═══════════════════════════════════════════════════════════════

const scoreColor = (s) => s >= 80 ? C.teal : s >= 60 ? C.gold : C.coral;

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { event, loading: eventLoading } = useCurrentEvent();
  const { currentUser: user, userRole } = useAppContext();
  const isCoach = userRole === "coach" || userRole === "admin";

  // Track recently visited events for student dashboard
  useEffect(() => {
    if (!event?.id) return;
    try {
      const key = "dw_recent_events";
      const raw = localStorage.getItem(key);
      let ids = raw ? JSON.parse(raw) : [];
      ids = [event.id, ...ids.filter(id => id !== event.id)].slice(0, 8);
      localStorage.setItem(key, JSON.stringify(ids));
    } catch { /* ignore */ }
  }, [event?.id]);

  // Student-mode mastery
  const { mastery: prodMastery, loading: masteryLoading } = useTopicMastery(
    isCoach ? null : user?.id,
    isCoach ? null : event?.id
  );

  // Coach-mode data (cached per event)
  const eventId = event?.id;
  const fetchCoachEventData = useCallback(async () => {
    const [studentsRes, masteryRes, topicsRes, scoresRes] = await Promise.all([
      IS_PRODUCTION
        ? resilientQuery(() =>
            supabase.from("users")
              .select("id, full_name, initials, avatar_color, is_alumni, user_events(event_id)")
              .eq("role", "student")
              .or("is_alumni.eq.false,is_alumni.is.null")
          )
        : { data: STUDENTS.filter(s => s.events?.includes(eventId)).map(s => ({ ...s, full_name: s.name, avatar_color: s.color, user_events: s.events.map(eid => ({ event_id: eid })) })) },
      IS_PRODUCTION
        ? resilientQuery(() =>
            supabase.from("topic_mastery").select("user_id, event_id, topic, score, trend").eq("event_id", eventId)
          )
        : { data: [] },
      IS_PRODUCTION
        ? resilientQuery(() =>
            supabase.from("event_topics").select("name, sort_order").eq("event_id", eventId).order("sort_order")
          )
        : { data: (event?.topics || []).map((t, i) => ({ name: t, sort_order: i })) },
      IS_PRODUCTION
        ? resilientQuery(() =>
            supabase.from("competition_event_scores").select("competition_id, team, score, placement, competitions(name, date)").eq("event_id", eventId)
          )
        : { data: [] },
    ]);

    const allStudents = (studentsRes.data || [])
      .filter(s => (s.user_events || []).some(ue => ue.event_id === eventId))
      .map(s => ({
        id: s.id, name: s.full_name || s.name, initials: s.initials,
        color: s.avatar_color || s.color || C.teal,
      }));

    return {
      students: allStudents,
      mastery: masteryRes.data || [],
      topics: (topicsRes.data || []).map(t => t.name),
      scores: scoresRes.data || [],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const { data: coachDataCached, loading: coachLoading } = useQuery(
    `event-detail-coach-${eventId}`,
    fetchCoachEventData,
    { staleTime: 5 * 60 * 1000, enabled: isCoach && !!eventId }
  );
  const coachData = coachDataCached || { students: [], mastery: [], topics: [], scores: [] };

  // ── Loading ──────────────────────────────────────────────────
  if (eventLoading || coachLoading) {
    return <SkeletonDashboard stats={3} rows={6} style={{ padding: "4px 0" }} />;
  }

  if (!event) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Event not found</h2>
        <button onClick={() => navigate("/events")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.teal, border: "none",
            color: C.white, fontSize: 13, cursor: "pointer", padding: "8px 16px", borderRadius: 8, fontFamily: "inherit", fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back to Events
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  COACH VIEW
  // ═══════════════════════════════════════════════════════════════
  if (isCoach) {
    return <CoachEventView event={event} coachData={coachData} navigate={navigate} />;
  }

  // ═══════════════════════════════════════════════════════════════
  //  STUDENT VIEW (unchanged)
  // ═══════════════════════════════════════════════════════════════
  let mastery, avg, radarData, hasData;
  if (IS_PRODUCTION) {
    if (masteryLoading) {
      return <SkeletonDashboard stats={2} rows={5} style={{ padding: "4px 0" }} />;
    }
    mastery = prodMastery || [];
    hasData = mastery.length > 0;
    avg = hasData ? Math.round(mastery.reduce((s, t) => s + (t?.score || 0), 0) / mastery.length) : 0;
    radarData = hasData ? mastery.map(m => ({ topic: (m?.topic || "").length > 14 ? m.topic.slice(0, 12) + "…" : m.topic, score: m.score, fullMark: 100 })) : [];
  } else {
    mastery = generateMastery(user?.id, event?.id) || [];
    hasData = mastery.length > 0;
    avg = hasData ? Math.round(mastery.reduce((s, t) => s + (t?.score || 0), 0) / mastery.length) : 0;
    radarData = mastery.map(m => ({ topic: (m?.topic || "").length > 14 ? m.topic.slice(0, 12) + "…" : m.topic, score: m.score, fullMark: 100 }));
  }

  return (
    <div>
      <Breadcrumbs items={[
        { label: "Events", path: "/events" },
        { label: `${event.icon} ${event.name}` },
      ]} />

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <span style={{ fontSize: 42 }}>{event.icon}</span>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800 }}>{event.name}</h2>
          <p style={{ color: C.gray600, fontSize: 14 }}>Team of {event.teamSize || event.team_size || 2} · {(event.topics || []).length} topics · {event.type}</p>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: hasData ? scoreColor(avg) : C.gray400 }}>{hasData ? `${avg}%` : "—"}</div>
          <div style={{ fontSize: 12, color: C.gray400 }}>Your Mastery</div>
        </div>
      </div>

      {/* Student Action Buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Adaptive Quiz", icon: <Play size={16} />, color: C.teal, action: () => navigate(`/events/${event.id}/quiz`) },
          { label: "Mock Test", icon: <Clock size={16} />, color: C.coral, action: () => navigate(`/events/${event.id}/mock-test`) },
          { label: "Upload Test", icon: <Upload size={16} />, color: C.gold, action: () => navigate(`/events/${event.id}/upload`) },
          { label: "Study Path", icon: <Brain size={16} />, color: C.navy, action: () => navigate(`/events/${event.id}/studypath`) },
          ...(event.type === "build" ? [{ label: "Build Log", icon: <Wrench size={16} />, color: "#64748B", action: () => navigate(`/events/${event.id}/buildlog`) }] : []),
          ...(event.name === "Codebusters" ? [{ label: "Cipher Drills", icon: <Lock size={16} />, color: "#7C3AED", action: () => navigate(`/events/${event.id}/cipher`) }] : []),
        ].map((btn, i) => (
          <button key={i} onClick={btn.action}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px",
              borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
              background: btn.color, color: C.white, fontSize: 14, fontWeight: 600 }}>
            {btn.icon} {btn.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>📊 Topic Mastery</h3>
          {hasData ? mastery.map((m, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 500 }}>{m.topic}</span>
                <span style={{ fontWeight: 700, color: scoreColor(m.score || 0) }}>
                  {m.score}%
                  {m.trend === "up" && <span style={{ color: C.tealDark, marginLeft: 4 }}>↑</span>}
                  {m.trend === "down" && <span style={{ color: C.coral, marginLeft: 4 }}>↓</span>}
                </span>
              </div>
              <div style={{ height: 8, background: C.gray100, borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 100, width: `${m.score || 0}%`, background: scoreColor(m.score || 0) }} />
              </div>
            </div>
          )) : (
            <div style={{ fontSize: 13, color: C.gray400, padding: 20, textAlign: "center" }}>Take quizzes to see mastery data</div>
          )}
        </div>

        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>🎯 Skill Radar</h3>
          {hasData ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={C.gray200} />
                <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10, fill: C.gray600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Mastery" dataKey="score" stroke={C.teal} fill={C.teal} fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ fontSize: 13, color: C.gray400, padding: "60px 20px", textAlign: "center", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              Take quizzes to see your skill radar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
//  COACH EVENT VIEW
//  Per concept doc: team readiness, student rankings,
//  risk areas, competition scores
// ═══════════════════════════════════════════════════════════════
function CoachEventView({ event, coachData, navigate }) {
  const { students, mastery, topics, scores } = coachData;

  // Build per-student mastery for this event
  const studentStats = useMemo(() => {
    if (!IS_PRODUCTION) {
      // Mock mode
      return students.map(s => {
        const m = generateMastery(s.id, event.id) || [];
        const avg = m.length > 0 ? Math.round(m.reduce((sum, t) => sum + t.score, 0) / m.length) : 0;
        return { ...s, mastery: m, avg, hasData: true };
      }).sort((a, b) => b.avg - a.avg);
    }

    const masteryByUser = {};
    for (const row of mastery) {
      if (!masteryByUser[row.user_id]) masteryByUser[row.user_id] = [];
      masteryByUser[row.user_id].push({ topic: row.topic, score: Number(row.score) || 0, trend: row.trend || 'stable' });
    }

    return students.map(s => {
      const m = masteryByUser[s.id] || [];
      const hasData = m.length > 0;
      const avg = hasData ? Math.round(m.reduce((sum, t) => sum + t.score, 0) / m.length) : 0;
      return { ...s, mastery: m, avg, hasData };
    }).sort((a, b) => b.avg - a.avg);
  }, [students, mastery, event.id]);

  // Team readiness (avg of all students who have data)
  const withData = studentStats.filter(s => s.hasData);
  const teamReadiness = withData.length > 0
    ? Math.round(withData.reduce((s, st) => s + st.avg, 0) / withData.length) : null;

  // Risk areas: topics where no student is above 70%
  const riskTopics = useMemo(() => {
    if (topics.length === 0 || withData.length === 0) return [];

    return topics.filter(topicName => {
      const topScoreForTopic = Math.max(0, ...withData.flatMap(s =>
        s.mastery.filter(m => m.topic === topicName).map(m => m.score)
      ));
      return topScoreForTopic < 70;
    });
  }, [topics, withData]);

  // Competition scores for this event
  const compScores = useMemo(() => {
    const byComp = {};
    for (const s of scores) {
      const compName = s.competitions?.name || `Competition ${s.competition_id}`;
      const compDate = s.competitions?.date || '';
      if (!byComp[s.competition_id]) byComp[s.competition_id] = { name: compName, date: compDate, green: null, white: null };
      byComp[s.competition_id][s.team] = { score: s.score, placement: s.placement };
    }
    return Object.values(byComp).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [scores]);

  return (
    <div>
      <button onClick={() => navigate("/events")}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          color: C.gray400, fontSize: 13, cursor: "pointer", marginBottom: 16, fontFamily: "inherit" }}>
        <ArrowLeft size={14} /> Back to Events
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <span style={{ fontSize: 42 }}>{event.icon}</span>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800 }}>{event.name}</h2>
          <p style={{ color: C.gray600, fontSize: 14 }}>
            {students.length} students · {topics.length} topics · {event.type} event
          </p>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: teamReadiness !== null ? scoreColor(teamReadiness) : C.gray400 }}>
            {teamReadiness !== null ? `${teamReadiness}%` : "—"}
          </div>
          <div style={{ fontSize: 12, color: C.gray400 }}>Team Readiness</div>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Students", value: students.length, color: C.navy },
          { label: "With Data", value: withData.length, color: C.teal },
          { label: "Risk Topics", value: riskTopics.length, color: riskTopics.length > 0 ? C.coral : C.teal },
          { label: "Competitions", value: compScores.length, color: C.gold },
        ].map((s, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 12, padding: "14px 20px", border: `1px solid ${C.gray200}` }}>
            <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Student Rankings */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={16} color={C.teal} /> Student Rankings
          </h3>
          {studentStats.length === 0 ? (
            <p style={{ fontSize: 13, color: C.gray400, textAlign: "center", padding: 20 }}>No students assigned to this event.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {studentStats.map((s, rank) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  background: C.offWhite, borderRadius: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%",
                    background: s.hasData ? scoreColor(s.avg) : C.gray200,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.white, fontSize: 11, fontWeight: 700 }}>{rank + 1}</div>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: s.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.white, fontSize: 11, fontWeight: 700 }}>{s.initials}</div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.navy }}>{s.name}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: s.hasData ? scoreColor(s.avg) : C.gray400 }}>
                    {s.hasData ? `${s.avg}%` : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risk Areas */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} color={C.coral} /> Risk Areas
          </h3>
          <p style={{ fontSize: 12, color: C.gray400, marginBottom: 14 }}>
            Topics where no student scores above 70%
          </p>
          {riskTopics.length === 0 && withData.length > 0 ? (
            <div style={{ padding: 20, textAlign: "center", background: "#E8F5E9", borderRadius: 10, fontSize: 13, fontWeight: 600, color: C.teal }}>
              ✓ All topics covered — no risk areas
            </div>
          ) : riskTopics.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: C.gray400, fontSize: 13 }}>
              No mastery data yet — students need to take quizzes
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {riskTopics.map(topic => {
                // Find the best score for this topic
                const bestScore = Math.max(0, ...withData.flatMap(s =>
                  s.mastery.filter(m => m.topic === topic).map(m => m.score)
                ));
                return (
                  <div key={topic} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    background: "#FEF2F2", borderRadius: 10, border: "1px solid #FECACA" }}>
                    <AlertTriangle size={14} color={C.coral} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{topic}</div>
                      <div style={{ fontSize: 11, color: C.gray400 }}>Best score: {bestScore}%</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.coral }}>{bestScore}%</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Topic coverage breakdown */}
          {topics.length > 0 && withData.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gray600, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                All Topics
              </div>
              {topics.map(topicName => {
                const bestScore = Math.max(0, ...withData.flatMap(s =>
                  s.mastery.filter(m => m.topic === topicName).map(m => m.score)
                ));
                const isRisk = bestScore < 70;
                return (
                  <div key={topicName} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span style={{ fontWeight: 500, color: isRisk ? C.coral : C.gray600 }}>{topicName}</span>
                      <span style={{ fontWeight: 700, color: scoreColor(bestScore) }}>{bestScore > 0 ? `${bestScore}%` : "—"}</span>
                    </div>
                    <div style={{ height: 5, background: C.gray100, borderRadius: 100 }}>
                      <div style={{ height: "100%", borderRadius: 100, width: `${bestScore}%`, background: scoreColor(bestScore) }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Competition Scores History */}
      {compScores.length > 0 && (
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}`, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            🏆 Competition Scores
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 0, fontSize: 12 }}>
            <div style={{ padding: 10, fontWeight: 700, color: C.gray400, borderBottom: `1px solid ${C.gray200}` }}>Competition</div>
            <div style={{ padding: 10, fontWeight: 700, color: "#2E7D32", textAlign: "center", borderBottom: `1px solid ${C.gray200}` }}>🟢 Score</div>
            <div style={{ padding: 10, fontWeight: 700, color: "#2E7D32", textAlign: "center", borderBottom: `1px solid ${C.gray200}` }}>🟢 Place</div>
            <div style={{ padding: 10, fontWeight: 700, color: "#616161", textAlign: "center", borderBottom: `1px solid ${C.gray200}` }}>⚪ Score</div>
            <div style={{ padding: 10, fontWeight: 700, color: "#616161", textAlign: "center", borderBottom: `1px solid ${C.gray200}` }}>⚪ Place</div>

            {compScores.map((c, i) => (
              <div key={i} style={{ display: "contents" }}>
                <div style={{ padding: 10, fontSize: 13, fontWeight: 600, color: C.navy, borderBottom: `1px solid ${C.gray100}` }}>
                  {c.name}
                  {c.date && <span style={{ fontSize: 11, color: C.gray400, marginLeft: 8 }}>{c.date}</span>}
                </div>
                <div style={{ padding: 10, textAlign: "center", fontWeight: 700, color: C.navy, borderBottom: `1px solid ${C.gray100}` }}>
                  {c.green?.score ?? "—"}
                </div>
                <div style={{ padding: 10, textAlign: "center", fontWeight: 700, color: c.green?.placement <= 3 ? C.gold : C.gray600, borderBottom: `1px solid ${C.gray100}` }}>
                  {c.green?.placement ? `#${c.green.placement}` : "—"}
                </div>
                <div style={{ padding: 10, textAlign: "center", fontWeight: 700, color: C.navy, borderBottom: `1px solid ${C.gray100}` }}>
                  {c.white?.score ?? "—"}
                </div>
                <div style={{ padding: 10, textAlign: "center", fontWeight: 700, color: c.white?.placement <= 3 ? C.gold : C.gray600, borderBottom: `1px solid ${C.gray100}` }}>
                  {c.white?.placement ? `#${c.white.placement}` : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
