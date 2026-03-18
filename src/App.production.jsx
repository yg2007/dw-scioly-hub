// ═══════════════════════════════════════════════════════════════
//  DW SciOly Hub — Production App Shell
//  Replaces mock data with Supabase hooks + real auth
//
//  MIGRATION GUIDE:
//  1. Copy all UI components from App.jsx (LoginScreen through
//     SchedulePage) into a /components folder
//  2. In each component, replace references to EVENTS, STUDENTS,
//     PARTNERSHIPS, QUIZ_BANK, generateMastery with the
//     corresponding hook from ./hooks
//  3. Replace this file's inline components with imports
//
//  This file shows the wiring — how auth + hooks connect to
//  the existing UI structure.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useAuth } from "./lib/auth";
import {
  useEvents,
  useUserEvents,
  useQuizQuestions,
  useAIQuiz,
  useQuizAttempts,
  useTopicMastery,
  useBuildLogs,
  usePartners,
  useStudyPaths,
  useTestUploads,
  useSchedule,
  useAnnouncements,
  useCoachDashboard,
} from "./hooks";

// Import all UI constants + components from the prototype
// In production, split these into separate files under /components
import {
  C,
  TROJAN_SVG,
  // Re-export all page components after refactoring them
} from "./ui";

// ─── Loading spinner ─────────────────────────────────────────
function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 60%, #1A3328 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {TROJAN_SVG(56)}
      <h1 style={{ color: C.white, fontSize: 28, fontWeight: 800, marginTop: 16 }}>
        DW Sci<span style={{ color: C.gold }}>Oly</span> Hub
      </h1>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 8 }}>Loading...</p>
    </div>
  );
}

// ─── Production Login Screen (Google OAuth) ──────────────────
function ProductionLoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [hoveredRole, setHoveredRole] = useState(null);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 60%, #1A3328 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        {TROJAN_SVG(56)}
        <h1
          style={{
            color: C.white,
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: -1,
            marginBottom: 4,
            marginTop: 10,
          }}
        >
          DW Sci<span style={{ color: C.gold }}>Oly</span> Hub
        </h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, marginBottom: 6 }}>
          Daniel Wright Junior High School
        </p>
        <p style={{ color: C.gold, fontSize: 13, fontWeight: 600, marginBottom: 32 }}>
          Science Olympiad Division B · 2025–26
        </p>

        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 20,
            padding: "32px 28px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <button
            onClick={signInWithGoogle}
            onMouseEnter={() => setHoveredRole("google")}
            onMouseLeave={() => setHoveredRole(null)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "16px 24px",
              background: hoveredRole === "google" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
              border: `1px solid ${hoveredRole === "google" ? C.gold : "rgba(255,255,255,0.15)"}`,
              borderRadius: 12,
              cursor: "pointer",
              transition: "all 0.2s",
              color: C.white,
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>

          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 16 }}>
            Your role (Student / Coach / Admin) is assigned by your head coach after first sign-in.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main App (production) ───────────────────────────────────
export default function App() {
  const { profile, loading, signOut } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Core data hooks
  const { events, loading: eventsLoading } = useEvents();
  const { eventIds } = useUserEvents(profile?.id);

  // Show loading while auth initializes
  if (loading || eventsLoading) return <LoadingScreen />;

  // Not logged in — show login
  if (!profile) return <ProductionLoginScreen />;

  const navigate = (p, ev) => {
    setPage(p);
    if (ev) setSelectedEvent(ev);
  };

  // Build the user object that matches prototype's currentUser shape
  const currentUser = {
    id: profile.id,
    name: profile.full_name,
    initials: profile.initials,
    events: eventIds,
    color: profile.avatar_color,
  };

  // ─────────────────────────────────────────────────────────
  // From here, render the same component tree as the prototype.
  //
  // Each page component should be imported from ./components
  // and receive the hooks it needs as props (or use hooks directly).
  //
  // Example for StudentDashboard:
  //
  //   <StudentDashboard
  //     user={currentUser}
  //     events={events}
  //     navigate={navigate}
  //   />
  //
  // Inside StudentDashboard, replace:
  //   const myEvents = EVENTS.filter(e => user.events.includes(e.id))
  // with:
  //   const myEvents = events.filter(e => user.events.includes(e.id))
  //
  // Replace quiz attempt tracking with:
  //   const { attempts, submitAttempt } = useQuizAttempts(user.id)
  //
  // That's the pattern for every component. The UI stays the same,
  // only the data source changes.
  // ─────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: C.offWhite,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Sidebar — pass navigate, page, userRole, currentUser, onLogout={signOut} */}
      {/* <Sidebar page={page} navigate={navigate} userRole={profile.role} currentUser={currentUser} onLogout={signOut} /> */}

      <main style={{ flex: 1, overflow: "auto", padding: "28px 36px" }}>
        {/* Route to the correct page component based on `page` state */}
        {/* Each component receives `events` (from useEvents) instead of the EVENTS constant */}
        {/* Each component uses hooks for its data instead of mock arrays */}

        <div style={{ textAlign: "center", padding: 60 }}>
          <h2 style={{ color: C.navy, fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            Production Shell Ready
          </h2>
          <p style={{ color: C.gray600, fontSize: 15, lineHeight: 1.7, maxWidth: 500, margin: "0 auto" }}>
            Welcome, <strong>{profile.full_name}</strong> ({profile.role}).
            <br />
            This shell is wired to Supabase auth. To complete the migration, import
            the UI components from the prototype and connect them to the hooks in{" "}
            <code style={{ background: C.gray100, padding: "2px 6px", borderRadius: 4 }}>src/hooks/</code>.
          </p>
          <p style={{ color: C.gray400, fontSize: 13, marginTop: 20 }}>
            {events.length} events loaded from database · {eventIds.length} assigned to you
          </p>
          <button
            onClick={signOut}
            style={{
              marginTop: 24,
              padding: "10px 24px",
              background: C.coral,
              color: C.white,
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}
