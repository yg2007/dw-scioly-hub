import { useState, useRef, useCallback } from "react";
import { AlertCircle, ChevronDown, ChevronUp, FileText, Upload } from "lucide-react";
import { C } from "../../ui";
import { useEventList, useImportQuestions } from "../../hooks/useQuestionBank";
import { Badge } from "./shared";
import { parseJSON, parseCSV, CSV_TEMPLATE } from "./parseUtils";

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

export default function ImportTab() {
  const { events } = useEventList();
  const { importQuestions, loading: importing, error: importError, reset } = useImportQuestions();

  const [phase, setPhase] = useState("upload"); // upload | preview | done
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [eventId, setEventId] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  // Detect and parse a File object
  const handleFile = useCallback((file) => {
    if (!file) return;
    setParseError(null);
    setFileName(file.name);

    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        let questions;
        if (ext === "json") {
          questions = parseJSON(text);
        } else {
          questions = parseCSV(text); // CSV or TXT
        }
        if (questions.length === 0) {
          setParseError("No valid questions found in this file. Check the format and try again.");
          return;
        }

        // Auto-suggest event from first question's eventHint
        const hint = questions[0]?.eventHint;
        if (hint && !eventId) {
          const match = events.find((ev) =>
            ev.name.toLowerCase().includes(hint.toLowerCase()) ||
            hint.toLowerCase().includes(ev.name.toLowerCase())
          );
          if (match) setEventId(String(match.id));
        }

        // Auto-fill source name from file name (strip extension)
        if (!sourceName) {
          setSourceName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
        }

        setParsed(questions);
        setPhase("preview");
      } catch (err) {
        setParseError(`Failed to parse file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }, [events, eventId, sourceName]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    try {
      const result = await importQuestions({
        questions: parsed,
        eventId: Number(eventId),
        sourceName: sourceName.trim() || fileName,
      });
      setImportedCount(result?.count || parsed.length);
      setPhase("done");
    } catch {
      // error surfaced via importError
    }
  };

  const resetAll = () => {
    setPhase("upload"); setFileName(""); setParsed([]); setParseError(null);
    setEventId(""); setSourceName(""); setShowAll(false); setImportedCount(0);
    reset();
  };

  const PREVIEW_COUNT = 8;
  const visibleRows = showAll ? parsed : parsed.slice(0, PREVIEW_COUNT);
  const selectedEvent = events.find((e) => String(e.id) === String(eventId));

  // ── Phase: done ──────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: C.navy, marginBottom: 8 }}>
          {importedCount} question{importedCount !== 1 ? "s" : ""} imported!
        </h3>
        <p style={{ fontSize: 14, color: C.gray600, marginBottom: 8 }}>
          Added to <strong>{selectedEvent?.icon} {selectedEvent?.name}</strong> · Source: <em>{sourceName}</em>
        </p>
        <p style={{ fontSize: 13, color: C.gray400, marginBottom: 32 }}>
          Questions are live immediately and will appear in quizzes for this event.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={resetAll} style={{
            padding: "10px 22px", borderRadius: 10, border: `1px solid ${C.gray200}`,
            background: C.white, color: C.gray600, fontWeight: 600, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Import another file
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: upload ────────────────────────────────────────────
  if (phase === "upload") {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Import Questions from a File</h3>
            <p style={{ fontSize: 13, color: C.gray600 }}>
              Upload a <strong>JSON</strong> tournament bank or a <strong>CSV</strong> spreadsheet.
              Questions are imported directly into the question bank for the event you choose.
            </p>
          </div>
          <button
            onClick={() => {
              const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url;
              a.download = "question_import_template.csv"; a.click();
              URL.revokeObjectURL(url);
            }}
            style={{ ...ghostBtnStyle, whiteSpace: "nowrap", flexShrink: 0 }}
          >
            <FileText size={13} /> Download CSV template
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? C.gold : C.gray200}`,
            borderRadius: 16, padding: "56px 20px", textAlign: "center",
            cursor: "pointer", transition: "all 0.2s",
            background: dragging ? C.goldLight : C.white,
          }}
        >
          <Upload size={36} color={dragging ? C.gold : C.gray400} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: C.navy, marginBottom: 6 }}>
            Drag &amp; drop a file here, or click to browse
          </p>
          <p style={{ fontSize: 12, color: C.gray400 }}>Supported formats: .json · .csv · .txt</p>
          <input ref={fileRef} type="file" accept=".json,.csv,.txt" style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])} />
        </div>

        {parseError && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "#FEF2F2", borderRadius: 10,
            border: `1px solid #FECACA`, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.coral }}>
            <AlertCircle size={15} /> {parseError}
          </div>
        )}

        {/* Format guide */}
        <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            {
              fmt: "JSON", icon: "{ }", color: C.navy,
              desc: "Export from a tournament question bank. Expects an array of objects with question, choices, correct_answer, and optionally topic and difficulty.",
              example: `[{ "question": "...", "choices": ["A","B","C","D"], "correct_answer": "B - text", "topic": "..." }]`,
            },
            {
              fmt: "CSV", icon: "📊", color: C.tealDark,
              desc: "Spreadsheet format. One question per row. Columns: question, A, B, C, D, correct (letter), topic, difficulty (1–3).",
              example: `question,A,B,C,D,correct,topic,difficulty\nWhich...?,opt1,opt2,opt3,opt4,B,Topic,2`,
            },
          ].map(({ fmt, icon, color, desc, example }) => (
            <div key={fmt} style={{ background: C.white, borderRadius: 12, padding: 18, border: `1px solid ${C.gray200}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color }}>{fmt} Format</span>
              </div>
              <p style={{ fontSize: 12, color: C.gray600, lineHeight: 1.5, marginBottom: 10 }}>{desc}</p>
              <pre style={{
                fontSize: 10, background: C.gray100, borderRadius: 8, padding: "8px 10px",
                color: C.gray600, overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.5,
              }}>{example}</pre>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Phase: preview ───────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 2 }}>
            Preview — {parsed.length} questions parsed from <em>{fileName}</em>
          </h3>
          <p style={{ fontSize: 12, color: C.gray400 }}>Review the questions below, then select the target event and import.</p>
        </div>
        <button onClick={resetAll} style={{ ...ghostBtnStyle }}>← Choose different file</button>
      </div>

      {/* Config row */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
        background: C.white, borderRadius: 12, padding: 18, border: `1px solid ${C.gray200}`, marginBottom: 20,
      }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase",
            letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
            Target Event <span style={{ color: C.coral }}>*</span>
          </label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            style={{ ...selectStyle, width: "100%" }}
          >
            <option value="">— Select event —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.icon} {ev.name}</option>
            ))}
          </select>
          {parsed.some((q) => q.eventHint) && (() => {
            const hints = [...new Set(parsed.map((q) => q.eventHint).filter(Boolean))];
            return hints.length > 0 ? (
              <p style={{ fontSize: 11, color: C.gold, marginTop: 4 }}>
                💡 File suggests: {hints.slice(0, 3).join(", ")}
              </p>
            ) : null;
          })()}
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase",
            letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
            Source / Tournament Name
          </label>
          <input
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="e.g. 2026 Regional Invitational"
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
          />
        </div>
      </div>

      {/* Question preview table */}
      <div style={{ border: `1px solid ${C.gray200}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.gray100 }}>
              <th style={{ ...thStyle, color: C.gray400, fontSize: 10, textTransform: "uppercase", width: 32 }}>#</th>
              <th style={{ ...thStyle, color: C.gray400, fontSize: 10, textTransform: "uppercase" }}>Question</th>
              <th style={{ ...thStyle, color: C.gray400, fontSize: 10, textTransform: "uppercase", width: 50 }}>Type</th>
              <th style={{ ...thStyle, color: C.gray400, fontSize: 10, textTransform: "uppercase", width: 110 }}>Correct Answer</th>
              <th style={{ ...thStyle, color: C.gray400, fontSize: 10, textTransform: "uppercase", width: 90 }}>Topic</th>
              <th style={{ ...thStyle, color: C.gray400, fontSize: 10, textTransform: "uppercase", width: 44 }}>Diff</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((q, i) => {
              const correctLetter = q.correct_index != null
                ? String.fromCharCode(65 + q.correct_index)
                : "—";
              const correctOption = q.options?.[q.correct_index] || q.correct_answer_text || "—";
              return (
                <tr key={q._id} style={{ background: i % 2 === 0 ? C.white : C.offWhite, borderTop: `1px solid ${C.gray100}` }}>
                  <td style={{ ...tdStyle, color: C.gray400, fontSize: 11 }}>{i + 1}</td>
                  <td style={{ ...tdStyle, color: C.navy, lineHeight: 1.4, maxWidth: 320 }}>
                    {q.question.length > 110 ? q.question.slice(0, 110) + "…" : q.question}
                  </td>
                  <td style={{ ...tdStyle }}>
                    <Badge
                      label={TYPE_LABEL[q.question_type] || "?"}
                      color={q.question_type === "multiple_choice" ? C.tealDark : q.question_type === "true_false" ? C.gold : C.coral}
                      bg={q.question_type === "multiple_choice" ? "#E2F0E6" : q.question_type === "true_false" ? C.goldLight : "#F5E2DC"}
                    />
                  </td>
                  <td style={{ ...tdStyle, color: C.tealDark, fontWeight: 600, fontSize: 12 }}>
                    {q.question_type !== "short_answer"
                      ? `${correctLetter}. ${(correctOption || "").slice(0, 28)}${(correctOption || "").length > 28 ? "…" : ""}`
                      : <span style={{ color: C.gray400, fontStyle: "italic" }}>Open</span>}
                  </td>
                  <td style={{ ...tdStyle, color: C.gray600, fontSize: 11 }}>{q.topic}</td>
                  <td style={{ ...tdStyle }}>
                    <Badge
                      label={DIFF_LABEL[q.difficulty] || "?"}
                      color={DIFF_COLOR[q.difficulty] || C.gray400}
                      bg={q.difficulty === 1 ? "#E2F0E6" : q.difficulty === 2 ? C.goldLight : "#F5E2DC"}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {parsed.length > PREVIEW_COUNT && (
          <button
            onClick={() => setShowAll((v) => !v)}
            style={{ width: "100%", padding: "10px", background: C.gray100, border: "none",
              borderTop: `1px solid ${C.gray200}`, cursor: "pointer", fontSize: 12, color: C.gray600,
              fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 5 }}
          >
            {showAll
              ? <><ChevronUp size={13} /> Show fewer</>
              : <><ChevronDown size={13} /> Show all {parsed.length} questions</>}
          </button>
        )}
      </div>

      {/* Error */}
      {importError && (
        <div style={{ marginBottom: 14, padding: "12px 16px", background: "#FEF2F2", borderRadius: 10,
          border: `1px solid #FECACA`, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.coral }}>
          <AlertCircle size={15} /> {importError}
        </div>
      )}

      {/* Import button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleImport}
          disabled={importing || !eventId}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 28px", borderRadius: 10, border: "none",
            background: !eventId ? C.gray200 : C.navy, color: !eventId ? C.gray400 : C.white,
            fontSize: 14, fontWeight: 700, cursor: !eventId ? "not-allowed" : "pointer",
            fontFamily: "inherit", transition: "all 0.15s",
          }}
        >
          <Upload size={15} />
          {importing ? "Importing…" : `Import ${parsed.length} Question${parsed.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
