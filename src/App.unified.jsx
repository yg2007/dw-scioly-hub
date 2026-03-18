// ═══════════════════════════════════════════════════════════════
//  DW SciOly Hub — Unified App Entry
//
//  Switches between prototype (mock data) and production (Supabase)
//  based on VITE_MODE env variable.
//
//  VITE_MODE=prototype  → mock data, role-picker login (default)
//  VITE_MODE=production → Supabase, Google OAuth
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { FLAGS, IS_PRODUCTION } from "./lib/featureFlags";
import { C, TROJAN_SVG } from "./ui";
import {
  LoginScreen,
  GuestBrowsePage,
  Sidebar,
  StudentDashboard,
  EventsListPage,
  EventDetailPage,
  QuizPage,
  TestUploadPage,
  StudyPathPage,
  PartnerSynergyPage,
  CoachDashboard,
  SchedulePage,
  BuildLogPage,
  TeamManagement,
} from "./components";
import { STUDENTS } from "./data/mockData";

// Production-only imports (tree-shaken in prototype mode)
let useAuth, AuthProvider, useEvents, useUserEvents;
if (FLAGS.realAuth || FLAGS.realData) {
  ({ useAuth, AuthProvider } = await import("./lib/auth"));
  ({ useEvents, useUserEvents } = await import("./hooks/useEvents"));
}

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
  const { signInWithGoogle } = useAuth();
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

// ─── Prototype Mode App ──────────────────────────────────────
function PrototypeApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("student");
  const [currentUser] = useState(STUDENTS[0]);
  const [page, setPage] = useState("dashboard");
  const [selectedEvent, setSelectedEvent] = useState(null);

  if (!loggedIn) {
    return <LoginScreen onLogin={(role) => { setLoggedIn(true); setUserRole(role); if (role === "guest") setPage("guest"); }} />;
  }

  const navigate = (p, ev) => { setPage(p); if (ev) setSelectedEvent(ev); };

  if (userRole === "guest") {
    return <GuestBrowsePage onSignIn={() => { setLoggedIn(false); setUserRole("student"); setPage("dashboard"); }} />;
  }

  return (
    <AppShell
      page={page} navigate={navigate} userRole={userRole} currentUser={currentUser}
      selectedEvent={selectedEvent} onLogout={() => { setLoggedIn(false); setPage("dashboard"); }}
    />
  );
}

// ─── Production Mode App ─────────────────────────────────────
function ProductionApp() {
  const { profile, loading, signOut } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { eventIds } = useUserEvents(profile?.id);

  if (loading) return <LoadingScreen />;
  if (!profile) return <ProductionLoginScreen />;

  const navigate = (p, ev) => { setPage(p); if (ev) setSelectedEvent(ev); };

  const currentUser = {
    id: profile.id,
    name: profile.full_name,
    initials: profile.initials,
    events: eventIds,
    color: profile.avatar_color,
  };

  return (
    <AppShell
      page={page} navigate={navigate} userRole={profile.role} currentUser={currentUser}
      selectedEvent={selectedEvent} onLogout={signOut}
    />
  );
}

// ─── Shared App Shell (same layout for both modes) ───────────
function AppShell({ page, navigate, userRole, currentUser, selectedEvent, onLogout }) {
  return (
    <div style={{ display: "flex", height: "100vh", background: C.offWhite, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <Sidebar page={page} navigate={navigate} userRole={userRole} currentUser={currentUser} onLogout={onLogout} />
      <main style={{ flex: 1, overflow: "auto", padding: "28px 36px" }}>
        {page === "dashboard" && userRole === "student" && <StudentDashboard user={currentUser} navigate={navigate} />}
        {page === "dashboard" && (userRole === "coach" || userRole === "admin") && <CoachDashboard navigate={navigate} isAdmin={userRole === "admin"} />}
        {page === "events" && !selectedEvent && <EventsListPage user={currentUser} navigate={navigate} userRole={userRole} />}
        {page === "events" && selectedEvent && <EventDetailPage event={selectedEvent} user={currentUser} navigate={navigate} onStartQuiz={() => navigate("quiz")} onUploadTest={() => navigate("upload")} />}
        {page === "quiz" && <QuizPage event={selectedEvent} user={currentUser} navigate={navigate} />}
        {page === "upload" && <TestUploadPage event={selectedEvent} user={currentUser} navigate={navigate} />}
        {page === "studypath" && <StudyPathPage event={selectedEvent} user={currentUser} navigate={navigate} />}
        {page === "partners" && <PartnerSynergyPage user={currentUser} navigate={navigate} />}
        {page === "buildlog" && <BuildLogPage event={selectedEvent} user={currentUser} navigate={navigate} />}
        {page === "schedule" && <SchedulePage navigate={navigate} />}
        {page === "team" && userRole === "admin" && <TeamManagement navigate={navigate} />}
      </main>
    </div>
  );
}

// ─── Root Export ──────────────────────────────────────────────
export default function App() {
  if (IS_PRODUCTION && AuthProvider) {
    return (
      <AuthProvider>
        <ProductionApp />
      </AuthProvider>
    );
  }
  return <PrototypeApp />;
}
