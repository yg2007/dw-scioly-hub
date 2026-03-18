import { BarChart3, BookOpen, Brain, Calendar, LogOut, Upload, Users, UsersRound, Wrench } from 'lucide-react';
import { C, TROJAN_SVG } from '../ui';

export default function Sidebar({ page, navigate, userRole, currentUser, onLogout }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 size={18} /> },
    { id: "events", label: "My Events", icon: <BookOpen size={18} /> },
    ...(userRole === "student" ? [
      { id: "upload", label: "Upload Test", icon: <Upload size={18} /> },
      { id: "studypath", label: "Study Path", icon: <Brain size={18} /> },
      { id: "buildlog", label: "Build Log", icon: <Wrench size={18} /> },
      { id: "partners", label: "Partners", icon: <Users size={18} /> },
    ] : []),
    { id: "schedule", label: "Schedule", icon: <Calendar size={18} /> },
    ...(userRole === "admin" ? [
      { id: "team", label: "Team", icon: <UsersRound size={18} /> },
    ] : []),
  ];

  return (
    <div style={{ width: 230, background: C.navy, color: C.white, padding: "24px 14px",
      display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "0 10px", marginBottom: 24, cursor: "pointer" }} onClick={() => navigate("dashboard")}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {TROJAN_SVG(22)}
          <span style={{ fontSize: 17, fontWeight: 800, color: C.gold, letterSpacing: -0.5 }}>DW SciOly Hub</span>
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2, paddingLeft: 30 }}>Daniel Wright · Div B · 2025–26</div>
      </div>

      <nav style={{ flex: 1 }}>
        {items.map(item => {
          const active = page === item.id || (item.id === "events" && page === "events");
          return (
            <button key={item.id} onClick={() => navigate(item.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: active ? "rgba(192,101,42,0.15)" : "transparent",
                color: active ? C.gold : "rgba(255,255,255,0.55)",
                fontSize: 13, fontWeight: 500, marginBottom: 3, fontFamily: "inherit",
                transition: "all 0.15s" }}>
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "14px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: currentUser.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: C.white }}>
            {currentUser.initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{currentUser.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "capitalize" }}>{userRole}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px", borderRadius: 6, border: "none", cursor: "pointer",
          background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)",
          fontSize: 12, fontFamily: "inherit" }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}
