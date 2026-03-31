import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Flag, XCircle } from 'lucide-react';
import Breadcrumbs from './shared/Breadcrumbs';
import { C } from '../ui';
import { IS_PRODUCTION } from '../lib/featureFlags';
import { supabase } from '../lib/supabase';
import { updateMasteryFromAttempt } from '../lib/mastery';
import { updateSM2Schedule } from '../lib/sm2';
import { useAppContext } from '../lib/AppContext';
import { useCurrentEvent } from '../hooks/useCurrentEvent';
import { useUnifiedQuizQuestions } from '../hooks/useUnifiedData';
import { useReportQuestion } from '../hooks/useQuestionBank';

// ── Question type constants ───────────────────────────────────
const TYPE_MC      = 'multiple_choice';
const TYPE_SA      = 'short_answer';
const TYPE_MATCH   = 'matching';
const TYPE_CALC    = 'calculation';
const TYPE_TF      = 'true_false';

// ── Report button — inline flag with reason picker ────────────
const REPORT_REASONS = [
  { value: "wrong_answer",     label: "Wrong answer" },
  { value: "unclear_question", label: "Unclear wording" },
  { value: "duplicate",        label: "Duplicate question" },
  { value: "other",            label: "Other issue" },
];

function ReportButton({ questionId, eventId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { report, loading } = useReportQuestion();
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (submitted) {
    return (
      <span style={{ fontSize: 11, color: C.teal, fontWeight: 600 }}>✓ Reported</span>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Report an issue with this question"
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
          borderRadius: 6, border: `1px solid ${C.gray200}`, background: "transparent",
          color: C.gray400, fontSize: 11, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit", transition: "all 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.color = C.coral; e.currentTarget.style.borderColor = C.coral; }}
        onMouseLeave={e => { e.currentTarget.style.color = C.gray400; e.currentTarget.style.borderColor = C.gray200; }}
      >
        <Flag size={11} /> Report
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
          background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12,
          padding: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", minWidth: 200 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
            What's wrong with this question?
          </p>
          {REPORT_REASONS.map(r => (
            <label key={r.value} style={{ display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, color: C.gray600, marginBottom: 6, cursor: "pointer" }}>
              <input type="radio" name="report-reason" value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                style={{ accentColor: C.coral }} />
              {r.label}
            </label>
          ))}
          <button
            disabled={!reason || loading}
            onClick={async () => {
              await report({ questionId, eventId, reason });
              setSubmitted(true);
              setOpen(false);
            }}
            style={{ marginTop: 10, width: "100%", padding: "8px",
              borderRadius: 8, border: "none",
              background: reason ? C.coral : C.gray200,
              color: reason ? C.white : C.gray400,
              fontSize: 12, fontWeight: 700, cursor: reason ? "pointer" : "default",
              fontFamily: "inherit" }}
          >
            {loading ? "Sending…" : "Send to Coach"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function QuizPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser: user } = useAppContext();
  const { event } = useCurrentEvent();

  // ── Optional topic filter from "Today's Focus" card ──────────
  const topicFilter = searchParams.get("topic") || null;

  // ── Adaptive quiz questions — passes userId for mastery weighting ──
  const { questions, loading } = useUnifiedQuizQuestions(event?.id, user?.id, 10, topicFilter);

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState([]);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);

  // ── Free-text answer state (short answer / calculation) ──────
  const [textInput, setTextInput] = useState('');

  const handleAnswer = useCallback((idx) => {
    if (answered) return;
    const q = questions[currentQ];
    let isCorrect = false;

    if (q?.questionType === TYPE_MC || q?.questionType === TYPE_TF) {
      isCorrect = idx === q.correct;
    } else if (q?.questionType === TYPE_SA || q?.questionType === TYPE_CALC || q?.questionType === TYPE_MATCH) {
      // For text-based types, mark as self-assessed (student reveals answer)
      isCorrect = idx === 1; // 1 = "Got it", 0 = "Missed it"
    }

    setSelected(idx);
    setAnswered(true);
    setResults(prev => [...prev, {
      question: currentQ,
      selected: idx,
      correct: q?.correct,
      correctText: q?.correctText,
      topic: q?.topic,
      subtopic: q?.subtopic,
      isCorrect,
      questionType: q?.questionType,
    }]);
  }, [answered, currentQ, questions]);

  useEffect(() => {
    if (answered || finished) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleAnswer(-1); return 45; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQ, answered, finished, handleAnswer]);

  const saveResults = async (finalResults) => {
    if (!IS_PRODUCTION || !user?.id || !event?.id) return;

    const correct = finalResults.filter(r => r.isCorrect).length;

    // 1 — Save attempt record
    const { error: attemptErr } = await supabase.from("quiz_attempts").insert({
      user_id: user.id,
      event_id: event.id,
      score: correct,
      total: finalResults.length,
      answers: finalResults.map(r => ({
        questionId: questions[r.question]?.id,
        topic: r.topic,
        selectedIndex: r.selected,
        correct: r.isCorrect,
      })),
      completed_at: new Date().toISOString(),
    });
    if (attemptErr) console.error("Failed to save quiz attempt:", attemptErr);

    // 2 — Update topic mastery so the adaptive engine has signal
    const masteryAnswers = finalResults.map(r => ({
      topic: r.topic || "General",
      correct: r.isCorrect,
    }));
    try {
      await updateMasteryFromAttempt(user.id, event.id, masteryAnswers);
    } catch (masteryErr) {
      console.error("Failed to update mastery:", masteryErr);
    }

    // 3 — Update SM-2 spaced repetition schedule for each question
    const sm2Answers = finalResults.map(r => ({
      questionId: questions[r.question]?.id,
      isCorrect: r.isCorrect,
    }));
    try {
      await updateSM2Schedule(user.id, sm2Answers);
    } catch (sm2Err) {
      console.warn("SM-2 schedule update failed (non-fatal):", sm2Err);
    }
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      // Save asynchronously — don't block showing results
      saveResults(results);
      setFinished(true);
    } else {
      setCurrentQ(prev => prev + 1);
      setSelected(null);
      setAnswered(false);
      setTextInput('');
      setTimeLeft(45);
    }
  };

  if (!event) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <p style={{ color: C.gray400, marginBottom: 16 }}>Please select an event first to start a quiz.</p>
        <button onClick={() => navigate("/events")} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: C.teal, color: C.white, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
          Browse Events
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
        <p style={{ color: C.gray600, fontSize: 16, fontWeight: 600 }}>Loading quiz questions…</p>
        <p style={{ color: C.gray400, fontSize: 13, marginTop: 8 }}>{event?.icon} {event?.name}</p>
      </div>
    );
  }

  if (!loading && questions.length === 0) {
    // No MC/TF questions available — likely a short-answer or build event
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
          No quiz questions available
        </h3>
        <p style={{ color: C.gray600, fontSize: 14, marginBottom: 6, maxWidth: 400, margin: "0 auto 12px" }}>
          {event?.icon} <strong>{event?.name}</strong> doesn't have multiple-choice questions
          {topicFilter ? ` for the topic "${topicFilter}"` : ""} in the question bank yet.
        </p>
        <p style={{ color: C.gray400, fontSize: 13, marginBottom: 24, maxWidth: 380, margin: "0 auto 24px" }}>
          {topicFilter
            ? "Try starting a quiz without a topic filter to see all available questions."
            : "This may be a lab or build event. Check back after the coach adds questions."}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {topicFilter && (
            <button onClick={() => navigate(`/events/${event?.id}/quiz`)}
              style={{ padding: "10px 20px", borderRadius: 8, border: "none",
                background: C.teal, color: C.white, cursor: "pointer",
                fontFamily: "inherit", fontWeight: 600, fontSize: 14 }}>
              Browse All {event?.name} Questions
            </button>
          )}
          <button onClick={() => navigate(`/events/${event?.id}`)}
            style={{ padding: "10px 20px", borderRadius: 8,
              border: `1px solid ${C.gray300}`, background: C.white,
              color: C.navy, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 14 }}>
            Back to Event
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    const correct = results.filter(r => r.isCorrect).length;
    const pct = Math.round((correct / questions.length) * 100);
    const topicResults = {};
    results.forEach((r, i) => {
      const topic = questions[i].topic;
      if (!topicResults[topic]) topicResults[topic] = { correct: 0, total: 0 };
      topicResults[topic].total++;
      if (r.isCorrect) topicResults[topic].correct++;
    });

    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ background: C.white, borderRadius: 20, padding: 36, border: `1px solid ${C.gray200}`, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{pct >= 80 ? "🏆" : pct >= 60 ? "👍" : "📚"}</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Quiz Complete!</h2>
          <p style={{ fontSize: 16, color: C.gray600, marginBottom: 24 }}>{event.icon} {event.name}</p>

          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 42, fontWeight: 800, color: pct >= 80 ? C.teal : pct >= 60 ? C.gold : C.coral }}>{pct}%</div>
              <div style={{ fontSize: 13, color: C.gray400 }}>Score</div>
            </div>
            <div>
              <div style={{ fontSize: 42, fontWeight: 800, color: C.navy }}>{correct}/{questions.length}</div>
              <div style={{ fontSize: 13, color: C.gray400 }}>Correct</div>
            </div>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, textAlign: "left" }}>Topic Breakdown</h3>
          {Object.entries(topicResults).map(([topic, data]) => (
            <div key={topic} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px",
              background: data.correct === data.total ? "#E2F0E6" : "#F5E2DC",
              borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{topic}</span>
              <span style={{ fontWeight: 700, color: data.correct === data.total ? C.tealDark : C.coral }}>
                {data.correct}/{data.total} {data.correct === data.total ? "✓" : "✗"}
              </span>
            </div>
          ))}

          <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 24, marginBottom: 14, textAlign: "left" }}>Review Answers</h3>
          {results.map((r, i) => {
            const qObj = questions[i];
            const isMC = !r.questionType || r.questionType === TYPE_MC || r.questionType === TYPE_TF;
            return (
              <div key={i} style={{ textAlign: "left", padding: "14px 16px", background: r.isCorrect ? "#F0FDF9" : "#FEF2F2",
                borderRadius: 10, marginBottom: 8, border: `1px solid ${r.isCorrect ? "#BBF7D0" : "#FECACA"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  {r.isCorrect ? <CheckCircle size={16} color="#1E6B42" /> : <XCircle size={16} color={C.coral} />}
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{qObj?.q}</span>
                </div>
                {!r.isCorrect && isMC && (
                  <div style={{ fontSize: 12, color: C.gray600, paddingLeft: 24 }}>
                    <span style={{ color: C.coral }}>
                      Your answer: {r.selected >= 0 ? (qObj?.options?.[r.selected] || "—") : "Time expired"}
                    </span>
                    <br />
                    <span style={{ color: "#1E6B42" }}>
                      Correct: {r.correctText || qObj?.options?.[r.correct] || "—"}
                    </span>
                    {qObj?.explanation && (
                      <>
                        <br />
                        <span style={{ fontStyle: "italic", color: C.gray400 }}>{qObj.explanation}</span>
                      </>
                    )}
                  </div>
                )}
                {!isMC && (
                  <div style={{ fontSize: 12, color: C.gray600, paddingLeft: 24 }}>
                    <span style={{ color: "#1E6B42" }}>Answer: {r.correctText || "—"}</span>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "center" }}>
            <button onClick={() => { setCurrentQ(0); setSelected(null); setAnswered(false); setResults([]); setFinished(false); setTimeLeft(45); }}
              style={{ padding: "12px 24px", borderRadius: 10, border: `2px solid ${C.teal}`, background: "transparent",
                color: C.teal, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Retake Quiz
            </button>
            <button onClick={() => navigate(`/events/${event?.id}`)}
              style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: C.navy,
                color: C.white, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Back to Event
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  if (!q) return <div style={{ textAlign: "center", padding: 60, color: "#999" }}>No question available</div>;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <Breadcrumbs items={[
        { label: "Events", path: "/events" },
        { label: `${event?.icon || ""} ${event?.name || "Event"}`, path: `/events/${event?.id}` },
        { label: "Quiz" },
      ]} />

      <div style={{ background: C.white, borderRadius: 20, padding: 32, border: `1px solid ${C.gray200}` }}>
        {/* Progress & Timer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {questions.map((_, i) => (
              <div key={i} style={{ width: i === currentQ ? 28 : 10, height: 10, borderRadius: 100,
                background: i < currentQ ? (results[i]?.isCorrect ? C.teal : C.coral) : i === currentQ ? C.gold : C.gray200,
                transition: "all 0.3s" }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ReportButton key={q.id} questionId={q.id} eventId={event?.id} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700,
              color: timeLeft <= 10 ? C.coral : C.gray600 }}>
              <Clock size={16} /> {timeLeft}s
            </div>
          </div>
        </div>

        {/* Question Info */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600,
            background: C.goldLight, color: "#A0522D" }}>{q.topic}</span>
          {q.subtopic && (
            <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600,
              background: C.gray100, color: C.gray600 }}>{q.subtopic}</span>
          )}
          <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600,
            background: C.gray100, color: C.gray600 }}>
            {"★".repeat(q.difficulty)}{"☆".repeat(3 - q.difficulty)}
          </span>
          {q.questionType && q.questionType !== TYPE_MC && (
            <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600,
              background: "#EDE8F8", color: "#5A3E8C" }}>
              {q.questionType === TYPE_SA ? "Short Answer"
                : q.questionType === TYPE_CALC ? "Calculation"
                : q.questionType === TYPE_MATCH ? "Matching"
                : q.questionType}
            </span>
          )}
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4, marginBottom: 24, color: C.navy }}>
          {q.q}
        </h2>

        {/* ── Multiple Choice & True/False ─────────────────── */}
        {(q.questionType === TYPE_MC || q.questionType === TYPE_TF || !q.questionType) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt, i) => {
              const isCorrectOption = i === q.correct;
              const isSelected = selected === i;
              let bg = C.white, border = C.gray200, textColor = C.navy;
              if (answered) {
                if (isCorrectOption) { bg = "#E2F0E6"; border = C.teal; textColor = "#1E6B42"; }
                else if (isSelected && !isCorrectOption) { bg = "#FEF2F2"; border = C.coral; textColor = C.coral; }
              } else if (isSelected) { bg = C.goldLight; border = C.gold; }
              return (
                <button key={i} onClick={() => !answered && handleAnswer(i)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 18px", borderRadius: 12, border: `2px solid ${border}`,
                    background: bg, cursor: answered ? "default" : "pointer",
                    fontSize: 15, fontWeight: 500, color: textColor, fontFamily: "inherit",
                    transition: "all 0.15s", textAlign: "left" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0,
                    background: answered && isCorrectOption ? C.teal : answered && isSelected ? C.coral : C.gray100,
                    color: answered && (isCorrectOption || isSelected) ? C.white : C.gray600 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                  {answered && isCorrectOption && <CheckCircle size={18} color="#1E6B42" style={{ marginLeft: "auto" }} />}
                  {answered && isSelected && !isCorrectOption && <XCircle size={18} color={C.coral} style={{ marginLeft: "auto" }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Short Answer / Calculation / Matching ──────────── */}
        {(q.questionType === TYPE_SA || q.questionType === TYPE_CALC || q.questionType === TYPE_MATCH) && (
          <div>
            {!answered ? (
              <>
                <textarea
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder="Write your answer here..."
                  style={{ width: "100%", minHeight: 100, padding: "14px 16px", borderRadius: 12,
                    border: `2px solid ${C.gray200}`, fontSize: 14, fontFamily: "inherit",
                    color: C.navy, resize: "vertical", outline: "none", boxSizing: "border-box",
                    lineHeight: 1.5 }}
                />
                <button onClick={() => {
                  // Reveal answer — student self-assesses
                  setAnswered(true);
                  setSelected(-1); // pending self-assessment
                }} style={{ marginTop: 12, width: "100%", padding: "13px", borderRadius: 12,
                  border: `2px solid ${C.navy}`, background: "transparent", color: C.navy,
                  fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Reveal Answer
                </button>
              </>
            ) : (
              <>
                {textInput && (
                  <div style={{ padding: "12px 16px", borderRadius: 10, background: C.gray100,
                    fontSize: 13, color: C.gray600, marginBottom: 12 }}>
                    <strong>Your answer:</strong> {textInput}
                  </div>
                )}
                <div style={{ padding: "16px 18px", borderRadius: 12, background: "#F0FDF9",
                  border: "1px solid #BBF7D0", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1E6B42", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Correct Answer
                  </div>
                  <p style={{ fontSize: 14, color: C.navy, fontWeight: 600, lineHeight: 1.6 }}>
                    {q.correctText || q.options?.[q.correct] || "See answer key"}
                  </p>
                  {q.explanation && (
                    <p style={{ fontSize: 12, color: C.gray600, marginTop: 8, lineHeight: 1.5, borderTop: `1px solid #BBF7D0`, paddingTop: 8 }}>
                      {q.explanation}
                    </p>
                  )}
                </div>
                {/* Self-assessment buttons */}
                {selected === -1 && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => handleAnswer(1)}
                      style={{ flex: 1, padding: "13px", borderRadius: 12, border: `2px solid ${C.teal}`,
                        background: "#E2F0E6", color: "#1E6B42", fontSize: 14, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit" }}>
                      ✓ Got it
                    </button>
                    <button onClick={() => handleAnswer(0)}
                      style={{ flex: 1, padding: "13px", borderRadius: 12, border: `2px solid ${C.coral}`,
                        background: "#FEF2F2", color: C.coral, fontSize: 14, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit" }}>
                      ✗ Missed it
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Explanation (MC only — SA shows inline) */}
        {answered && selected !== -1 && (q.questionType === TYPE_MC || q.questionType === TYPE_TF || !q.questionType) && (
          <div style={{ marginTop: 20, padding: "16px 18px",
            background: results[results.length - 1]?.isCorrect ? "#F0FDF9" : "#FEF2F2",
            borderRadius: 12, border: `1px solid ${results[results.length - 1]?.isCorrect ? "#BBF7D0" : "#FECACA"}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6,
              color: results[results.length - 1]?.isCorrect ? "#1E6B42" : C.coral }}>
              {results[results.length - 1]?.isCorrect ? "✓ Correct!" : "✗ Incorrect"}
            </div>
            {q.explanation && <p style={{ fontSize: 13, color: C.gray600, lineHeight: 1.6 }}>{q.explanation}</p>}
          </div>
        )}

        {answered && (
          <button onClick={nextQuestion}
            style={{ marginTop: 20, width: "100%", padding: "14px", borderRadius: 12,
              border: "none", background: C.navy, color: C.white, fontSize: 15, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
            onMouseLeave={e => e.currentTarget.style.opacity = 1}>
            {currentQ + 1 >= questions.length ? "See Results" : "Next Question →"}
          </button>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: C.gray400 }}>
        Question {currentQ + 1} of {questions.length} · {event?.icon} {event?.name}
      </div>
    </div>
  );
}
