import { useState } from "react";
import { CheckCircle, XCircle, RefreshCw, Pencil } from "lucide-react";
import { C } from "../../ui";
import { useAppContext } from "../../lib/AppContext";
import {
  useReviewQueue,
  useApproveQuestion,
  useRejectQuestion,
  useEditQuestion,
} from "../../hooks/useQuestionBank";
import { Badge, EmptyState, LoadingRows, ErrorBanner } from "./shared";
import QuestionEditForm from "./QuestionEditForm";

const DIFF_LABEL = { 1: "Easy", 2: "Medium", 3: "Hard" };
const DIFF_COLOR = { 1: C.teal, 2: C.gold, 3: C.coral };

const TYPE_LABEL = {
  multiple_choice: "MC",
  short_answer: "SA",
  true_false: "T/F",
  matching: "Match",
  calculation: "Calc",
};

const ghostBtnStyle = {
  display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
  borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.white,
  color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer",
  fontFamily: "inherit",
};

const actionBtnStyle = {
  display: "flex", alignItems: "center", gap: 5, padding: "7px 14px",
  borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
  fontFamily: "inherit",
};

export default function ReviewQueueTab() {
  const { currentUser } = useAppContext();
  const { queue, loading, error, refetch } = useReviewQueue();
  const { approve, loading: approving } = useApproveQuestion();
  const { reject, loading: rejecting } = useRejectQuestion();
  const { save: saveEdit } = useEditQuestion();
  const [actionId, setActionId] = useState(null);
  const [editingId, setEditingId] = useState(null); // queue item id being edited

  const handleApprove = async (item) => {
    setActionId(item.id);
    try {
      await approve({ queueId: item.id, reviewedBy: currentUser?.id });
      refetch();
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (item) => {
    if (!window.confirm("Delete this question permanently? This cannot be undone.")) return;
    setActionId(item.id);
    try {
      await reject({ questionId: item.quiz_questions?.id });
      refetch();
    } finally {
      setActionId(null);
    }
  };

  const handleSaveEdit = async (item, { questionText, options, correctIndex }) => {
    const q = item.quiz_questions;
    setActionId(item.id);
    try {
      await saveEdit({
        questionId: q.id,
        question: questionText,
        options,
        correctIndex,
        correctAnswerText: options[correctIndex] || "",
        currentQuestion: q.question,
        currentOptions: q.options,
        editorId: currentUser?.id,
      });
      setEditingId(null);
      refetch();
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <LoadingRows />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;

  if (queue.length === 0) {
    return (
      <EmptyState
        icon="✅"
        title="Queue is clear"
        subtitle="All questions have been reviewed. New AI-generated or flagged questions will appear here."
      />
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: C.gray600 }}>
          {queue.length} question{queue.length !== 1 ? "s" : ""} pending review
        </p>
        <button onClick={refetch} style={ghostBtnStyle}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {queue.map((item) => {
          const q = item.quiz_questions;
          if (!q) return null;
          const event = q.events;
          const isActive = actionId === item.id;
          const isEditing = editingId === item.id;

          return (
            <div key={item.id} style={{
              background: C.white, borderRadius: 12, padding: 20,
              border: `1px solid ${isEditing ? C.gold : C.gray200}`,
              transition: "opacity 0.2s, border-color 0.15s",
              opacity: isActive ? 0.6 : 1,
            }}>
              {/* Header row */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15 }}>{event?.icon || "📋"}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{event?.name || "Unknown Event"}</span>
                {q.topic && <Badge label={q.topic} bg={C.goldLight} color={C.gold} />}
                {q.subtopic && <Badge label={q.subtopic} bg={C.gray100} color={C.gray600} />}
                <Badge label={DIFF_LABEL[q.difficulty] || "?"} bg={DIFF_COLOR[q.difficulty] || C.gray200} />
                <Badge label={TYPE_LABEL[q.question_type] || q.question_type} bg="#E2F0E6" color={C.tealDark} />
                {item.flagged_reason && (
                  <Badge label={`⚠ ${item.flagged_reason.replace(/_/g, " ")}`} bg="#FEY3C7" color="#92400E" />
                )}
                {q.last_edited_at && (
                  <Badge label={`✏ edited`} bg="#EDE8F8" color="#5A3E8C" />
                )}
              </div>

              {/* Question text (view mode) */}
              {!isEditing && (
                <>
                  <p style={{ fontSize: 14, color: C.navy, marginBottom: 10, lineHeight: 1.5 }}>
                    {q.question}
                  </p>

                  {/* Show original if edited */}
                  {q.original_question && q.original_question !== q.question && (
                    <p style={{ fontSize: 12, color: C.gray400, marginBottom: 10, fontStyle: "italic", lineHeight: 1.4 }}>
                      Original: "{q.original_question}"
                    </p>
                  )}

                  {/* Options (MC) */}
                  {q.question_type === "multiple_choice" && Array.isArray(q.options) && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 10 }}>
                      {q.options.filter(o => o).map((opt, i) => (
                        <div key={i} style={{
                          fontSize: 12, padding: "4px 10px", borderRadius: 6,
                          background: i === q.correct_index ? "#E2F0E6" : C.gray100,
                          color: i === q.correct_index ? C.tealDark : C.gray600,
                          fontWeight: i === q.correct_index ? 600 : 400,
                        }}>
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Answer (T/F or non-MC) */}
                  {q.question_type !== "multiple_choice" && q.correct_answer_text && (
                    <div style={{ fontSize: 12, padding: "6px 10px", borderRadius: 6, background: "#E2F0E6", color: C.tealDark, marginBottom: 10 }}>
                      Answer: <strong>{q.correct_answer_text}</strong>
                    </div>
                  )}
                </>
              )}

              {/* Inline edit form */}
              {isEditing && (
                <QuestionEditForm
                  q={q}
                  saving={isActive}
                  onCancel={() => setEditingId(null)}
                  onSave={(edits) => handleSaveEdit(item, edits)}
                />
              )}

              {/* Footer: source + audit trail + actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 11, color: C.gray400, lineHeight: 1.6 }}>
                  <span>Source: {q.source_tournament || "Unknown"} · Flagged {new Date(item.created_at).toLocaleDateString()}</span>
                  {q.last_edited_at && (
                    <span style={{ display: "block", color: "#7C3AED" }}>
                      ✏ Edited {new Date(q.last_edited_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {!isEditing && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setEditingId(item.id)}
                      disabled={isActive}
                      style={{ ...actionBtnStyle, background: "#EDE8F8", color: "#5A3E8C", border: `1px solid #C4B5FD` }}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleReject(item)}
                      disabled={isActive || rejecting}
                      style={{ ...actionBtnStyle, background: "#FEF2F2", color: C.coral, border: `1px solid #FECACA` }}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={isActive || approving}
                      style={{ ...actionBtnStyle, background: "#E2F0E6", color: C.tealDark, border: `1px solid #A7D3B9` }}
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
