import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { C } from "../../ui";
import { TYPE_COLORS, ROLE_CONFIG } from "./constants";

export default function EventAssignmentsView({ events, roster, onAssign }) {
  const [expandedEvent, setExpandedEvent] = useState(null);

  const assignments = useMemo(() => {
    const map = {};
    events.forEach(ev => {
      map[ev.id] = roster.filter((u) => u.eventIds?.includes(ev.id));
    });
    return map;
  }, [events, roster]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {events.map((ev) => {
        const assigned = assignments[ev.id] || [];
        const expanded = expandedEvent === ev.id;
        const tc = TYPE_COLORS[ev.type] || {};
        return (
          <div key={ev.id} style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, overflow: "hidden" }}>
            <div onClick={() => setExpandedEvent(expanded ? null : ev.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer", userSelect: "none" }}>
              <span style={{ fontSize: 24 }}>{ev.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{ev.name}</div>
                <div style={{ fontSize: 12, color: C.gray400 }}>
                  {assigned.length} / {ev.team_size} assigned
                  <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase", background: tc.bg, color: tc.text }}>{ev.type}</span>
                </div>
              </div>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: assigned.length >= ev.team_size ? "#E2F0E6" : C.gray100,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800,
                color: assigned.length >= ev.team_size ? C.tealDark : C.gray400,
              }}>{assigned.length}/{ev.team_size}</div>
              {expanded ? <ChevronUp size={16} color={C.gray400} /> : <ChevronDown size={16} color={C.gray400} />}
            </div>

            {expanded && (
              <div style={{ padding: "0 18px 14px", borderTop: `1px solid ${C.gray100}` }}>
                {assigned.length === 0 ? (
                  <p style={{ fontSize: 13, color: C.gray400, padding: "12px 0", fontStyle: "italic" }}>No one assigned yet.</p>
                ) : (
                  assigned.map((u) => (
                    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.gray100}` }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7, background: u.avatar_color || C.teal,
                        display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 10, fontWeight: 700,
                      }}>{u.initials}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.navy, flex: 1 }}>{u.full_name}</span>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: ROLE_CONFIG[u.role]?.bg, color: ROLE_CONFIG[u.role]?.color, fontWeight: 600 }}>
                        {ROLE_CONFIG[u.role]?.label}
                      </span>
                    </div>
                  ))
                )}
                {assigned.length < ev.team_size && (
                  <div style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: 1 }}>Quick Add</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {roster.filter((u) => !u.eventIds?.includes(ev.id) && u.role === "student").slice(0, 6).map((u) => (
                        <button key={u.id} onClick={() => onAssign?.(u.id, ev.id)} style={{
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: `1px dashed ${C.gray200}`, background: C.offWhite,
                          color: C.gray600, cursor: "pointer", fontFamily: "inherit",
                        }}>+ {u.full_name.split(" ")[0]}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
