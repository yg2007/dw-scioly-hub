import { useState, useCallback } from "react";
import { CheckCircle, AlertCircle, Plus, RotateCcw } from "lucide-react";
import { C } from "../../ui";
import { useEventList, useImportQuestions } from "../../hooks/useQuestionBank";
import { invalidateCache } from "../../lib/query";

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy", color: C.teal },
  { value: "medium", label: "Medium", color: C.gold },
  { value: "hard", label: "Hard", color: C.coral },
];

const inputStyle = {
  padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.gray200}`,
  fontSize: 13, fontFamily: "inherit", background: C.white, color: C.navy,
  outline: "none", width: "100%", boxSizing: "border-box",
};

const labelStyle = {
  fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase",
  letterSpacing: 0.5, display: "block", marginBottom: 6,
};

const EMPTY_FORM = {
  eventId: "",
  question: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctIndex: 0,
  topic: "",
  difficulty: "medium",
  explanation: "",
};

export default function AddQuestionTab() {
  const { events } = useEventList();
  const { importQuestions, loading: saving, error: saveError, reset } = useImportQuestions();

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [success, setSuccess] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  const set = useCallback((field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSuccess(false);
    reset();
  }, [reset]);

  const options = [form.optionA, form.optionB, form.optionC, form.optionD];
  const filledOptions = options.filter(Boolean);

  // Validate
  const isValid =
    form.eventId &&
    form.question.trim().length > 5 &&
    filledOptions.length >= 2 &&
    form.optionA && form.optionB && // A and B always required
    form.topic.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;

    // Build the 4-element options array (blank C/D for T/F)
    const opts = [form.optionA, form.optionB, form.optionC || "", form.optionD || ""];

    const question = {
      question: form.question.trim(),
      question_type: !form.optionC && !form.optionD ? "true_false" : "multiple_choice",
      options: opts,
      correct_index: Number(form.correctIndex),
      correct_answer_text: opts[Number(form.correctIndex)],
      topic: form.topic.trim(),
      difficulty: form.difficulty,
      explanation: form.explanation.trim() || null,
    };

    try {
      await importQuestions({
        questions: [question],
        eventId: Number(form.eventId),
        sourceName: "Coach — Manual Entry",
      });
      setAddedCount((c) => c + 1);
      setSuccess(true);
      invalidateCache("question-browser");
      // Reset form but keep event + topic for rapid entry
      setForm((prev) => ({
        ...EMPTY_FORM,
        eventId: prev.eventId,
        topic: prev.topic,
        difficulty: prev.difficulty,
      }));
    } catch {
      // error surfaced via saveError
    }
  };

  const selectedEvent = events.find((e) => String(e.id) === String(form.eventId));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Add a Question</h3>
        <p style={{ fontSize: 13, color: C.gray600 }}>
          Create a single question manually. For bulk imports, use the <strong>Import Questions</strong> tab.
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div style={{
          marginBottom: 18, padding: "12px 16px", background: "#F0FDF4", borderRadius: 10,
          border: "1px solid #BBF7D0", display: "flex", alignItems: "center", gap: 8,
          fontSize: 13, color: C.teal,
        }}>
          <CheckCircle size={15} />
          Question added to <strong style={{ margin: "0 4px" }}>{selectedEvent?.icon} {selectedEvent?.name}</strong>!
          {addedCount > 1 && <span style={{ color: C.gray400 }}> ({addedCount} total this session)</span>}
        </div>
      )}

      {/* Error banner */}
      {saveError && (
        <div style={{
          marginBottom: 18, padding: "12px 16px", background: "#FEF2F2", borderRadius: 10,
          border: "1px solid #FECACA", display: "flex", alignItems: "center", gap: 8,
          fontSize: 13, color: C.coral,
        }}>
          <AlertCircle size={15} /> {saveError}
        </div>
      )}

      <div style={{ background: C.white, borderRadius: 14, padding: 24, border: `1px solid ${C.gray200}` }}>
        {/* Row 1: Event + Topic + Difficulty */}
        <div className="form-row" style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={labelStyle}>
              Event <span style={{ color: C.coral }}>*</span>
            </label>
            <select value={form.eventId} onChange={set("eventId")} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">— Select event —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.icon} {ev.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={labelStyle}>
              Topic <span style={{ color: C.coral }}>*</span>
            </label>
            <input
              value={form.topic} onChange={set("topic")}
              placeholder="e.g. Cell Biology, Optics, Plate Tectonics"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Difficulty</label>
            <div style={{ display: "flex", gap: 4 }}>
              {DIFFICULTY_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => { setForm((p) => ({ ...p, difficulty: d.value })); setSuccess(false); }}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 8, border: "none",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.15s",
                    background: form.difficulty === d.value ? d.color : C.gray100,
                    color: form.difficulty === d.value ? C.white : C.gray400,
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Question text */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>
            Question <span style={{ color: C.coral }}>*</span>
          </label>
          <textarea
            value={form.question} onChange={set("question")}
            placeholder="Type the full question here..."
            rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        {/* Row 3: Options A-D with correct selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>
            Answer Choices <span style={{ color: C.coral }}>*</span>
            <span style={{ fontWeight: 400, textTransform: "none", color: C.gray400, marginLeft: 8 }}>
              Click the circle to mark correct answer. C &amp; D optional for True/False.
            </span>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {["A", "B", "C", "D"].map((letter, idx) => {
              const field = `option${letter}`;
              const isCorrect = Number(form.correctIndex) === idx;
              const isRequired = idx < 2;
              return (
                <div key={letter} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Correct answer radio */}
                  <button
                    type="button"
                    onClick={() => { setForm((p) => ({ ...p, correctIndex: idx })); setSuccess(false); }}
                    title={isCorrect ? "Correct answer" : "Mark as correct"}
                    style={{
                      width: 28, height: 28, borderRadius: "50%", border: `2px solid ${isCorrect ? C.teal : C.gray200}`,
                      background: isCorrect ? C.teal : C.white, cursor: "pointer", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {isCorrect && <CheckCircle size={14} color={C.white} />}
                  </button>
                  <span style={{ fontWeight: 700, fontSize: 13, color: isCorrect ? C.teal : C.gray400, width: 16 }}>
                    {letter}
                  </span>
                  <input
                    value={form[field]} onChange={set(field)}
                    placeholder={isRequired ? `Option ${letter} (required)` : `Option ${letter} (optional)`}
                    style={{ ...inputStyle, flex: 1, borderColor: isCorrect ? C.teal : C.gray200 }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 4: Explanation (optional) */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Explanation <span style={{ fontWeight: 400, textTransform: "none", color: C.gray400 }}>(optional)</span></label>
          <textarea
            value={form.explanation} onChange={set("explanation")}
            placeholder="Why is this the correct answer? Shown to students after answering."
            rows={2}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        {/* Submit row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => { setForm({ ...EMPTY_FORM }); setSuccess(false); reset(); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.gray200}`,
              background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <RotateCcw size={13} /> Clear form
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !isValid}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 28px", borderRadius: 10, border: "none",
              background: !isValid ? C.gray200 : C.navy,
              color: !isValid ? C.gray400 : C.white,
              fontSize: 14, fontWeight: 700,
              cursor: !isValid ? "not-allowed" : "pointer",
              fontFamily: "inherit", transition: "all 0.15s",
            }}
          >
            <Plus size={15} />
            {saving ? "Saving..." : "Add Question"}
          </button>
        </div>
      </div>
    </div>
  );
}
