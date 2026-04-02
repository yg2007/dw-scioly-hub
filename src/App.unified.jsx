// ═══════════════════════════════════════════════════════════════
//  DW SciOly Hub — Unified App Entry (v2 — React Router)
//
//  Replaces custom useState navigation with react-router-dom.
//  Switches between prototype (mock data) and production (Supabase)
//  based on VITE_MODE env variable.
//
//  VITE_MODE=prototype  → mock data, role-picker login (default)
//  VITE_MODE=production → Supabase, Google OAuth
// ═══════════════════════════════════════════════════════════════

import { Component, lazy, Suspense, useState, useEffect, useCallback, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { IS_PRODUCTION } from "./lib/featureFlags";
import { C, TROJAN_SVG } from "./ui";
import { PrototypeAppProvider, ProductionAppProvider, useAppContext } from "./lib/AppContext";
import { AuthProvider } from "./lib/auth";

// Always-loaded (rendered immediately on first paint)
import LoginScreen from "./components/LoginScreen";
import Sidebar from "./components/Sidebar";

// Route-level lazy imports — loaded only when the route is first visited
const GuestBrowsePage        = lazy(() => import("./components/GuestBrowsePage"));
const StudentDashboard       = lazy(() => import("./components/StudentDashboard"));
const CoachDashboard         = lazy(() => import("./components/CoachDashboard"));
const EventsListPage         = lazy(() => import("./components/EventsListPage"));
const EventDetailPage        = lazy(() => import("./components/EventDetailPage"));
const QuizPage               = lazy(() => import("./components/QuizPage"));
const MockTestPage           = lazy(() => import("./components/MockTestPage"));
const TestUploadPage         = lazy(() => import("./components/TestUploadPage"));
const StudyPathPage          = lazy(() => import("./components/StudyPathPage"));
const BuildLogPage           = lazy(() => import("./components/BuildLogPage"));
const PartnerSynergyPage     = lazy(() => import("./components/PartnerSynergyPage"));
const SchedulePage           = lazy(() => import("./components/SchedulePage"));
const TeamManagement         = lazy(() => import("./components/TeamManagement"));
const PartnershipManagement  = lazy(() => import("./components/PartnershipManagement"));
const StudentCapabilityMatrix = lazy(() => import("./components/StudentCapabilityMatrix"));
const QuestionBankPage       = lazy(() => import("./components/QuestionBankPage"));
const CipherDrillPage        = lazy(() => import("./components/CipherDrillPage/CipherDrillPage"));
const SuggestionsPage        = lazy(() => import("./components/SuggestionsPage"));

// ─── Loading Screen ──────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 60%, #1A3328 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
      fontFamily: "'Inter', sans-serif",
    }}>
      {TROJAN_SVG(56)}
      <h1 style={{ color: C.white, fontSize: 28, fontWeight: 800, marginTop: 16 }}>
        DW Sci<span style={{ color: C.gold }}>Oly</span> Hub
      </h1>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 8 }}>Loading...</p>
    </div>
  );
}

// ─── Production Login (Google OAuth) ─────────────────────────
function ProductionLoginScreen() {
  const { signInWithGoogle } = useAppContext();
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 60%, #1A3328 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        {TROJAN_SVG(56)}
        <h1 style={{ color: C.white, fontSize: 42, fontWeight: 800, letterSpacing: -1, marginBottom: 4, marginTop: 10 }}>
          DW Sci<span style={{ color: C.gold }}>Oly</span> Hub
        </h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, marginBottom: 6 }}>Daniel Wright Junior High School</p>
        <p style={{ color: C.gold, fontSize: 13, fontWeight: 600, marginBottom: 32 }}>Science Olympiad Division B · 2025–26</p>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "32px 28px", border: "1px solid rgba(255,255,255,0.1)" }}>
          <button onClick={signInWithGoogle}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              padding: "16px 24px", background: hovered ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
              border: `1px solid ${hovered ? C.gold : "rgba(255,255,255,0.15)"}`,
              borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
              color: C.white, fontSize: 16, fontWeight: 600, fontFamily: "inherit",
            }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 16 }}>
            Your role is assigned by your head coach after first sign-in.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Command Palette (Cmd+K) ──────────────────────────────────
