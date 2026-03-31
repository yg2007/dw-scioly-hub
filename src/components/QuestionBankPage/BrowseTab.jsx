import { useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { C } from "../../ui";
import { useEventList, useQuestionBrowser } from "../../hooks/useQuestionBank";
import { Badge, EmptyState, LoadingRows, ErrorBanner } from "./shared";

const DIFF_LABEL = { 1: "Easy", 2: "Medium", 3: "Hard" };
const DIFF_COLOR = { 1: C.teal, 2: C.gold, 3: C.coral };

const TYPE_LABEL = {
  multiple_choice: "MC",
  short_answer: "SA",
  true_false: "T/F",
  matching: "Match",
  calculation: "Calc",
};

const inputStyle = {
  padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.gray200}`,
  fontSize: 13, fontFamily: "inherit", background: C.white, color: C.navy,
  outline: "none",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer", paddingRight: 28,
};

const ghostBtnStyle = {
  display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
  borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.white,
  color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer",
  fontFamily: "inherit",
};

const thStyle = {
  padding: "10px 14px", textAlign: "left", fontWeight: 600,
};

const tdStyle = {
  padding: "10px 14px", verticalAlign: "top",
};

export default function BrowseTab() {
  const { events } = useEventList();
  const [eventId, setEventId] = useState("");
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [questionType, setQuestionType] = useState("");

  const { questions, loading, error, refetch } = useQuestionBrowser({
    eventId: eventId || undefined,
    search: search || undefined,
    difficulty: difficulty || undefined,
    questionType: questionType || undefined,
  });

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.gray400 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions..."
            style={{ ...inputStyle, paddingLeft: 32, width: "100%" }}
          />
        </div>

        <select value={eventId} onChange={e => setEventId(e.target.value)} style={selectStyle}>
          <option value="">All Events</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.icon} {ev.name}</option>
          ))}
        </select>

        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={selectStyle}>
          <option value="">Any Difficulty</option>
          <option value="1">Easy</option>
          <option value="2">Medium</option>
          <option value="3">Hard</option>
        </select>

        <select value={questionType} onChange={e => setQuestionType(e.target.value)} style={selectStyle}>
          <option value="">Any Type</option>
          <option value="multiple_choice">Multiple Choice</option>
          <option value="short_answer">Short Answer</option>
          <option value="true_false">True / False</option>
          <option value="matching">Matching</option>
          <option value="calculation">Calculation</option>
        </select>

        <button onClick={refetch} style={ghostBtnStyle}><RefreshCw size={13} /></button>
      </div>

      {/* Count */}
      {!loading && (
        <p style={{ fontSize: 12, color: C.gray400, marginBottom: 12 }}>
          {questions.length} question{questions.length !== 1 ? "s" : ""}{questions.length === 200 ? " (limit 200 — use filters to narrow)" : ""}
        </p>
      )}

      {loading && <LoadingRows />}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {!loading && !error && questions.length === 0 && (
        <EmptyState icon="🔍" title="No questions found" subtitle="Try adjusting your filters." />
      )}

      {!loading && questions.length > 0 && (
        <div style={{ border: `1px solid ${C.gray200}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.gray100, color: C.gray600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <th style={thStyle}>Event</th>
                <th style={thStyle}>Question</th>
                <th style={thStyle}>Topic</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Diff</th>
                <th style={thStyle}>Source</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, i) => (
                <tr key={q.id} style={{ background: i % 2 === 0 ? C.white : C.offWhite, borderTop: `1px solid ${C.gray100}` }}>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 14 }}>{q.events?.icon || "📋"}</span>{" "}
                    <span style={{ color: C.gray600, whiteSpace: "nowrap" }}>{q.events?.name}</span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 360 }}>
                    <span style={{ color: C.navy, lineHeight: 1.4 }}>{q.question}</span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ color: C.gray600 }}>{q.topic || "—"}</div>
                    {q.subtopic && <div style={{ fontSize: 11, color: C.gray400 }}>{q.subtopic}</div>}
                  </td>
                  <td style={tdStyle}>
                    <Badge label={TYPE_LABEL[q.question_type] || q.question_type} bg="#E2F0E6" color={C.tealDark} />
                  </td>
                  <td style={tdStyle}>
                    <Badge label={DIFF_LABEL[q.difficulty] || "?"} bg={DIFF_COLOR[q.difficulty] || C.gray200} />
                  </td>
                  <td style={{ ...tdStyle, color: C.gray400, fontSize: 11, whiteSpace: "nowrap" }}>
                    {q.source_tournament || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
