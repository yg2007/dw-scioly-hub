import { ArrowLeft, CheckCircle, Play } from 'lucide-react';
import { C } from '../ui';
import { EVENTS, generateMastery } from '../data/mockData';

export default function StudyPathPage({ event, user, navigate }) {
  const ev = event || EVENTS.find(e => user.events.includes(e.id));
  const mastery = ev ? generateMastery(user.id, ev.id) : [];
  const avg = mastery.length ? Math.round(mastery.reduce((s, t) => s + t.score, 0) / mastery.length) : 0;
  const currentStage = avg >= 85 ? 4 : avg >= 70 ? 3 : avg >= 50 ? 2 : 1;

  const stages = [
    { num: 1, name: "Generalize", desc: "Build baseline across all topics", color: C.gold, icon: "📚",
      tasks: ["Complete overview readings for all topics", "Take a broad diagnostic quiz", "Identify major knowledge gaps"] },
    { num: 2, name: "Specialize", desc: "Target your weak areas", color: C.teal, icon: "🎯",
      tasks: ["Focus quizzes on lowest-scoring topics", "Review AI-generated study summaries", "Practice with topic-specific flashcards"] },
    { num: 3, name: "Refine", desc: "State & nationals depth", color: C.coral, icon: "⚡",
      tasks: ["Cover State/National-only topics", "Practice advanced application questions", "Coordinate coverage with partner"] },
    { num: 4, name: "Master", desc: "Competition simulation", color: C.navy, icon: "🏆",
      tasks: ["Timed full practice tests", "Review past state/national questions", "Maintain mastery with spaced review"] },
  ];

  return (
    <div>
      {ev && (
        <button onClick={() => navigate("events", ev)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
            color: C.gray400, fontSize: 13, cursor: "pointer", marginBottom: 16, fontFamily: "inherit" }}>
          <ArrowLeft size={14} /> Back to {ev.name}
        </button>
      )}

      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        🧠 Learning Path {ev ? `— ${ev.icon} ${ev.name}` : ""}
      </h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 32 }}>
        You're currently in <strong style={{ color: stages[currentStage - 1].color }}>Stage {currentStage}: {stages[currentStage - 1].name}</strong>
        {avg > 0 && ` with ${avg}% overall mastery.`}
      </p>

      {/* Stage Progress */}
      <div style={{ display: "flex", gap: 0, marginBottom: 40, position: "relative" }}>
        {stages.map((s, i) => {
          const isActive = s.num === currentStage;
          const isComplete = s.num < currentStage;
          return (
            <div key={i} style={{ flex: 1, textAlign: "center", position: "relative" }}>
              {i < 3 && (
                <div style={{ position: "absolute", top: 28, left: "50%", width: "100%", height: 4,
                  background: isComplete ? `linear-gradient(90deg, ${stages[i].color}, ${stages[i + 1].color})` : C.gray200,
                  zIndex: 0, borderRadius: 2 }} />
              )}
              <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                background: isActive ? s.color : isComplete ? s.color : C.gray100,
                color: isActive || isComplete ? C.white : C.gray400,
                border: isActive ? `3px solid ${s.color}` : "none",
                boxShadow: isActive ? `0 0 0 6px ${s.color}33` : "none",
                position: "relative", zIndex: 1, transition: "all 0.3s" }}>
                {isComplete ? <CheckCircle size={24} /> : s.icon}
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: isActive ? s.color : isComplete ? C.navy : C.gray400 }}>{s.name}</h4>
              <p style={{ fontSize: 12, color: C.gray400, maxWidth: 160, margin: "4px auto 0" }}>{s.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Current Stage Tasks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            📋 Stage {currentStage} Tasks: {stages[currentStage - 1].name}
          </h3>
          {stages[currentStage - 1].tasks.map((task, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
              background: i === 0 ? C.goldLight : C.offWhite, borderRadius: 10, marginBottom: 8, fontSize: 13, cursor: "pointer" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center",
                justifyContent: "center", background: i === 0 ? C.gold : C.gray200, flexShrink: 0 }}>
                {i === 0 ? <Play size={14} color={C.white} /> : <span style={{ fontSize: 12, fontWeight: 700, color: C.gray400 }}>{i + 1}</span>}
              </div>
              <span style={{ fontWeight: i === 0 ? 600 : 400, color: i === 0 ? C.navy : C.gray600 }}>{task}</span>
            </div>
          ))}
          {ev && (
            <button onClick={() => navigate("quiz")}
              style={{ width: "100%", marginTop: 16, padding: "12px", borderRadius: 10, border: "none",
                background: stages[currentStage - 1].color, color: C.white, fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit" }}>
              Start Next Quiz →
            </button>
          )}
        </div>

        {/* Topic Priority List */}
        {ev && (
          <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🎯 Priority Topics</h3>
            {[...mastery].sort((a, b) => a.score - b.score).map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                borderBottom: i < mastery.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
                  background: i < 3 ? "#FEF2F2" : i < 5 ? C.goldLight : "#E2F0E6",
                  color: i < 3 ? C.coral : i < 5 ? "#A0522D" : C.tealDark }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{m.topic}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: m.score >= 80 ? C.tealDark : m.score >= 60 ? C.gold : C.coral }}>
                  {m.score}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
