// Supabase Edge Function: Send Invite Email
// Creates an invitation record and sends an email via Resend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") || "https://dw-scioly-hub.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ─── AUTH: Must be admin ────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
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
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (existingUser) {
      return new Response(JSON.stringify({ error: "This email is already registered" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing pending invite
    const { data: existingInvite } = await supabase
      .from("invitations")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return new Response(JSON.stringify({ error: "A pending invitation already exists for this email" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CREATE INVITATION ─────────────────────────────
    const { data: invitation, error: insertErr } = await supabase
      .from("invitations")
      .insert({
        email: email.toLowerCase().trim(),
        full_name: fullName.trim(),
        role,
        event_ids: eventIds,
        invited_by: user.id,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // ─── SEND EMAIL (via Resend if configured) ─────────
    const signInUrl = `${APP_URL}/app.html`;
    const roleLabel = role === "coach" ? "Event Coach" : "Student";
    const eventCount = eventIds.length;

    let emailSent = false;

    if (RESEND_API_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "DW SciOly Hub <noreply@scioly.danielwright.org>",
          to: email,
          subject: `You're invited to DW SciOly Hub as ${roleLabel === "Event Coach" ? "an" : "a"} ${roleLabel}`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto;">
              <div style="background: #1B3A2D; padding: 28px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: white; font-size: 24px; margin: 0;">
                  DW Sci<span style="color: #C0652A;">Oly</span> Hub
                </h1>
                <p style="color: rgba(255,255,255,0.5); font-size: 13px; margin-top: 4px;">
                  Daniel Wright Science Olympiad
                </p>
              </div>
              <div style="padding: 28px; background: #f7f8f6; border-radius: 0 0 16px 16px;">
                <p style="font-size: 16px; color: #1B3A2D;">Hi ${fullName.split(" ")[0]},</p>
                <p style="font-size: 14px; color: #5E6658; line-height: 1.7;">
                  You've been invited to join the <strong>DW Science Olympiad</strong> team platform
                  as ${roleLabel === "Event Coach" ? "an" : "a"} <strong>${roleLabel}</strong>.
                  ${eventCount > 0 ? `You've been pre-assigned to <strong>${eventCount} event${eventCount > 1 ? "s" : ""}</strong>.` : ""}
                </p>
                <a href="${signInUrl}" style="
                  display: inline-block; margin: 20px 0; padding: 14px 32px;
                  background: #C0652A; color: white; border-radius: 10px;
                  text-decoration: none; font-weight: 600; font-size: 15px;
                ">Sign In with Google</a>
                <p style="font-size: 13px; color: #8E9688; line-height: 1.6;">
                  Click the button above, then sign in with your Google account (<strong>${email}</strong>).
                  Your role and event assignments will be set up automatically.
                </p>
                <hr style="border: none; border-top: 1px solid #DDE1D9; margin: 20px 0;">
                <p style="font-size: 11px; color: #8E9688;">
                  This invitation expires in 30 days. If you didn't expect this email, you can ignore it.
                </p>
              </div>
            </div>
          `,
        }),
      });

      emailSent = emailRes.ok;
      if (!emailRes.ok) {
        console.error("Resend error:", await emailRes.text());
      }
    }

    return new Response(
      JSON.stringify({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          fullName: invitation.full_name,
          role: invitation.role,
          eventIds: invitation.event_ids,
          status: invitation.status,
        },
        emailSent,
        signInUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
