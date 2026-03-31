// ═══════════════════════════════════════════════════════════════
//  AppContext — Shared application state (user, role, auth)
//
//  Replaces prop-drilling of navigate, user, userRole across all
//  components. Works in both prototype and production mode.
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { IS_PRODUCTION } from "./featureFlags";
import { useAuth } from "./auth";
import { useUserEvents } from "../hooks/useEvents";
import { STUDENTS } from "../data/mockData";

const AppContext = createContext(null);

// ─── Prototype Provider ──────────────────────────────────────
export function PrototypeAppProvider({ children }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("student");

  const currentUser = STUDENTS[0]; // Default prototype user

  const login = useCallback((role) => {
    setLoggedIn(true);
    setUserRole(role);
  }, []);

  const logout = useCallback(() => {
    setLoggedIn(false);
    setUserRole("student");
  }, []);

  const value = useMemo(() => ({
    loggedIn,
    userRole,
    currentUser,
    login,
    logout,
    loading: false,
    isProduction: false,
  }), [loggedIn, userRole, currentUser, login, logout]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─── Production Provider ─────────────────────────────────────
export function ProductionAppProvider({ children }) {
  const { profile, loading, signOut, signInWithGoogle } = useAuth();
  const { eventIds } = useUserEvents(profile?.id);

  const currentUser = useMemo(() => profile
    ? {
        id: profile.id,
        name: profile.full_name,
        initials: profile.initials,
        events: eventIds,
        color: profile.avatar_color,
      }
    : null, [profile, eventIds]);

  const value = useMemo(() => ({
    loggedIn: !!profile,
    userRole: profile?.role || "student",
    currentUser,
    login: null, // Not used in production — Google OAuth handles it
    logout: signOut,
    signInWithGoogle,
    loading,
    isProduction: true,
  }), [profile, currentUser, signOut, signInWithGoogle, loading]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return ctx;
}

export default AppContext;
