import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);       // auth.users record
  const [profile, setProfile] = useState(null);  // public.users record
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      // Profile might not exist yet if trigger hasn't fired
      // Retry once after a short delay
      setTimeout(async () => {
        const { data: retryData } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();
        setProfile(retryData);
        setLoading(false);
      }, 1000);
    } else {
      setProfile(data);
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) console.error("Login error:", error);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }

  async function updateRole(userId, newRole) {
    // Double guard: client-side check + RLS enforcement
    if (profile?.role !== "admin") {
      throw new Error("Unauthorized: only admins can change roles");
    }
    const validRoles = ["student", "coach", "admin"];
    if (!validRoles.includes(newRole)) {
      throw new Error("Invalid role");
    }
    const { error } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", userId);
    if (error) throw error;
  }

  const value = {
    session,
    user,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    updateRole,
    isStaff: profile?.role === "coach" || profile?.role === "admin",
    isAdmin: profile?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