function CommandPalette({ onClose }) {
  const navigate = useNavigate();
  const { userRole } = useAppContext();
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const allItems = [
    { label: "Dashboard", path: "/dashboard", icon: "📊", keywords: "home overview" },
    { label: "My Events", path: "/events", icon: "📚", keywords: "events list" },
    { label: "Schedule", path: "/schedule", icon: "📅", keywords: "competitions calendar dates" },
    { label: "Suggestions", path: "/suggestions", icon: "💡", keywords: "suggestions feedback ideas vote" },
    ...(userRole === "student" ? [
      { label: "Upload Test", path: "/upload", icon: "📤", keywords: "scan test upload" },
      { label: "Study Path", path: "/studypath", icon: "🧠", keywords: "study adaptive learning" },
      { label: "Build Log", path: "/buildlog", icon: "🔧", keywords: "build practice engineering" },
    ] : []),
    ...((userRole === "admin" || userRole === "coach") ? [
      { label: "Capability Matrix", path: "/capability", icon: "📋", keywords: "skills students matrix" },
      { label: "Pairings", path: "/pairings", icon: "🔗", keywords: "partnerships pairs teams" },
      { label: "Partner Synergy", path: "/partners", icon: "👥", keywords: "synergy partners" },
      { label: "Question Bank", path: "/question-bank", icon: "💾", keywords: "questions quiz bank" },
    ] : []),
    ...(userRole === "admin" ? [
      { label: "Team Management", path: "/team", icon: "👤", keywords: "roster coaches students invite" },
    ] : []),
  ];

  const filtered = query.trim()
    ? allItems.filter(item => {
        const q = query.toLowerCase();
        return item.label.toLowerCase().includes(q) || item.keywords.includes(q);
      })
    : allItems;

  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setSelectedIdx(0); }, [query]);

  const go = useCallback((path) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filtered[selectedIdx]) { go(filtered[selectedIdx].path); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300,
      display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 120 }}
      onClick={onClose}>
      <div className="cmd-palette" style={{
        width: 480, maxWidth: "calc(100vw - 32px)", background: C.white, borderRadius: 16, overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)", border: `1px solid ${C.gray200}`,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.gray100}` }}>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jump to page..."
            style={{ width: "100%", border: "none", outline: "none", fontSize: 16,
              fontFamily: "inherit", background: "transparent", color: C.navy }} />
        </div>
        <div style={{ maxHeight: 320, overflow: "auto", padding: "8px" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "20px 12px", textAlign: "center", color: C.gray400, fontSize: 13 }}>
              No matching pages
            </div>
          )}
          {filtered.map((item, i) => (
            <button key={item.path} onClick={() => go(item.path)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: i === selectedIdx ? C.goldLight : "transparent",
                color: C.navy, fontSize: 14, fontWeight: 500, fontFamily: "inherit",
                textAlign: "left",
              }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
              {i === selectedIdx && (
                <span style={{ marginLeft: "auto", fontSize: 11, color: C.gray400, fontWeight: 600 }}>Enter ↵</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.gray100}`,
          fontSize: 11, color: C.gray400, display: "flex", gap: 16 }}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

// ─── App Shell (sidebar + content via Outlet) ────────────────
function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  // Cmd+K / Ctrl+K to open command palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="app-shell" style={{ display: "flex", height: "100vh", background: C.offWhite, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content" style={{ flex: 1, overflow: "auto", padding: "28px 36px" }}>
        {/* Mobile hamburger + Cmd+K hint */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 0 }}>
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} style={{
            display: "none", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.gray200}`,
            background: C.white, cursor: "pointer", marginBottom: 16,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <button onClick={() => setCmdOpen(true)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 14px",
            background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8,
            color: C.gray400, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            marginLeft: "auto", marginBottom: 12,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Jump to... <kbd style={{ padding: "2px 5px", borderRadius: 4, background: C.gray100, fontSize: 10, fontWeight: 700 }}>⌘K</kbd>
          </button>
        </div>
        <Outlet />
      </main>

      {/* Command Palette */}
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  );
}

// ─── Dashboard Router — picks student vs coach/admin ─────────
function DashboardPage() {
  const { userRole } = useAppContext();
  if (userRole === "coach" || userRole === "admin") {
    return <CoachDashboard isAdmin={userRole === "admin"} />;
  }
  return <StudentDashboard />;
}

// ─── Authenticated App (Login gate + Routes) ─────────────────
function AuthenticatedApp() {
  const { loggedIn, loading, userRole, isProduction, login } = useAppContext();

  if (loading) return <LoadingScreen />;

  if (!loggedIn) {
    if (isProduction) return <ProductionLoginScreen />;
    return <LoginScreen onLogin={login} />;
  }

  if (userRole === "guest") {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <GuestBrowsePage onSignIn={() => login("student")} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="events" element={<EventsListPage />} />
          <Route path="events/:eventId" element={<EventDetailPage />} />
          <Route path="events/:eventId/quiz" element={<QuizPage />} />
          <Route path="events/:eventId/mock-test" element={<MockTestPage />} />
          <Route path="events/:eventId/upload" element={<TestUploadPage />} />
          <Route path="events/:eventId/studypath" element={<StudyPathPage />} />
          <Route path="events/:eventId/buildlog" element={<BuildLogPage />} />
          <Route path="events/:eventId/cipher" element={<CipherDrillPage />} />
          <Route path="upload" element={<TestUploadPage />} />
          <Route path="studypath" element={<StudyPathPage />} />
          <Route path="buildlog" element={<BuildLogPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="suggestions" element={<SuggestionsPage />} />
          {(userRole === "admin" || userRole === "coach") && (
            <>
              <Route path="capability" element={<StudentCapabilityMatrix />} />
              <Route path="pairings" element={<PartnershipManagement />} />
              <Route path="partners" element={<PartnerSynergyPage />} />
              <Route path="question-bank" element={<QuestionBankPage />} />
            </>
          )}
          {userRole === "admin" && (
            <Route path="team" element={<TeamManagement />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

// ─── Error Boundary ──────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("App crash:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", fontFamily: "'Inter', sans-serif", background: "#1B3A2D", color: "white",
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 16, maxWidth: 500, textAlign: "center" }}>
            {this.state.error.message}
          </p>
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "#C0652A",
              color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Root Export ──────────────────────────────────────────────
// In production, the app is served at /app via Vercel rewrites.
// In dev mode (Vite), it's at the root /.
const BASENAME = import.meta.env.PROD ? "/app" : "/";

export default function App() {
  const AppProvider = IS_PRODUCTION ? ProductionAppProvider : PrototypeAppProvider;
  const Wrapper = IS_PRODUCTION
    ? ({ children }) => <AuthProvider>{children}</AuthProvider>
    : ({ children }) => <>{children}</>;

  return (
    <ErrorBoundary>
      <BrowserRouter basename={BASENAME}>
        <Wrapper>
          <AppProvider>
            <AuthenticatedApp />
          </AppProvider>
        </Wrapper>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
