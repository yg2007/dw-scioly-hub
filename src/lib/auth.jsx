import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { clearCache } from "./query";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);       // auth.users record
  const [profile, setProfile] = useState(null);  // public.users record
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout: never stay loading for more than 10 seconds
    const timeout = setTimeout(() => {
      setLoading(false);
      console.warn("Auth loading timed out after 10s");
    }, 10000);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setLoading(false); clearTimeout(timeout); }
    }).catch(() => {
      setLoading(false);
      clearTimeout(timeout);
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
        clearTimeout(timeout);
      }
    );

    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      // Profile might not exist yet if trigger hasn't fired — retry up to 3 times
      let retries = 3;
      const retry = async () => {
        const { data: retryData } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();
        if (retryData) {
          setProfile(retryData);
          setLoading(false);
        } else if (--retries > 0) {
          setTimeout(retry, 1500);
        } else {
          console.error("Profile not found after retries");
          setProfile(null);
          setLoading(false);
        }
      };
      setTimeout(retry, 1000);
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
    clearCache(); // Wipe stale query data so next login starts fresh
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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
