import { useState } from "react";
import { C } from "../../ui";

const actionBtnStyle = {
  display: "flex", alignItems: "center", gap: 5, padding: "7px 14px",
  borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
  fontFamily: "inherit",
};

export default function QuestionEditForm({ q, onSave, onCancel, saving }) {
  const opts = Array.isArray(q.options) ? [...q.options] : ["", "", "", ""];
  const [questionText, setQuestionText] = useState(q.question || "");
  const [options, setOptions] = useState(opts.length === 4 ? opts : [...opts, ...Array(4 - opts.length).fill("")]);
  const [correctIndex, setCorrectIndex] = useState(q.correct_index ?? 0);

  const setOption = (i, val) => {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  };

  return (
    <div style={{ marginTop: 12, padding: 16, background: C.gray100, borderRadius: 10, border: `1px solid ${C.gray200}` }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
        ✏ Editing question
      </p>

      {/* Question text */}
      <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600, display: "block", marginBottom: 4 }}>Question</label>
      <textarea
        value={questionText}
        onChange={e => setQuestionText(e.target.value)}
        rows={3}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.gray200}`,
          fontSize: 13, fontFamily: "inherit", color: C.navy, resize: "vertical",
          outline: "none", boxSizing: "border-box", lineHeight: 1.5, marginBottom: 12 }}
      />

      {/* Options */}
      {q.question_type === "multiple_choice" && (
        <>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600, display: "block", marginBottom: 6 }}>
            Answer options — select the correct one
          </label>
          {options.map((opt, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <input
                type="radio"
                name={`correct-${q.id}`}
                checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)}
                style={{ accentColor: C.teal, flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, width: 16 }}>
                {String.fromCharCode(65 + i)}.
              </span>
              <input
                value={opt}
                onChange={e => setOption(i, e.target.value)}
                style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: `1px solid ${correctIndex === i ? C.teal : C.gray200}`,
                  fontSize: 13, fontFamily: "inherit", color: C.navy, outline: "none",
                  background: correctIndex === i ? "#F0FDF9" : C.white }}
              />
            </div>
          ))}
        </>
      )}

      {/* True/False */}
      {q.question_type === "true_false" && (
        <>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600, display: "block", marginBottom: 6 }}>
            Correct answer
          </label>
          {options.filter(o => o).map((opt, i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 6, cursor: "pointer" }}>
              <input type="radio" name={`correct-tf-${q.id}`} checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)} style={{ accentColor: C.teal }} />
              {opt}
            </label>
          ))}
        </>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={onCancel} style={{ ...actionBtnStyle, background: C.white, color: C.gray600, border: `1px solid ${C.gray200}` }}>
          Cancel
        </button>
        <button
          onClick={() => onSave({ questionText, options, correctIndex })}
          disabled={saving || !questionText.trim()}
          style={{ ...actionBtnStyle, background: C.navy, color: C.white, border: "none", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
