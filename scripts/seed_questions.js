#!/usr/bin/env node
/**
 * seed_questions.js
 *
 * Loads the UChicago 2026 question bank JSON into Supabase.
 *
 * Usage:
 *   node scripts/seed_questions.js
 *
 * Requirements:
 *   - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set in .env
 *   - Or pass --url and --key flags
 *   - Run migration 010_question_bank.sql first
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

// ─── Config ──────────────────────────────────────────────────
config({ path: ".env" });
config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.argv.find((a) => a.startsWith("--url="))?.split("=")[1];

// Service role key bypasses RLS — always prefer it for seeding
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.argv.find((a) => a.startsWith("--key="))?.split("=")[1];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  console.error("   Set them in .env or pass --url=... --key=...");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${SUPABASE_KEY}` } },
});

// ─── Load question bank JSON ──────────────────────────────────
const BANK_PATH = join(
  __dirname,
  "../../ucago_2026_question_bank.json"
);

let bank;
try {
  bank = JSON.parse(readFileSync(BANK_PATH, "utf8"));
  console.log(`✓ Loaded ${bank.meta.total_questions} questions from JSON`);
} catch {
  // Try relative path fallback
  try {
    const alt = join(__dirname, "../../../ucago_2026_question_bank.json");
    bank = JSON.parse(readFileSync(alt, "utf8"));
  } catch {
    console.error("❌  Could not find ucago_2026_question_bank.json");
    console.error("   Expected at: " + BANK_PATH);
    process.exit(1);
  }
}

// ─── Difficulty mapping ───────────────────────────────────────
function toDifficulty(level) {
  if (level === 1) return "easy";
  if (level === 3) return "hard";
  return "medium";
}

// ─── Main seeding function ────────────────────────────────────
async function seed() {
  console.log("\n🔍  Fetching event IDs from Supabase...");

  // Get all events so we can map names → IDs
  const { data: events, error: eventsErr } = await supabase
    .from("events")
    .select("id, name");

  if (eventsErr) {
    console.error("❌  Could not fetch events:", eventsErr.message);
    process.exit(1);
  }

  // Build a lookup: normalized event name → event ID
  const eventMap = {};
  for (const e of events) {
    eventMap[normalize(e.name)] = e.id;
  }

  console.log(`✓ Found ${events.length} events in DB:`);
  events.forEach((e) => console.log(`   [${e.id}] ${e.name}`));

  // ─── Group questions by event ────────────────────────────
  const byEvent = {};
  for (const q of bank.questions) {
    const key = normalize(q.event);
    if (!byEvent[key]) byEvent[key] = [];
    byEvent[key].push(q);
  }

  let totalInserted = 0;
  let totalSkipped = 0;

  // ─── Insert each event's questions ────────────────────────
  for (const [eventKey, questions] of Object.entries(byEvent)) {
    // Try to match event name (handle partial matches like "Anatomy" → "Anatomy & Physiology")
    let eventId = eventMap[eventKey];

    if (!eventId) {
      // Fuzzy match: find event whose name contains any word from the key
      const words = eventKey.split(/\s+/);
      const match = Object.entries(eventMap).find(([name]) =>
        words.some((w) => w.length > 3 && name.includes(w))
      );
      if (match) {
        eventId = match[1];
        console.log(`\n⚠️  Fuzzy match: "${eventKey}" → event ID ${eventId}`);
      } else {
        console.log(`\n⚠️  No matching event for "${eventKey}" — skipping ${questions.length} questions`);
        totalSkipped += questions.length;
        continue;
      }
    }

    console.log(`\n📚  Seeding ${questions.length} questions for "${eventKey}" (event_id=${eventId})...`);

    // Build rows for Supabase
    const rows = questions.map((q) => {
      // For multiple_choice: build options array + correct_index
      let options = null;
      let correctIndex = 0;
      const correctAnswerText = q.correct_answer || "";

      if (q.type === "multiple_choice" && q.choices && q.choices.length > 0) {
        options = q.choices.map((c) => {
          // Strip leading "A. ", "B. ", "A) ", "B) " etc
          return c.replace(/^[A-Da-d][.)]\s*/, "").trim();
        });

        // ── Primary: extract letter from "B - text (+2)" or "B. text" or just "B" ──
        // The UChicago format is: "LETTER - description (+points)"
        const letterMatch = correctAnswerText.match(/^([A-Da-d])\s*[-–.)'\s]/);
        if (letterMatch) {
          correctIndex = letterMatch[1].toUpperCase().charCodeAt(0) - 65; // A=0 B=1 C=2 D=3
          correctIndex = Math.max(0, Math.min(correctIndex, options.length - 1));
        } else {
          // ── Fallback: case-insensitive text match ──────────────────────────────
          const target = correctAnswerText.toLowerCase();
          const matchIdx = options.findIndex((opt) => {
            const o = opt.toLowerCase();
            return o === target || target.includes(o) || o.includes(target);
          });
          correctIndex = matchIdx >= 0 ? matchIdx : 0;
        }
      } else {
        // For non-MC: put correct answer first, pad rest as empty strings
        options = [correctAnswerText];
        correctIndex = 0;
      }

      // DB constraint requires exactly 4 options — pad or truncate
      while (options.length < 4) options.push("");
      if (options.length > 4) {
        // Keep correct answer in place, truncate to 4
        if (correctIndex >= 4) {
          const correct = options[correctIndex];
          options = options.slice(0, 4);
          options[3] = correct;
          correctIndex = 3;
        } else {
          options = options.slice(0, 4);
        }
      }

      return {
        event_id: eventId,
        topic: q.topic || "General",
        subtopic: q.subtopic || null,
        question: q.question,
        options: options,
        correct_index: correctIndex,
        correct_answer_text: correctAnswerText,
        difficulty: toDifficulty(q.difficulty),
        question_type: q.type || "short_answer",
        explanation: q.working || null,
        source_tournament: q.source || "UChicago 2026",
        points: q.points || 1,
        ai_generated: false,
      };
    });

    // Insert in batches of 50
    const BATCH_SIZE = 50;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from("quiz_questions")
        .insert(batch)
        .select("id");

      if (error) {
        console.error(`   ❌  Batch insert error: ${error.message}`);
        totalSkipped += batch.length;
      } else {
        inserted += data.length;
        totalInserted += data.length;
      }
    }

    console.log(`   ✓ Inserted ${inserted} / ${rows.length} questions`);
  }

  // ─── Log ingestion ────────────────────────────────────────
  await supabase.from("ingestion_log").upsert({
    source_name: bank.meta.tournament || "UChicago 2026",
    event_count: Object.keys(byEvent).length,
    question_count: totalInserted,
    notes: `Seeded via seed_questions.js. ${totalSkipped} skipped (no matching event).`,
  }, { onConflict: "source_name" });

  // ─── Summary ──────────────────────────────────────────────
  console.log("\n════════════════════════════════════");
  console.log(`✅  Seeding complete!`);
  console.log(`   Inserted: ${totalInserted} questions`);
  console.log(`   Skipped:  ${totalSkipped} questions`);
  console.log("════════════════════════════════════\n");
}

// ─── Helpers ─────────────────────────────────────────────────
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

seed().catch((e) => {
  console.error("❌  Unexpected error:", e);
  process.exit(1);
});
