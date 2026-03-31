import { BarChart3, BookOpen, Brain, Calendar, Database, Grid3X3, LogOut, MessageSquarePlus, Upload, Users, UsersRound, Wrench, Link2, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { C, TROJAN_SVG } from '../ui';
import { useAppContext } from '../lib/AppContext';

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, currentUser, logout } = useAppContext();

  const items = [
    { path: "/dashboard", label: "Dashboard", icon: <BarChart3 size={18} /> },
    { path: "/events", label: "My Events", icon: <BookOpen size={18} /> },
    ...(userRole === "student" ? [
      { path: "/upload", label: "Upload Test", icon: <Upload size={18} /> },
      { path: "/studypath", label: "Study Path", icon: <Brain size={18} /> },
      { path: "/buildlog", label: "Build Log", icon: <Wrench size={18} /> },
    ] : []),
    { path: "/schedule", label: "Schedule", icon: <Calendar size={18} /> },
    { path: "/suggestions", label: "Suggestions", icon: <MessageSquarePlus size={18} /> },
    ...((userRole === "admin" || userRole === "coach") ? [
      { path: "/capability", label: "Capability", icon: <Grid3X3 size={18} /> },
      { path: "/pairings", label: "Pairings", icon: <Link2 size={18} /> },
      { path: "/partners", label: "Synergy", icon: <Users size={18} /> },
      { path: "/question-bank", label: "Question Bank", icon: <Database size={18} /> },
    ] : []),
    ...(userRole === "admin" ? [
      { path: "/team", label: "Team", icon: <UsersRound size={18} /> },
    ] : []),
  ];

  // Match current route to highlight active sidebar item
  const currentPath = location.pathname;
  const isActive = (itemPath) => {
    if (itemPath === "/dashboard") return currentPath === "/" || currentPath === "/dashboard";
    return currentPath.startsWith(itemPath);
  };

  const handleNav = (path) => {
    navigate(path);
    if (onClose) onClose(); // close on mobile after nav
  };

  return (
    <div className={`sidebar${open ? " open" : ""}`}
      style={{ width: 230, background: C.navy, color: C.white, padding: "24px 14px",
        display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "0 10px", marginBottom: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => handleNav("/dashboard")}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {TROJAN_SVG(22)}
            <span style={{ fontSize: 17, fontWeight: 800, color: C.gold, letterSpacing: -0.5 }}>DW SciOly Hub</span>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2, paddingLeft: 30 }}>Daniel Wright · Div B · 2025–26</div>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button className="hamburger-btn" onClick={onClose} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.5)",
            cursor: "pointer", padding: 4, alignItems: "center", justifyContent: "center",
          }}>
            <X size={20} />
          </button>
        )}
      </div>

      <nav style={{ flex: 1 }}>
        {items.map(item => {
          const active = isActive(item.path);
          return (
            <button key={item.path} onClick={() => handleNav(item.path)}
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
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: currentUser?.color || C.teal,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: C.white }}>
            {currentUser?.initials || "?"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{currentUser?.name || "User"}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "capitalize" }}>{userRole}</div>
          </div>
        </div>
        <button onClick={logout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px", borderRadius: 6, border: "none", cursor: "pointer",
          background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)",
          fontSize: 12, fontFamily: "inherit" }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}
