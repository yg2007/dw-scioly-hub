import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, CartesianGrid, Legend, Cell } from 'recharts';
import { C } from '../ui';
import { EVENTS, STUDENTS, generateMastery } from '../data/mockData';

export default function CoachDashboard({ navigate, isAdmin }) {
  const coachEvents = isAdmin ? EVENTS : EVENTS.slice(0, 4);
  const [selectedEventId, setSelectedEventId] = useState(coachEvents[0]?.id);
  const selectedEvent = EVENTS.find(e => e.id === selectedEventId);
  const eventStudents = STUDENTS.filter(s => s.events.includes(selectedEventId));

  const teamReadiness = coachEvents.map(ev => {
    const students = STUDENTS.filter(s => s.events.includes(ev.id));
    const avg = students.length ? Math.round(students.reduce((sum, s) => {
      const m = generateMastery(s.id, ev.id);
      return sum + Math.round(m.reduce((a, b) => a + b.score, 0) / m.length);
    }, 0) / students.length) : 0;
    return { ...ev, readiness: avg, studentCount: students.length };
  }).sort((a, b) => a.readiness - b.readiness);

  const trendData = [
    { week: "W1", score: 42 }, { week: "W2", score: 48 }, { week: "W3", score: 53 },
    { week: "W4", score: 58 }, { week: "W5", score: 62 }, { week: "W6", score: 68 },
    { week: "W7", score: 72 }, { week: "W8", score: 75 },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        {isAdmin ? "🛡️ Admin Dashboard" : "📊 Coach Dashboard"}
      </h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
        {isAdmin ? "Full team oversight — all 23 events" : "Your assigned events overview"}
      </p>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Students", value: STUDENTS.length, color: C.navy },
          { label: "Events Monitored", value: coachEvents.length, color: C.teal },
          { label: "Avg Readiness", value: `${Math.round(teamReadiness.reduce((s, e) => s + e.readiness, 0) / teamReadiness.length)}%`, color: C.gold },
          { label: "Days to State", value: 33, color: C.coral },
        ].map((s, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 14, padding: 18, border: `1px solid ${C.gray200}` }}>
            <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Event Readiness Rankings */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            {isAdmin ? "🏅 All Events Readiness" : "🏅 Your Events Readiness"}
          </h3>
          <div style={{ maxHeight: 340, overflow: "auto" }}>
            {teamReadiness.map((ev, i) => (
              <div key={ev.id} onClick={() => setSelectedEventId(ev.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 8, marginBottom: 4, cursor: "pointer",
                  background: ev.id === selectedEventId ? C.goldLight : "transparent" }}>
                <span style={{ width: 24, fontSize: 12, fontWeight: 700, color: i < 3 ? C.coral : C.gray400 }}>#{i + 1}</span>
                <span style={{ fontSize: 16 }}>{ev.icon}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{ev.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: ev.readiness >= 80 ? C.tealDark : ev.readiness >= 60 ? C.gold : C.coral }}>
                  {ev.readiness}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Team Progress Trend */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📈 Team Progress Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.gray100} />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="score" stroke={C.teal} strokeWidth={3} dot={{ fill: C.teal, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Selected Event Detail */}
      {selectedEvent && (
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            {selectedEvent.icon} {selectedEvent.name} — Student Breakdown
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {eventStudents.map(s => {
              const m = generateMastery(s.id, selectedEventId);
              const avg = Math.round(m.reduce((sum, t) => sum + t.score, 0) / m.length);
              return (
                <div key={s.id} style={{ padding: "16px", background: C.offWhite, borderRadius: 12, border: `1px solid ${C.gray100}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: C.white }}>{s.initials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: C.gray400 }}>{avg}% mastery</div>
                    </div>
                  </div>
                  <div style={{ height: 6, background: C.gray200, borderRadius: 100 }}>
                    <div style={{ height: "100%", borderRadius: 100, width: `${avg}%`,
                      background: avg >= 80 ? C.teal : avg >= 60 ? C.gold : C.coral }} />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: C.gray400 }}>
                    Weakest: {m.sort((a, b) => a.score - b.score)[0]?.topic}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
