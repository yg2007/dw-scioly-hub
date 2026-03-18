// Supabase Edge Function: Generate AI Quiz Questions
// Uses Claude API (Haiku) to generate Science Olympiad quiz questions

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

function sanitizeTopic(topic: string | undefined): string {
  if (!topic) return "";
  // Keep only alphanumeric, spaces, ampersands, and hyphens
  let sanitized = topic.replace(/[^a-zA-Z0-9\s&\-]/g, "").trim();
  // Cap at 100 characters
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100).trim();
  }
  return sanitized;
}

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
        message: "AI could not generate valid questions. Try again.",
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
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
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
  limit: number = 30
): Promise<{ allowed: boolean; remaining: number }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("quiz_questions")
    .select("id")
    .eq("ai_generated", true)
    .filter("created_at", "gte", oneHourAgo);

  // For now, count by user association via event ownership or a simple count
  // In a real implementation, you'd have user_id in quiz_questions table
  // As a simple approach, we'll count total recent AI-generated questions
  const count = data?.length || 0;

  if (count >= limit) {
    const error = new Error("rate_limit");
    throw error;
  }

  return { allowed: true, remaining: limit - count };
}

// ─── MAIN HANDLER ──────────────────────────────────────────────

serve(async (req: Request) => {
  // Handle CORS preflight
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
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── INPUT VALIDATION ─────────────────────────────────
    const { eventId, topic, difficulty = "medium", count = 5 } = await req.json();
    if (!eventId || typeof eventId !== "number") {
      return new Response(JSON.stringify({ error: "Invalid eventId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (count < 1 || count > 20) {
      return new Response(JSON.stringify({ error: "Count must be 1-20" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const validDifficulties = ["easy", "medium", "hard"];
    const safeDifficulty = validDifficulties.includes(difficulty) ? difficulty : "medium";

    // Sanitize topic input
    const sanitizedTopic = sanitizeTopic(topic);

    // ─── RATE LIMITING CHECK ──────────────────────────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const rateLimitCheck = await checkRateLimit(supabase, user.id, 30);

    // Fetch event info for context
    const { data: event } = await supabase
      .from("events")
      .select("name, type, event_topics(name)")
      .eq("id", eventId)
      .single();

    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const topicList = event.event_topics.map((t: any) => t.name).join(", ");
    const focusTopic = sanitizedTopic ? `Focus specifically on: ${sanitizedTopic}.` : "";
    const difficultyDesc =
      safeDifficulty === "easy"
        ? "basic recall and simple concepts suitable for beginners"
        : safeDifficulty === "hard"
        ? "challenging application and analysis questions for advanced students"
        : "moderate difficulty requiring understanding and some application";

    const prompt = `Generate ${count} multiple-choice quiz questions for a Science Olympiad Division B (middle school) event called "${event.name}".

Event type: ${event.type}
Topics covered: ${topicList}
${focusTopic}

Difficulty level: ${difficultyDesc}

Return a JSON array of objects with this exact structure:
[
  {
    "q": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "topic": "Topic Name",
    "difficulty": ${safeDifficulty === "easy" ? 1 : safeDifficulty === "hard" ? 3 : 2},
    "explanation": "Brief explanation of why the correct answer is correct."
  }
]

Requirements:
- Questions must be factually accurate and appropriate for Division B (grades 6-9)
- Each question must have exactly 4 options
- "correct" is the 0-based index of the correct option
- "topic" must be one of the event's actual topics
- Explanations should be educational and concise (1-2 sentences)
- Vary the position of correct answers (don't always put correct answer first)
- No trick questions — test real scientific knowledge

Return ONLY the JSON array, no other text.`;

    // Call Claude API with timeout and retry logic
    const text = await callClaudeWithRetry(prompt, 1);

    // Parse JSON from response (handle potential markdown code blocks)
    let questions;
    try {
      const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      questions = JSON.parse(jsonStr);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    // Cache questions in the database
    for (const q of questions) {
      await supabase.from("quiz_questions").insert({
        event_id: eventId,
        topic: q.topic,
        question: q.q,
        options: q.options,
        correct_index: q.correct,
        explanation: q.explanation,
        difficulty: q.difficulty === 1 ? "easy" : q.difficulty === 3 ? "hard" : "medium",
        ai_generated: true,
      });
    }

    return new Response(JSON.stringify({ questions }), {
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
