/**
 * MockTestPage — Timed Competition Simulation
 *
 * Simulates a Science Olympiad test session:
 *   - 30 questions from the event's question bank
 *   - 30-minute countdown timer (configurable)
 *   - Student can navigate freely between questions
 *   - Auto-submits when timer expires
 *   - Detailed score report at the end
 *   - Results saved to quiz_attempts + topic_mastery + SM-2 schedule
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Send, XCircle } from "lucide-react";
import { C } from "../ui";
import { IS_PRODUCTION } from "../lib/featureFlags";
import { supabase } from "../lib/supabase";
import { updateMasteryFromAttempt } from "../lib/mastery";
import { updateSM2Schedule } from "../lib/sm2";
import { useAppContext } from "../lib/AppContext";
import { useCurrentEvent } from "../hooks/useCurrentEvent";

const MOCK_TEST_DURATION = 30 * 60; // 30 minutes in seconds
const MOCK_TEST_COUNT = 30;
const QUIZ_TYPES = ["multiple_choice", "true_false"];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Question loader ───────────────────────────────────────────
async function loadMockTestQuestions(eventId) {
  if (!IS_PRODUCTION) return null; // prototype uses mock bank

  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("event_id", eventId)
    .in("question_type", QUIZ_TYPES)
    .order("id");

  if (error || !data || data.length === 0) return null;

  // Shuffle and cap at MOCK_TEST_COUNT
  return [...data]
    .sort(() => Math.random() - 0.5)
    .slice(0, MOCK_TEST_COUNT)
    .map((q) => {
      const opts = typeof q.options === "string" ? JSON.parse(q.options) : q.options || [];
      return {
        id: q.id,
        q: q.question,
        options: opts,
        correct: q.correct_index ?? 0,
        correctText: q.correct_answer_text || opts[q.correct_index] || "",
        topic: q.topic || "General",
        subtopic: q.subtopic || null,
        questionType: q.question_type || "multiple_choice",
        explanation: q.explanation || null,
        points: q.points || 1,
      };
    });
}

// ── Result saving ─────────────────────────────────────────────
async function saveMockTestResults(userId, eventId, questions, answers) {
  if (!IS_PRODUCTION || !userId || !eventId) return;

  // Count correct answers (computed inside saveResults below)
  let correctCount = 0;
  questions.forEach((q, i) => {
    if (answers[i] !== null && answers[i] === q.correct) correctCount++;
  });

  const answerPayload = questions.map((q, i) => ({
    questionId: q.id,
    topic: q.topic,
    selectedIndex: answers[i],
    correct: answers[i] !== null && answers[i] === q.correct,
  }));

  const { error: attemptErr } = await supabase.from("quiz_attempts").insert({
    user_id: userId,
    event_id: eventId,
    score: correctCount,
    total: questions.length,
    answers: answerPayload,
    completed_at: new Date().toISOString(),
    // Mark as mock test via a metadata field if available
  });
  if (attemptErr) console.error("[MockTest] Failed to save attempt:", attemptErr);

  const masteryAnswers = questions.map((q, i) => ({
    topic: q.topic || "General",
    correct: answers[i] !== null && answers[i] === q.correct,
  }));
  try {
    await updateMasteryFromAttempt(userId, eventId, masteryAnswers);
  } catch (e) {
    console.error("[MockTest] Failed to update mastery:", e);
  }

  const sm2Answers = questions.map((q, i) => ({
    questionId: q.id,
    isCorrect: answers[i] !== null && answers[i] === q.correct,
  }));
  try {
    await updateSM2Schedule(userId, sm2Answers);
  } catch (e) {
    console.warn("[MockTest] SM-2 update failed:", e);
  }
}

// ── Main component ────────────────────────────────────────────
export default function MockTestPage() {
  const navigate = useNavigate();
  const { currentUser: user } = useAppContext();
  const { event } = useCurrentEvent();

  const [phase, setPhase] = useState("loading"); // loading | briefing | testing | finished
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]); // null = unanswered, index = selected
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MOCK_TEST_DURATION);
  const timerRef = useRef(null);

  // ── Load questions ────────────────────────────────────────────
  useEffect(() => {
    if (!event?.id) return;

    loadMockTestQuestions(event.id).then((qs) => {
      if (qs && qs.length > 0) {
        setQuestions(qs);
        setAnswers(new Array(qs.length).fill(null));
        setPhase("briefing");
      } else {
        // Prototype / no questions
        setPhase("briefing");
      }
    });
  }, [event?.id]);

  // ── Timer ─────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    (qs, ans) => {
      clearInterval(timerRef.current);
      saveMockTestResults(user?.id, event?.id, qs || questions, ans || answers);
      setPhase("finished");
    },
    [user?.id, event?.id, questions, answers]
  );

  useEffect(() => {
    if (phase !== "testing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit(questions, answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, handleSubmit, questions, answers]);

  // ── Phase: loading ────────────────────────────────────────────
  if (phase === "loading" || !event) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏱️</div>
        <p style={{ color: C.gray600 }}>Preparing your mock test…</p>
      </div>
    );
  }

  // ── Phase: briefing ───────────────────────────────────────────
  if (phase === "briefing") {
    const qCount = questions.length || MOCK_TEST_COUNT;
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px" }}>
        <button onClick={() => navigate(`/events/${event.id}`)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent",
            border: "none", color: C.gray600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            marginBottom: 24, padding: 0 }}>
          <ArrowLeft size={15} /> Back to Event
        </button>

        <div style={{ background: C.white, borderRadius: 20, padding: 40,
          border: `1px solid ${C.gray200}`, textAlign: "center",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🏆</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: C.navy, marginBottom: 6 }}>
            Mock Test — {event.icon} {event.name}
          </h2>
          <p style={{ color: C.gray600, fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
            Simulate competition conditions with a timed test.
            You can navigate between questions freely and change your answers before submitting.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 36 }}>
            {[
              { icon: "❓", label: "Questions", value: `${qCount}` },
              { icon: "⏱️", label: "Time Limit", value: "30 min" },
              { icon: "📋", label: "Format", value: "MC + T/F" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.gray400 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: C.offWhite, borderRadius: 12, padding: "14px 20px",
            marginBottom: 28, fontSize: 13, color: C.gray600, textAlign: "left", lineHeight: 1.7 }}>
            <strong style={{ color: C.navy }}>Tips:</strong>
            <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
              <li>Flag questions you're unsure about and return to them.</li>
              <li>Don't leave anything blank — your best guess counts.</li>
              <li>Results will update your mastery and spaced repetition schedule.</li>
            </ul>
          </div>

          {questions.length === 0 && (
            <div style={{ background: "#FEF3C7", borderRadius: 10, padding: "10px 16px",
              fontSize: 13, color: "#92400E", marginBottom: 20 }}>
              ⚠️ No questions loaded. Try in production mode with a seeded question bank.
            </div>
          )}

          <button
            onClick={() => { setPhase("testing"); }}
            disabled={questions.length === 0}
            style={{ padding: "14px 36px", borderRadius: 12, border: "none",
              background: questions.length > 0 ? C.coral : C.gray200,
              color: questions.length > 0 ? C.white : C.gray400,
              fontSize: 16, fontWeight: 800, cursor: questions.length > 0 ? "pointer" : "default",
              fontFamily: "inherit", transition: "transform 0.15s" }}
            onMouseEnter={e => questions.length > 0 && (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "none")}
          >
            Start Mock Test →
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: finished ───────────────────────────────────────────
  if (phase === "finished") {
    const correctCount = questions.filter((q, i) => answers[i] !== null && answers[i] === q.correct).length;
    const answeredCount = answers.filter((a) => a !== null).length;
    const pct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    const topicResults = {};
    questions.forEach((q, i) => {
      if (!topicResults[q.topic]) topicResults[q.topic] = { correct: 0, total: 0 };
      topicResults[q.topic].total++;
      if (answers[i] !== null && answers[i] === q.correct) topicResults[q.topic].correct++;
    });

    const sorted = Object.entries(topicResults)
      .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);

    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ background: C.white, borderRadius: 20, padding: 36,
          border: `1px solid ${C.gray200}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>{pct >= 80 ? "🏆" : pct >= 60 ? "👍" : "📚"}</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: C.navy, marginBottom: 6 }}>
              Mock Test Complete!
            </h2>
            <p style={{ color: C.gray600, fontSize: 14 }}>{event.icon} {event.name}</p>

            <div style={{ display: "flex", justifyContent: "center", gap: 36, marginTop: 24 }}>
              <div>
                <div style={{ fontSize: 42, fontWeight: 800, color: pct >= 80 ? C.teal : pct >= 60 ? C.gold : C.coral }}>
                  {pct}%
                </div>
                <div style={{ fontSize: 12, color: C.gray400 }}>Score</div>
              </div>
              <div>
                <div style={{ fontSize: 42, fontWeight: 800, color: C.navy }}>
                  {correctCount}/{questions.length}
                </div>
                <div style={{ fontSize: 12, color: C.gray400 }}>Correct</div>
              </div>
              <div>
                <div style={{ fontSize: 42, fontWeight: 800, color: C.navy }}>
                  {answeredCount}
                </div>
                <div style={{ fontSize: 12, color: C.gray400 }}>Answered</div>
              </div>
            </div>
          </div>

          {/* Topic breakdown */}
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Topic Breakdown</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 28 }}>
            {sorted.map(([topic, data]) => {
              const tPct = Math.round((data.correct / data.total) * 100);
              return (
                <div key={topic} style={{ padding: "10px 14px",
                  background: tPct >= 80 ? "#E2F0E6" : tPct >= 60 ? "#FEF9E7" : "#FEF2F2",
                  borderRadius: 10, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{topic}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ height: 4, flex: 1, background: "#E5E7EB", borderRadius: 100, marginRight: 10, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${tPct}%`,
                        background: tPct >= 80 ? C.teal : tPct >= 60 ? C.gold : C.coral,
                        borderRadius: 100 }} />
                    </div>
                    <span style={{ fontWeight: 700, color: tPct >= 80 ? C.tealDark : tPct >= 60 ? "#92400E" : C.coral }}>
                      {data.correct}/{data.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Per-question review */}
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Answer Review</h3>
          <div style={{ maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
            {questions.map((q, i) => {
              const isCorrect = answers[i] !== null && answers[i] === q.correct;
              const skipped = answers[i] === null;
              return (
                <div key={q.id} style={{
                  padding: "12px 16px", borderRadius: 10, marginBottom: 6,
                  background: skipped ? "#F9FAFB" : isCorrect ? "#F0FDF9" : "#FEF2F2",
                  border: `1px solid ${skipped ? C.gray200 : isCorrect ? "#BBF7D0" : "#FECACA"}`,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.gray400, minWidth: 22 }}>
                      {i + 1}.
                    </span>
                    {skipped
                      ? <span style={{ fontSize: 13, color: C.gray400 }}>⏭ Skipped</span>
                      : isCorrect
                        ? <CheckCircle size={15} color="#1E6B42" style={{ flexShrink: 0, marginTop: 1 }} />
                        : <XCircle size={15} color={C.coral} style={{ flexShrink: 0, marginTop: 1 }} />}
                    <div style={{ fontSize: 13, flex: 1 }}>
                      <span style={{ fontWeight: 500 }}>{q.q}</span>
                      {!isCorrect && !skipped && (
                        <div style={{ marginTop: 4, fontSize: 12, color: C.gray600 }}>
                          <span style={{ color: C.coral }}>
                            Your answer: {q.options?.[answers[i]] || "—"}
                          </span>
                          {" · "}
                          <span style={{ color: "#1E6B42" }}>
                            Correct: {q.correctText || q.options?.[q.correct] || "—"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, marginTop: 28, justifyContent: "center" }}>
            <button onClick={() => navigate(`/events/${event.id}/quiz`)}
              style={{ padding: "12px 22px", borderRadius: 10, border: `2px solid ${C.teal}`,
                background: "transparent", color: C.teal, fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit" }}>
              Adaptive Quiz
            </button>
            <button onClick={() => navigate(`/events/${event.id}`)}
              style={{ padding: "12px 22px", borderRadius: 10, border: "none",
                background: C.navy, color: C.white, fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit" }}>
              Back to Event
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: testing ────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <p style={{ color: C.gray600 }}>No questions available for this event yet.</p>
      </div>
    );
  }

  const q = questions[currentQ];
  const answered = answers[currentQ] !== null;
  const timerColor = timeLeft < 120 ? C.coral : timeLeft < 300 ? C.gold : C.teal;
  const answeredCount = answers.filter((a) => a !== null).length;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 20px" }}>
      {/* Header: timer + progress */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, padding: "12px 18px", background: C.white, borderRadius: 14,
        border: `1px solid ${C.gray200}`, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div>
          <div style={{ fontSize: 12, color: C.gray400, fontWeight: 500 }}>
            {event.icon} {event.name}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginTop: 2 }}>
            Q{currentQ + 1} of {questions.length} · {answeredCount} answered
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6,
          fontSize: 20, fontWeight: 800, color: timerColor }}>
          <Clock size={16} color={timerColor} />
          {formatTime(timeLeft)}
        </div>

        <button
          onClick={() => handleSubmit(questions, answers)}
          style={{ display: "flex", alignItems: "center", gap: 6,
            padding: "9px 16px", borderRadius: 10, border: "none",
            background: C.coral, color: C.white, fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit" }}>
          <Send size={13} /> Submit Test
        </button>
      </div>

      {/* Question grid navigator */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
        {questions.map((_, i) => (
          <button key={i} onClick={() => setCurrentQ(i)}
            style={{
              width: 32, height: 32, borderRadius: 8, border: "none",
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              background: i === currentQ ? C.navy : answers[i] !== null ? C.teal : C.gray100,
              color: i === currentQ || answers[i] !== null ? C.white : C.gray600,
              outline: i === currentQ ? `2px solid ${C.gold}` : "none",
              outlineOffset: 1,
            }}>
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question card */}
      <div style={{ background: C.white, borderRadius: 16, padding: 28,
        border: `1px solid ${C.gray200}`, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ fontSize: 11, color: C.gray400, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: 1, marginBottom: 12 }}>
          {q.topic}{q.subtopic ? ` · ${q.subtopic}` : ""}
          {" · "}
          {q.questionType === "true_false" ? "True / False" : "Multiple Choice"}
        </div>

        <p style={{ fontSize: 16, fontWeight: 600, color: C.navy, lineHeight: 1.6, marginBottom: 22 }}>
          {q.q}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {q.options.map((opt, idx) => {
            const isSelected = answers[currentQ] === idx;
            return (
              <button key={idx}
                onClick={() => {
                  const next = [...answers];
                  next[currentQ] = idx;
                  setAnswers(next);
                }}
                style={{
                  padding: "13px 18px", borderRadius: 12, textAlign: "left",
                  border: `2px solid ${isSelected ? C.teal : C.gray200}`,
                  background: isSelected ? `${C.teal}15` : C.white,
                  color: isSelected ? C.tealDark : C.gray700,
                  fontSize: 14, fontWeight: isSelected ? 600 : 400,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.1s",
                }}>
                <span style={{ fontWeight: 700, color: isSelected ? C.teal : C.gray400, marginRight: 10 }}>
                  {String.fromCharCode(65 + idx)}.
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
          <button onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
            disabled={currentQ === 0}
            style={{ display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 10, border: `1px solid ${C.gray200}`,
              background: currentQ === 0 ? C.gray100 : C.white,
              color: currentQ === 0 ? C.gray400 : C.navy,
              fontSize: 13, fontWeight: 600, cursor: currentQ === 0 ? "default" : "pointer",
              fontFamily: "inherit" }}>
            <ArrowLeft size={14} /> Prev
          </button>

          {!answered && (
            <span style={{ fontSize: 12, color: C.gray400, alignSelf: "center", fontStyle: "italic" }}>
              Select an answer to move on
            </span>
          )}

          <button onClick={() => {
            if (currentQ + 1 < questions.length) {
              setCurrentQ((p) => p + 1);
            } else {
              handleSubmit(questions, answers);
            }
          }}
            style={{ display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 10, border: "none",
              background: C.navy, color: C.white,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit" }}>
            {currentQ + 1 < questions.length ? (
              <>Next <ArrowRight size={14} /></>
            ) : (
              <>Submit <Send size={13} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
