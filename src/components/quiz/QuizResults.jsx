// ═══════════════════════════════════════════════════════════════
//  QuizResults — Extracted sub-component for quiz results display
//
//  Handles: score display, topic breakdown, answer review,
//  retake/back navigation. This was previously the `finished`
//  branch of QuizPage, extracted to reduce component size and
//  avoid unnecessary reconciliation during quiz-taking.
// ═══════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, XCircle } from 'lucide-react';
import { C } from '../../ui';

export default function QuizResults({ questions, results, event, onRetake, onBackToEvent }) {
  const { correct, pct, topicResults } = useMemo(() => {
    const correct = (results || []).filter(r => r.isCorrect).length;
    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const topicResults = {};
    (results || []).forEach((r, i) => {
      const topic = questions[i]?.topic || "Unknown";
      if (!topicResults[topic]) topicResults[topic] = { correct: 0, total: 0 };
      topicResults[topic].total++;
      if (r.isCorrect) topicResults[topic].correct++;
    });
    return { correct, pct, topicResults };
  }, [questions, results]);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ background: C.white, borderRadius: 20, padding: 36, border: `1px solid ${C.gray200}`, textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{pct >= 80 ? "🏆" : pct >= 60 ? "👍" : "📚"}</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Quiz Complete!</h2>
        <p style={{ fontSize: 16, color: C.gray600, marginBottom: 24 }}>{event?.icon} {event?.name}</p>

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
        {(results || []).map((r, i) => (
          <div key={i} style={{ textAlign: "left", padding: "14px 16px", background: r.isCorrect ? "#F0FDF9" : "#FEF2F2",
            borderRadius: 10, marginBottom: 8, border: `1px solid ${r.isCorrect ? "#BBF7D0" : "#FECACA"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {r.isCorrect ? <CheckCircle size={16} color={C.tealDark} /> : <XCircle size={16} color={C.coral} />}
              <span style={{ fontSize: 13, fontWeight: 600 }}>{questions[i]?.q}</span>
            </div>
            {!r.isCorrect && (
              <div style={{ fontSize: 12, color: C.gray600, paddingLeft: 24 }}>
                <span style={{ color: C.coral }}>Your answer: {r.selected >= 0 ? questions[i]?.options?.[r.selected] : "Time expired"}</span>
                <br />
                <span style={{ color: C.tealDark }}>Correct: {questions[i]?.options?.[questions[i]?.correct]}</span>
                <br />
                <span style={{ fontStyle: "italic", color: C.gray400 }}>{questions[i]?.explanation}</span>
              </div>
            )}
          </div>
        ))}

        <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "center" }}>
          <button onClick={onRetake}
            style={{ padding: "12px 24px", borderRadius: 10, border: `2px solid ${C.teal}`, background: "transparent",
              color: C.teal, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Retake Quiz
          </button>
          <button onClick={onBackToEvent}
            style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: C.navy,
              color: C.white, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Back to Event
          </button>
        </div>
      </div>
    </div>
  );
}

QuizResults.propTypes = {
  questions: PropTypes.arrayOf(PropTypes.shape({
    q: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.string),
    correct: PropTypes.number,
    topic: PropTypes.string,
    explanation: PropTypes.string,
  })).isRequired,
  results: PropTypes.arrayOf(PropTypes.shape({
    isCorrect: PropTypes.bool,
    selected: PropTypes.number,
  })).isRequired,
  event: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    icon: PropTypes.string,
  }),
  onRetake: PropTypes.func.isRequired,
  onBackToEvent: PropTypes.func.isRequired,
};
