import { useState } from 'react';
import { ChevronRight, Eye, GraduationCap, Microscope, Shield } from 'lucide-react';
import { C, TROJAN_SVG } from '../ui';

export default function LoginScreen({ onLogin }) {
  const [hoveredRole, setHoveredRole] = useState(null);
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 60%, #1A3328 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        {TROJAN_SVG(56)}
        <h1 style={{ color: C.white, fontSize: 42, fontWeight: 800, letterSpacing: -1, marginBottom: 4, marginTop: 10 }}>
          DW Sci<span style={{ color: C.gold }}>Oly</span> Hub
        </h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, marginBottom: 6 }}>
          Daniel Wright Junior High School
        </p>
        <p style={{ color: C.gold, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Science Olympiad Division B · 2025–26
        </p>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginBottom: 32 }}>
          🏆 14× Consecutive Illinois State Champions
        </p>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "32px 28px", border: "1px solid rgba(255,255,255,0.1)" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 20, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>
            Choose your role to explore
          </p>
          {[
            { role: "student", label: "Student", desc: "Alex Chen — 5 events", icon: <GraduationCap size={20} />, color: C.teal },
            { role: "coach", label: "Event Coach", desc: "Anatomy & Physiology coach", icon: <Microscope size={20} />, color: C.gold },
            { role: "admin", label: "Head Coach / Admin", desc: "Full team oversight", icon: <Shield size={20} />, color: C.coral },
          ].map(r => (
            <button key={r.role} onClick={() => onLogin(r.role)}
              onMouseEnter={() => setHoveredRole(r.role)} onMouseLeave={() => setHoveredRole(null)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                background: hoveredRole === r.role ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${hoveredRole === r.role ? r.color : "rgba(255,255,255,0.1)"}`,
                borderRadius: 12, marginBottom: 10, cursor: "pointer", transition: "all 0.2s",
                color: C.white, fontSize: 15, fontWeight: 600, fontFamily: "inherit" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${r.color}22`,
                display: "flex", alignItems: "center", justifyContent: "center", color: r.color }}>
                {r.icon}
              </div>
              <div style={{ textAlign: "left" }}>
                <div>{r.label}</div>
                <div style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>{r.desc}</div>
              </div>
              <ChevronRight size={16} style={{ marginLeft: "auto", opacity: 0.4 }} />
            </button>
          ))}

          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "16px 0" }} />

          <button onClick={() => onLogin("guest")}
            onMouseEnter={() => setHoveredRole("guest")} onMouseLeave={() => setHoveredRole(null)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
              background: hoveredRole === "guest" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${hoveredRole === "guest" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
              color: C.white, fontSize: 15, fontWeight: 600, fontFamily: "inherit" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)" }}>
              <Eye size={20} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div>Browse Events</div>
              <div style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.35)" }}>View all 23 events — no sign-in required</div>
            </div>
            <ChevronRight size={16} style={{ marginLeft: "auto", opacity: 0.3 }} />
          </button>

          <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(192,101,42,0.1)",
            borderRadius: 10, border: "1px solid rgba(192,101,42,0.2)" }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 500 }}>
              🔐 In production: Sign in with Google (Gmail) — roles auto-detected
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
