// Supabase Edge Function: Analyze Uploaded Test Scans
// Uses Claude Sonnet (multimodal) to read and analyze practice test photos

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── HELPER FUNCTIONS ──────────────────────────────────────────

function categorizeError(error: unknown): { error: string; message: string; status: number } {
  if (error instanceof Error) {
    if (error.message.includes("AbortError") || error.message.includes("timeout")) {
      return {
        error: "timeout",
        message: "AI service took too long. Try again.",
        status: 504,
      };
    }
    if (error.message.includes("rate_limit")) {
      return {
        error: "rate_limit",
        message: "Too many requests. Try again in a few minutes.",
        status: 429,
      };
    }
    if (error.message.includes("Failed to parse")) {
      return {
        error: "ai_error",
        message: "AI could not generate valid analysis. Try again.",
        status: 500,
      };
    }
  }
  return {
    error: "server_error",
    message: "Something went wrong.",
    status: 500,
  };
}

async function callClaudeWithRetry(
  prompt: string,
  imageData: { base64: string; mediaType: string },
  maxRetries: number = 1
): Promise<string> {
  const TIMEOUT_MS = 30000; // 30 seconds
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: imageData.mediaType, data: imageData.base64 },
                },
                {
                  type: "text",
                  text: prompt,
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        const error = new Error(`Claude API error: ${response.status} ${errText}`);
        lastError = error;
        // Retry on 5xx errors
        if (response.status >= 500 && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s delay
          continue;
        }
        throw error;
      }

      const result = await response.json();
      return result.content[0].text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Check if it's a network error and we have retries left
      if (attempt < maxRetries && !(error instanceof Error && error.message.includes("AbortError"))) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s delay
        continue;
      }
      // If abort error, don't retry
      if (error instanceof Error && error.message.includes("AbortError")) {
        throw new Error("AbortError: Claude API timeout");
      }
      throw error;
    }
  }

  throw lastError || new Error("Claude API call failed after retries");
}

async function checkRateLimit(
  supabase: any,
  userId: string,
  limit: number = 10
): Promise<{ allowed: boolean; remaining: number }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("test_uploads")
    .select("id")
    .filter("created_at", "gte", oneHourAgo);

  // Count recent uploads for this user
  const count = data?.length || 0;

  if (count >= limit) {
    const error = new Error("rate_limit");
    throw error;
  }

  return { allowed: true, remaining: limit - count };
}

// ─── MAIN HANDLER ──────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ─── AUTH CHECK ───────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── INPUT VALIDATION ─────────────────────────────────
    const { uploadId, storagePath, eventId } = await req.json();
    if (!uploadId || !storagePath || !eventId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── OWNERSHIP CHECK ──────────────────────────────────
    const { data: upload } = await supabase
      .from("test_uploads")
      .select("user_id")
      .eq("id", uploadId)
      .single();
    if (!upload || upload.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── RATE LIMITING CHECK ──────────────────────────────
    const rateLimitCheck = await checkRateLimit(supabase, user.id, 10);

    // Get the uploaded file from storage
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("test-scans")
      .download(storagePath);

    if (downloadErr || !fileData) {
      throw new Error("Failed to download test scan");
    }

    // ─── FILE SIZE / TYPE VALIDATION ──────────────────────
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (fileData.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "File too large (max 20MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = storagePath.split(".").pop()?.toLowerCase();
    const allowedExts = ["png", "jpg", "jpeg", "webp", "pdf"];
    if (!ext || !allowedExts.includes(ext)) {
      return new Response(JSON.stringify({ error: "Invalid file type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Determine media type
    const mediaType =
      ext === "png" ? "image/png" :
      ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
      ext === "webp" ? "image/webp" :
      ext === "pdf" ? "application/pdf" :
      "image/jpeg";

    // Fetch event info for context
    const { data: event } = await supabase
      .from("events")
      .select("name, type, event_topics(name)")
      .eq("id", eventId)
      .single();

    const topicList = event?.event_topics?.map((t: any) => t.name).join(", ") || "";

    const prompt = `This is a scanned practice test for a Science Olympiad Division B event called "${event?.name || "Unknown"}".
Topics for this event: ${topicList}

Please analyze this test and provide:

1. Score: How many questions appear to be answered correctly vs total (estimate if handwriting is unclear)
2. Topic breakdown: Which topics were tested and how the student performed on each
3. Strengths: Topics/areas where the student did well
4. Weaknesses: Topics/areas that need more study
5. Study recommendations: Specific concepts to review, ranked by priority

Return your analysis as JSON with this structure:
{
  "scoreEarned": <number>,
  "scoreTotal": <number>,
  "topicBreakdown": [
    {"topic": "Topic Name", "correct": <n>, "total": <n>, "notes": "brief note"}
  ],
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": [
    {"topic": "Topic", "priority": "high|medium|low", "suggestion": "What to study"}
  ],
  "overallNotes": "Brief overall assessment"
}

Return ONLY the JSON, no other text. If you cannot read the image clearly, provide your best estimates and note any uncertainty in overallNotes.`;

    // Call Claude API with timeout and retry logic
    const text = await callClaudeWithRetry(prompt, { base64, mediaType }, 1);

    // Parse JSON
    let analysis;
    try {
      const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    // Update the test_uploads record with the analysis
    await supabase
      .from("test_uploads")
      .update({
        ai_analysis: analysis,
        score_earned: analysis.scoreEarned,
        score_total: analysis.scoreTotal,
      })
      .eq("id", uploadId);

    // Update topic mastery based on analysis
    if (analysis.topicBreakdown?.length) {
      const { data: authUser } = await supabase
        .from("test_uploads")
        .select("user_id")
        .eq("id", uploadId)
        .single();

      if (authUser) {
        for (const tb of analysis.topicBreakdown) {
          if (tb.total > 0) {
            const score = (tb.correct / tb.total) * 100;
            await supabase.from("topic_mastery").upsert(
              {
                user_id: authUser.user_id,
                event_id: eventId,
                topic: tb.topic,
                score: Math.round(score * 100) / 100,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,event_id,topic" }
            );
          }
        }
      }
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const categorized = categorizeError(error);
    return new Response(JSON.stringify({ error: categorized.error, message: categorized.message }), {
      status: categorized.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
