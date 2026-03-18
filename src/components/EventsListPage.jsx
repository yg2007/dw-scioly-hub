import { C, TYPE_COLORS } from '../ui';
import { EVENTS, generateMastery } from '../data/mockData';

export default function EventsListPage({ user, navigate, userRole }) {
  const typeColors = { study: { bg: C.goldLight, text: "#A0522D" }, lab: { bg: "#E2F0E6", text: C.tealDark }, build: { bg: "#F5E2DC", text: C.coral } };
  const eventsToShow = userRole === "student" ? EVENTS.filter(e => user.events.includes(e.id)) : EVENTS;

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        {userRole === "student" ? "My Events" : "All Events"}
      </h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
        {userRole === "student" ? `${eventsToShow.length} events assigned` : "23 events + 3 trial events"}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {eventsToShow.map(ev => {
          const m = generateMastery(user.id, ev.id);
          const avg = Math.round(m.reduce((s, t) => s + t.score, 0) / m.length);
          const tc = typeColors[ev.type];
          return (
            <div key={ev.id} onClick={() => navigate("events", ev)}
              style={{ background: C.white, borderRadius: 16, padding: 22, border: `1px solid ${C.gray200}`,
                cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{ev.icon}</span>
                <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", background: tc.bg, color: tc.text }}>{ev.type}</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{ev.name}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 6, background: C.gray100, borderRadius: 100 }}>
                  <div style={{ height: "100%", borderRadius: 100, width: `${avg}%`,
                    background: avg >= 80 ? C.teal : avg >= 60 ? C.gold : C.coral }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: avg >= 80 ? C.tealDark : avg >= 60 ? C.gold : C.coral }}>
                  {avg}%
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.gray400 }}>
                Team of {ev.teamSize} · {ev.topics.length} topics
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
