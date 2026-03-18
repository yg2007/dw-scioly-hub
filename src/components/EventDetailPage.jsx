import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, CartesianGrid, Legend, Cell } from 'recharts';
import { ArrowLeft, Brain, Play, Upload, Wrench } from 'lucide-react';
import { C } from '../ui';
import { generateMastery } from '../data/mockData';

export default function EventDetailPage({ event, user, navigate, onStartQuiz, onUploadTest }) {
  const mastery = generateMastery(user.id, event.id);
  const avg = Math.round(mastery.reduce((s, t) => s + t.score, 0) / mastery.length);
  const radarData = mastery.map(m => ({ topic: m.topic.length > 14 ? m.topic.slice(0, 12) + "…" : m.topic, score: m.score, fullMark: 100 }));

  return (
    <div>
      <button onClick={() => navigate("events")}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          color: C.gray400, fontSize: 13, cursor: "pointer", marginBottom: 16, fontFamily: "inherit" }}>
        <ArrowLeft size={14} /> Back to Events
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <span style={{ fontSize: 42 }}>{event.icon}</span>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800 }}>{event.name}</h2>
          <p style={{ color: C.gray600, fontSize: 14 }}>Team of {event.teamSize} · {event.topics.length} topics · {event.type} event</p>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: avg >= 80 ? C.teal : avg >= 60 ? C.gold : C.coral }}>{avg}%</div>
          <div style={{ fontSize: 12, color: C.gray400 }}>Overall Mastery</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Start Quiz", icon: <Play size={16} />, color: C.teal, action: onStartQuiz },
          { label: "Upload Test", icon: <Upload size={16} />, color: C.gold, action: onUploadTest },
          { label: "Study Path", icon: <Brain size={16} />, color: C.coral, action: () => navigate("studypath", event) },
          ...(event.type === "build" ? [{ label: "Build Log", icon: <Wrench size={16} />, color: C.navy, action: () => navigate("buildlog", event) }] : []),
        ].map((btn, i) => (
          <button key={i} onClick={btn.action}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px",
              borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
              background: btn.color, color: C.white, fontSize: 14, fontWeight: 600, transition: "opacity 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = 0.85}
            onMouseLeave={e => e.currentTarget.style.opacity = 1}>
            {btn.icon} {btn.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Topic Breakdown */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>📊 Topic Mastery</h3>
          {mastery.map((m, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 500 }}>{m.topic}</span>
                <span style={{ fontWeight: 700, color: m.score >= 80 ? C.tealDark : m.score >= 60 ? C.gold : C.coral }}>
                  {m.score}%
                  {m.trend === "up" && <span style={{ color: C.tealDark, marginLeft: 4 }}>↑</span>}
                  {m.trend === "down" && <span style={{ color: C.coral, marginLeft: 4 }}>↓</span>}
                </span>
              </div>
              <div style={{ height: 8, background: C.gray100, borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 100, width: `${m.score}%`,
                  background: m.score >= 80 ? C.teal : m.score >= 60 ? C.gold : C.coral }} />
              </div>
            </div>
          ))}
        </div>

        {/* Radar Chart */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>🎯 Skill Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={C.gray200} />
              <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10, fill: C.gray600 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Mastery" dataKey="score" stroke={C.teal} fill={C.teal} fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 10, padding: "12px 14px", background: C.goldLight, borderRadius: 8, fontSize: 12 }}>
            <strong style={{ color: C.gold }}>Focus area:</strong>{" "}
            <span style={{ color: C.gray600 }}>
              {mastery.sort((a, b) => a.score - b.score)[0]?.topic} ({mastery.sort((a, b) => a.score - b.score)[0]?.score}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
