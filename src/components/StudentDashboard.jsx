import { BookOpen, Play, TrendingUp, Upload, Users, Zap } from 'lucide-react';
import { C } from '../ui';
import { EVENTS, PARTNERSHIPS, STUDENTS, generateMastery } from '../data/mockData';

export default function StudentDashboard({ user, navigate }) {
  const userEvents = EVENTS.filter(e => user.events.includes(e.id));
  const masteryData = userEvents.map(ev => {
    const m = generateMastery(user.id, ev.id);
    const avg = Math.round(m.reduce((s, t) => s + t.score, 0) / m.length);
    return { ...ev, mastery: avg };
  });
  const overall = Math.round(masteryData.reduce((s, e) => s + e.mastery, 0) / masteryData.length);
  const daysToState = 33;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>Welcome back, {user.name.split(" ")[0]}</h2>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.tealDark, background: "#E6F4EA", padding: "2px 10px", borderRadius: 100 }}>DW Trojan</span>
      </div>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
        State is in <strong style={{ color: C.coral }}>{daysToState} days</strong>. Members of a TEAM before an achiever of one. 💚
      </p>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Overall Mastery", value: `${overall}%`, change: "↑ 6% this week", color: C.teal, up: true },
          { label: "Events Assigned", value: user.events.length, change: "of 23 total", color: C.navy, up: null },
          { label: "Quizzes Done", value: 37, change: "↑ 5 this week", color: C.gold, up: true },
          { label: "Study Streak", value: "12d", change: "Personal best!", color: C.gold, up: true },
        ].map((s, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 14, padding: 20,
            border: `1px solid ${C.gray200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, margin: "4px 0" }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: s.up ? C.tealDark : C.gray400 }}>{s.change}</div>
          </div>
        ))}
      </div>

      {/* Main Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        {/* Event Mastery */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={16} color={C.teal} /> Event Mastery Breakdown
          </h3>
          {masteryData.map(ev => (
            <div key={ev.id} style={{ marginBottom: 14, cursor: "pointer" }}
              onClick={() => navigate("events", ev)}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 500 }}>{ev.icon} {ev.name}</span>
                <span style={{ fontWeight: 700, color: ev.mastery >= 80 ? C.tealDark : ev.mastery >= 60 ? C.gold : C.coral }}>
                  {ev.mastery}%
                </span>
              </div>
              <div style={{ height: 8, background: C.gray100, borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 100, width: `${ev.mastery}%`,
                  background: ev.mastery >= 80 ? C.teal : ev.mastery >= 60 ? C.gold : C.coral,
                  transition: "width 0.5s ease" }} />
              </div>
            </div>
          ))}

          <div style={{ marginTop: 18, padding: "14px 16px", background: C.goldLight, borderRadius: 10, fontSize: 13 }}>
            <strong style={{ color: C.gold }}>🤖 AI Suggestion:</strong>{" "}
            <span style={{ color: C.gray600 }}>
              Focus on {masteryData.sort((a, b) => a.mastery - b.mastery)[0]?.name} — your lowest event. Start with the adaptive quiz to identify specific sub-topic gaps.
            </span>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Partners */}
          <div style={{ background: C.white, borderRadius: 16, padding: 20, border: `1px solid ${C.gray200}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} color={C.gold} /> My Partners
            </h3>
            {PARTNERSHIPS.filter(p => p.partners.includes(user.id)).slice(0, 3).map(p => {
              const partnerId = p.partners.find(id => id !== user.id);
              const partner = STUDENTS.find(s => s.id === partnerId);
              const ev = EVENTS.find(e => e.id === p.eventId);
              if (!partner || !ev) return null;
              const m = generateMastery(partnerId, p.eventId);
              const avg = Math.round(m.reduce((s, t) => s + t.score, 0) / m.length);
              return (
                <div key={p.eventId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                  background: C.offWhite, borderRadius: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: partner.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: C.white }}>
                    {partner.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{partner.name}</div>
                    <div style={{ fontSize: 11, color: C.gray400 }}>{ev.name} — {avg}% mastery</div>
                  </div>
                </div>
              );
            })}
            <button onClick={() => navigate("partners")}
              style={{ width: "100%", marginTop: 8, padding: "8px", borderRadius: 8,
                border: `1px solid ${C.gray200}`, background: "transparent", cursor: "pointer",
                fontSize: 12, fontWeight: 600, color: C.teal, fontFamily: "inherit" }}>
              View Partner Synergy →
            </button>
          </div>

          {/* Up Next */}
          <div style={{ background: C.white, borderRadius: 16, padding: 20, border: `1px solid ${C.gray200}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={16} color={C.coral} /> Up Next
            </h3>
            {[
              { text: "Quiz: Endocrine System Disorders", type: "quiz" },
              { text: "Read: Cranial Nerve Pathways (State-level)", type: "study" },
              { text: "Upload: Jan Invitational Anatomy Test", type: "upload" },
            ].map((item, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: i < 2 ? `1px solid ${C.gray100}` : "none",
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
