// Supabase Edge Function: Add Member Directly
// Creates auth user + profile in one step (coach/admin only)
// The member appears on the roster immediately.
// When they sign in with Google later, Supabase links to the existing account.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ─── AUTH: Verify the caller is admin or coach ────────
    // Create a client with the user's JWT to check who they are
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token provided" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use anon key client + user token to verify identity
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session. Please sign in again.", detail: authErr?.message }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Now use the service role client for admin operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify caller is admin or coach
    const { data: profile } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "coach"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Admin or coach access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── VALIDATE INPUT ────────────────────────────────
    const { fullName, email, role, eventIds = [] } = await req.json();

    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Full name is required (min 2 characters)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["student", "coach"].includes(role)) {
      return new Response(JSON.stringify({ error: "Role must be student or coach" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if email already has an active user
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existingUser) {
      return new Response(JSON.stringify({ error: "This email is already on the team" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CREATE AUTH USER ──────────────────────────────
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = fullName.trim();
    const initials = cleanName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    const tempPassword = crypto.randomUUID();

    let newUserId: string;

    const { data: authData, error: createErr } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: cleanName },
    });

    if (createErr) {
      if (createErr.message?.includes("already been registered")) {
        // User exists in auth but not in our users table — find them
        const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers();
        const existing = allUsers?.find((u: any) => u.email === cleanEmail);
        if (existing) {
          newUserId = existing.id;
        } else {
          throw createErr;
        }
      } else {
        throw createErr;
      }
    } else {
      newUserId = authData.user.id;
    }

    // ─── CREATE PROFILE ────────────────────────────────
    const { data: newProfile, error: profileErr } = await adminClient
      .from("users")
      .upsert({
        id: newUserId!,
        email: cleanEmail,
        full_name: cleanName,
        initials,
        role,
      }, { onConflict: "id" })
      .select()
      .single();

    if (profileErr) throw profileErr;

    // ─── ASSIGN EVENTS ─────────────────────────────────
    if (eventIds.length > 0) {
      await adminClient.from("user_events").insert(
        eventIds.map((eventId: number) => ({ user_id: newUserId!, event_id: eventId }))
      );
    }

    return new Response(
      JSON.stringify({ member: { ...newProfile, eventIds } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("add-member error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
