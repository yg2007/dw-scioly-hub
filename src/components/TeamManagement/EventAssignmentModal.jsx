import { useState, useMemo } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { C } from "../../ui";
import { TYPE_COLORS } from "./constants";

export default function EventAssignmentModal({ user, events, roster, onToggle, onClose }) {
  const [togglingEventId, setTogglingEventId] = useState(null);

  // Get fresh eventIds from roster (updates after toggle)
  const currentUser = roster.find(u => u.id === user.id) || user;
  const assigned = currentUser.eventIds || [];

  const byType = useMemo(() => {
    const sorted = { study: [], lab: [], build: [] };
    events.forEach(ev => {
      const t = ev.type || "study";
      if (sorted[t]) sorted[t].push(ev);
    });
    return sorted;
  }, [events]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }} onClick={onClose}>
      <div style={{
        background: C.white, borderRadius: 20, width: 560, maxHeight: "85vh",
        overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "24px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: currentUser.avatar_color || C.teal,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.white, fontSize: 14, fontWeight: 700,
            }}>
              {currentUser.initials}
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 2 }}>
                {currentUser.full_name}
              </h2>
              <p style={{ fontSize: 12, color: C.gray400 }}>
                {assigned.length} event{assigned.length !== 1 ? "s" : ""} assigned — click to toggle
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.gray200}`,
            background: C.white, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", color: C.gray400,
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "20px 28px 28px" }}>
          {["study", "lab", "build"].map(type => {
            if (!byType[type]?.length) return null;
            const tc = TYPE_COLORS[type] || {};
            return (
              <div key={type} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
                  color: tc.text || C.gray400, marginBottom: 8,
                }}>
                  {type} Events
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {byType[type].map(ev => {
                    const isAssigned = assigned.includes(ev.id);
                    const isToggling = togglingEventId === ev.id;
                    return (
                      <button key={ev.id}
                        disabled={togglingEventId !== null}
                        onClick={async () => {
                          setTogglingEventId(ev.id);
                          try {
                            await onToggle(currentUser.id, ev.id, isAssigned);
                          } finally {
                            setTogglingEventId(null);
                          }
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                          borderRadius: 10,
                          cursor: togglingEventId !== null ? "wait" : "pointer",
                          textAlign: "left", fontFamily: "inherit",
                          border: isAssigned ? `2px solid ${C.teal}` : `1px solid ${C.gray200}`,
                          background: isAssigned ? "#E2F0E6" : C.white,
                          transition: "all 0.15s",
                          opacity: togglingEventId !== null && !isToggling ? 0.5 : 1,
                        }}>
                        {isToggling
                          ? <Loader2 size={16} color={C.teal} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                          : <span style={{ fontSize: 20, flexShrink: 0 }}>{ev.icon}</span>
                        }
                        <span style={{ fontSize: 12, fontWeight: 600, color: isAssigned ? C.tealDark : C.navy, flex: 1 }}>
                          {ev.name}
                        </span>
                        {isAssigned && !isToggling && <Check size={14} color={C.teal} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <button onClick={onClose} disabled={togglingEventId !== null} style={{
            width: "100%", padding: "14px", borderRadius: 10, border: "none",
            background: C.navy, color: C.white, fontSize: 14, fontWeight: 700,
            cursor: togglingEventId !== null ? "wait" : "pointer",
            fontFamily: "inherit", marginTop: 8,
          }}>
            Done
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </div>
  );
}
