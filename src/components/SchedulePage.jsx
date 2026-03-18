import { C, TYPE_COLORS } from '../ui';

export default function SchedulePage({ navigate }) {
  const events = [
    { date: "Mar 22, 2026", name: "Wheeling Invitational", type: "invitational", status: "upcoming" },
    { date: "Apr 4, 2026", name: "Regional Tournament", type: "regional", status: "upcoming" },
    { date: "Apr 18, 2026", name: "State Tournament", type: "state", status: "upcoming" },
    { date: "May 29–30, 2026", name: "National Tournament", type: "nationals", status: "upcoming" },
    { date: "Mar 8, 2026", name: "Lincoln-Way Invitational", type: "invitational", status: "past" },
    { date: "Feb 22, 2026", name: "Niles West Invitational", type: "invitational", status: "past" },
  ];
  const typeColors = {
    invitational: { bg: C.goldLight, text: "#A0522D" },
    regional: { bg: "#E2F0E6", text: C.tealDark },
    state: { bg: "#EDE9FE", text: "#7C3AED" },
    nationals: { bg: "#FEF2F2", text: C.coral },
  };

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>📅 Competition Schedule</h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>2025–2026 Season</p>

      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: C.teal }}>Upcoming</h3>
      {events.filter(e => e.status === "upcoming").map((ev, i) => {
        const tc = typeColors[ev.type];
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px",
            background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, marginBottom: 10 }}>
            <div style={{ width: 48, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: C.gray400, fontWeight: 600 }}>{ev.date.split(" ")[0]}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>{ev.date.split(" ")[1]?.replace(",", "")}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{ev.name}</div>
            </div>
            <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", background: tc.bg, color: tc.text }}>{ev.type}</span>
          </div>
        );
      })}

      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "24px 0 14px", color: C.gray400 }}>Past Events</h3>
      {events.filter(e => e.status === "past").map((ev, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
          background: C.white, borderRadius: 12, border: `1px solid ${C.gray100}`, marginBottom: 8, opacity: 0.6 }}>
          <div style={{ width: 48, textAlign: "center", fontSize: 13, color: C.gray400 }}>{ev.date.split(",")[0]}</div>
          <div style={{ flex: 1, fontSize: 14, color: C.gray600 }}>{ev.name}</div>
          <span style={{ fontSize: 11, color: C.gray400 }}>Completed ✓</span>
        </div>
      ))}
    </div>
  );
}
