import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, Clock, XCircle } from 'lucide-react';
import { C } from '../ui';
import { QUIZ_BANK } from '../data/mockData';

export default function QuizPage({ event, user, navigate }) {
  const questions = useMemo(() => {
    const bank = QUIZ_BANK[event?.id] || QUIZ_BANK[1];
    return [...bank].sort(() => Math.random() - 0.5).slice(0, Math.min(6, bank.length));
  }, [event?.id]);

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState([]);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);

  const handleAnswer = useCallback((idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    setResults(prev => [...prev, { question: currentQ, selected: idx, correct: questions[currentQ].correct, isCorrect: idx === questions[currentQ].correct }]);
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

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentQ(prev => prev + 1);
      setSelected(null);
      setAnswered(false);
      setTimeLeft(45);
    }
  };

  if (!event) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <p style={{ color: C.gray400, marginBottom: 16 }}>Please select an event first to start a quiz.</p>
        <button onClick={() => navigate("events")} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: C.teal, color: C.white, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
          Browse Events
        </button>
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
          {results.map((r, i) => (
            <div key={i} style={{ textAlign: "left", padding: "14px 16px", background: r.isCorrect ? "#F0FDF9" : "#FEF2F2",
              borderRadius: 10, marginBottom: 8, border: `1px solid ${r.isCorrect ? "#BBF7D0" : "#FECACA"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {r.isCorrect ? <CheckCircle size={16} color={C.tealDark} /> : <XCircle size={16} color={C.coral} />}
                <span style={{ fontSize: 13, fontWeight: 600 }}>{questions[i].q}</span>
              </div>
              {!r.isCorrect && (
                <div style={{ fontSize: 12, color: C.gray600, paddingLeft: 24 }}>
                  <span style={{ color: C.coral }}>Your answer: {r.selected >= 0 ? questions[i].options[r.selected] : "Time expired"}</span>
                  <br />
                  <span style={{ color: C.tealDark }}>Correct: {questions[i].options[questions[i].correct]}</span>
                  <br />
                  <span style={{ fontStyle: "italic", color: C.gray400 }}>{questions[i].explanation}</span>
                </div>
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "center" }}>
            <button onClick={() => { setCurrentQ(0); setSelected(null); setAnswered(false); setResults([]); setFinished(false); setTimeLeft(45); }}
              style={{ padding: "12px 24px", borderRadius: 10, border: `2px solid ${C.teal}`, background: "transparent",
                color: C.teal, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Retake Quiz
            </button>
            <button onClick={() => navigate("events", event)}
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
  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <button onClick={() => navigate("events", event)}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          color: C.gray400, fontSize: 13, cursor: "pointer", marginBottom: 16, fontFamily: "inherit" }}>
        <ArrowLeft size={14} /> Exit Quiz
      </button>

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
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700,
            color: timeLeft <= 10 ? C.coral : C.gray600 }}>
            <Clock size={16} /> {timeLeft}s
          </div>
        </div>

        {/* Question Info */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600,
            background: C.goldLight, color: "#A0522D" }}>{q.topic}</span>
          <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600,
            background: C.gray100, color: C.gray600 }}>
            {"★".repeat(q.difficulty)}{"☆".repeat(3 - q.difficulty)}
          </span>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4, marginBottom: 24, color: C.navy }}>
          {q.q}
        </h2>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {q.options.map((opt, i) => {
            const isCorrectOption = i === q.correct;
            const isSelected = selected === i;
            let bg = C.white;
            let border = C.gray200;
            let textColor = C.navy;
            if (answered) {
              if (isCorrectOption) { bg = "#E2F0E6"; border = C.teal; textColor = C.tealDark; }
              else if (isSelected && !isCorrectOption) { bg = "#FEF2F2"; border = C.coral; textColor = C.coral; }
            } else if (isSelected) {
              bg = C.goldLight; border = C.gold;
            }
            return (
              <button key={i} onClick={() => !answered && handleAnswer(i)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px", borderRadius: 12,
                  border: `2px solid ${border}`, background: bg, cursor: answered ? "default" : "pointer",
                  fontSize: 15, fontWeight: 500, color: textColor, fontFamily: "inherit",
                  transition: "all 0.15s", textAlign: "left" }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0,
                  background: answered && isCorrectOption ? C.teal : answered && isSelected ? C.coral : C.gray100,
                  color: answered && (isCorrectOption || isSelected) ? C.white : C.gray600 }}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
                {answered && isCorrectOption && <CheckCircle size={18} color={C.tealDark} style={{ marginLeft: "auto" }} />}
                {answered && isSelected && !isCorrectOption && <XCircle size={18} color={C.coral} style={{ marginLeft: "auto" }} />}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {answered && (
          <div style={{ marginTop: 20, padding: "16px 18px", background: selected === q.correct ? "#F0FDF9" : "#FEF2F2",
            borderRadius: 12, border: `1px solid ${selected === q.correct ? "#BBF7D0" : "#FECACA"}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6,
              color: selected === q.correct ? C.tealDark : C.coral }}>
              {selected === q.correct ? "✓ Correct!" : "✗ Incorrect"}
            </div>
            <p style={{ fontSize: 13, color: C.gray600, lineHeight: 1.6 }}>{q.explanation}</p>
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
        Question {currentQ + 1} of {questions.length} · {event.icon} {event.name}
      </div>
    </div>
  );
}
