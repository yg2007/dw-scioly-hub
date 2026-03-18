import { Users } from 'lucide-react';
import { C } from '../ui';
import { EVENTS, PARTNERSHIPS, STUDENTS, generateMastery } from '../data/mockData';

export default function PartnerSynergyPage({ user, navigate }) {
  const userPartnerships = PARTNERSHIPS.filter(p => p.partners.includes(user.id));

  if (userPartnerships.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Users size={48} color={C.gray200} style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No Partnerships Yet</h2>
        <p style={{ color: C.gray400, fontSize: 14 }}>Your coach will assign event partners soon.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>👥 Partner Synergy</h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
        See how you and your partners complement each other across event topics.
      </p>

      {userPartnerships.map(p => {
        const partnerId = p.partners.find(id => id !== user.id);
        const partner = STUDENTS.find(s => s.id === partnerId);
        const ev = EVENTS.find(e => e.id === p.eventId);
        if (!partner || !ev) return null;

        const myMastery = generateMastery(user.id, p.eventId);
        const theirMastery = generateMastery(partnerId, p.eventId);

        return (
          <div key={p.eventId} style={{ background: C.white, borderRadius: 16, padding: 28,
            border: `1px solid ${C.gray200}`, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 28 }}>{ev.icon}</span>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{ev.name}</h3>
                  <p style={{ fontSize: 12, color: C.gray400 }}>Team of {ev.teamSize}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  background: `${user.color}15`, borderRadius: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: user.color,
                    fontSize: 9, fontWeight: 700, color: C.white, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {user.initials}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>You</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  background: `${partner.color}15`, borderRadius: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: partner.color,
                    fontSize: 9, fontWeight: 700, color: C.white, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {partner.initials}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{partner.name.split(" ")[0]}</span>
                </div>
              </div>
            </div>

            {/* Coverage Grid */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px 60px", gap: 0, fontSize: 12 }}>
                <div style={{ padding: "8px 10px", fontWeight: 700, color: C.gray400 }}>Topic</div>
                <div style={{ padding: "8px 10px", fontWeight: 700, color: C.gray400 }}>Coverage</div>
                <div style={{ padding: "8px 10px", fontWeight: 700, color: C.gray400, textAlign: "center" }}>You</div>
                <div style={{ padding: "8px 10px", fontWeight: 700, color: C.gray400, textAlign: "center" }}>{partner.name.split(" ")[0]}</div>
              </div>
              {ev.topics.map((topic, i) => {
                const myScore = myMastery[i]?.score || 0;
                const theirScore = theirMastery[i]?.score || 0;
                const combined = Math.max(myScore, theirScore);
                const status = combined >= 80 ? "green" : (myScore >= 70 || theirScore >= 70) ? "gold" : "red";
                const statusColor = status === "green" ? C.teal : status === "gold" ? C.gold : C.coral;
                const statusBg = status === "green" ? "#E2F0E6" : status === "gold" ? C.goldLight : "#FEF2F2";

                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px 60px",
                    gap: 0, borderTop: `1px solid ${C.gray100}`, alignItems: "center" }}>
                    <div style={{ padding: "10px", fontSize: 13, fontWeight: 500 }}>{topic}</div>
                    <div style={{ padding: "10px" }}>
                      <div style={{ height: 12, background: C.gray100, borderRadius: 100, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", height: "100%", width: `${myScore}%`, background: `${user.color}55`, borderRadius: 100 }} />
                        <div style={{ position: "absolute", height: "100%", width: `${theirScore}%`, background: `${partner.color}55`, borderRadius: 100 }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: myScore >= 80 ? C.tealDark : myScore >= 60 ? C.gold : C.coral }}>
                      {myScore}%
                    </div>
                    <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: theirScore >= 80 ? C.tealDark : theirScore >= 60 ? C.gold : C.coral }}>
                      {theirScore}%
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#E2F0E6", color: C.tealDark }}>
                🟢 Both strong
              </span>
              <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: C.goldLight, color: "#A0522D" }}>
                🟡 One covers it
              </span>
              <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#FEF2F2", color: C.coral }}>
                🔴 Gap for both
              </span>
            </div>

            <div style={{ marginTop: 16, padding: "14px 16px", background: C.goldLight, borderRadius: 10, fontSize: 13 }}>
              <strong style={{ color: C.gold }}>🤖 AI Suggestion:</strong>{" "}
              <span style={{ color: C.gray600 }}>
                {user.name.split(" ")[0]}, focus on {myMastery.sort((a, b) => a.score - b.score)[0]?.topic}.{" "}
                {partner.name.split(" ")[0]} should prioritize {theirMastery.sort((a, b) => a.score - b.score)[0]?.topic}.
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
