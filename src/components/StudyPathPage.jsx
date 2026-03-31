import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Play, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { C } from '../ui';
import { IS_PRODUCTION } from '../lib/featureFlags';
import { useAppContext } from '../lib/AppContext';
import { useCurrentEvent } from '../hooks/useCurrentEvent';
import { useStudyPaths } from '../hooks/useStudyPaths';
import { useUnifiedMastery } from '../hooks/useUnifiedData';
import { SkeletonDashboard } from './shared/Skeleton';

// ─── Stage definitions ──────────────────────────────────────────────────────
// `key` matches the study_stage DB enum values
const STAGES = [
  {
    num: 1, key: 'foundation', name: "Generalize", desc: "Build baseline across all topics",
    color: C.gold, icon: "📚",
    tasks: [
      "Complete overview readings for all topics",
      "Take a broad diagnostic quiz",
      "Identify major knowledge gaps",
    ],
  },
  {
    num: 2, key: 'application', name: "Specialize", desc: "Target your weak areas",
    color: C.teal, icon: "🎯",
    tasks: [
      "Focus quizzes on lowest-scoring topics",
      "Review AI-generated study summaries",
      "Practice with topic-specific flashcards",
    ],
  },
  {
    num: 3, key: 'mastery', name: "Refine", desc: "State & nationals depth",
    color: C.coral, icon: "⚡",
    tasks: [
      "Cover State/National-only topics",
      "Practice advanced application questions",
      "Coordinate topic coverage with your partner",
    ],
  },
  {
    num: 4, key: 'competition', name: "Master", desc: "Competition simulation",
    color: C.navy, icon: "🏆",
    tasks: [
      "Timed full-length practice tests",
      "Review past state/national questions",
      "Maintain mastery with spaced review",
    ],
  },
];

const STAGE_KEYS = STAGES.map(s => s.key);

export default function StudyPathPage() {
  const navigate = useNavigate();
  const { currentUser: user } = useAppContext();
  const { event: ev, loading: eventLoading } = useCurrentEvent();

  // ── Real mastery data (works in both modes via useUnifiedMastery) ─────────
  const { mastery, avg: masteryAvg, loading: masteryLoading } = useUnifiedMastery(
    user?.id ?? null,
    ev?.id ?? null
  );

  // ── Study path persistence (production only; null userId = disabled) ───────
  const {
    paths,
    loading: pathsLoading,
    updateProgress,
    updating,
  } = useStudyPaths(IS_PRODUCTION ? (user?.id ?? null) : null);

  // ── Derive current stage ────────────────────────────────────────────────
  const path = IS_PRODUCTION ? (paths.find(p => p.event_id === ev?.id) ?? null) : null;
  const stageFromMastery = masteryAvg >= 85 ? 4 : masteryAvg >= 70 ? 3 : masteryAvg >= 50 ? 2 : 1;
  const currentStage = (IS_PRODUCTION && path)
    ? (STAGE_KEYS.indexOf(path.current_stage) + 1 || 1)
    : stageFromMastery;

  const currentStageDef = STAGES[currentStage - 1];
  const stageProgress = path?.stage_progress ?? {};

  // ── Local task-completion state (resets when stage or event changes) ──────
  const [taskCompletion, setTaskCompletion] = useState(
    () => currentStageDef.tasks.map(() => false)
  );
  useEffect(() => {
    setTaskCompletion(STAGES[currentStage - 1].tasks.map(() => false));
  }, [currentStage, ev?.id]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTaskToggle = async (taskIdx) => {
    const next = taskCompletion.map((v, i) => i === taskIdx ? !v : v);
    setTaskCompletion(next);
    if (IS_PRODUCTION && ev?.id) {
      const pct = Math.round(next.filter(Boolean).length / next.length * 100);
      await updateProgress(ev.id, currentStageDef.key, pct);
    }
  };

  const handleAdvanceStage = async () => {
    if (currentStage >= 4 || !ev?.id) return;
    const nextKey = STAGE_KEYS[currentStage]; // currentStage is 1-indexed; index of next = currentStage
    if (IS_PRODUCTION) {
      await updateProgress(ev.id, nextKey, 0);
    }
    // In prototype: stage is mastery-derived, can't manually advance
  };

  const allTasksDone = taskCompletion.every(Boolean);
  const anyTaskDone  = taskCompletion.some(Boolean);
  const isLoading = IS_PRODUCTION && (pathsLoading || masteryLoading || eventLoading);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return <SkeletonDashboard stats={2} rows={5} style={{ padding: "4px 0" }} />;
  }

  // ── Priority topics (sorted weakest → strongest) ──────────────────────────
  const sortedTopics = IS_PRODUCTION
    ? [...(mastery || [])].sort((a, b) => (a?.score ?? 0) - (b?.score ?? 0))
    : [...(mastery || [])].sort((a, b) => (a?.score ?? 0) - (b?.score ?? 0));

  return (
    <div>
      {ev && (
        <button onClick={() => navigate(`/events/${ev.id}`)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
            color: C.gray400, fontSize: 13, cursor: "pointer", marginBottom: 16, fontFamily: "inherit" }}>
          <ArrowLeft size={14} /> Back to {ev.name}
        </button>
      )}

      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        🧠 Learning Path {ev ? `— ${ev.icon} ${ev.name}` : ""}
      </h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 32 }}>
        You&apos;re in{" "}
        <strong style={{ color: currentStageDef.color }}>
          Stage {currentStage}: {currentStageDef.name}
        </strong>
        {masteryAvg > 0 && ` · ${masteryAvg}% overall mastery`}
        {IS_PRODUCTION && path?.last_activity_at && (
          <span style={{ color: C.gray400, fontWeight: 400 }}>
            {" · Last active "}{new Date(path.last_activity_at).toLocaleDateString()}
          </span>
        )}
      </p>

      {/* ── Stage Progress Track ──────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 40, position: "relative" }}>
        {STAGES.map((s, i) => {
          const isActive   = s.num === currentStage;
          const isComplete = s.num < currentStage;
          const pct        = stageProgress[s.key] ?? 0;

          return (
            <div key={i} style={{ flex: 1, textAlign: "center", position: "relative" }}>
              {/* connector line */}
              {i < 3 && (
                <div style={{
                  position: "absolute", top: 28, left: "50%", width: "100%", height: 4,
                  background: isComplete
                    ? `linear-gradient(90deg, ${STAGES[i].color}, ${STAGES[i + 1].color})`
                    : C.gray200,
                  zIndex: 0, borderRadius: 2,
                }} />
              )}

              {/* stage bubble */}
              <div style={{
                width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                background: isActive ? s.color : isComplete ? s.color : C.gray100,
                color: isActive || isComplete ? C.white : C.gray400,
                border: isActive ? `3px solid ${s.color}` : "none",
                boxShadow: isActive ? `0 0 0 6px ${s.color}33` : "none",
                position: "relative", zIndex: 1, transition: "all 0.3s",
              }}>
                {isComplete ? <CheckCircle size={24} /> : s.icon}
              </div>

              <h4 style={{ fontSize: 15, fontWeight: 700, color: isActive ? s.color : isComplete ? C.navy : C.gray400 }}>
                {s.name}
              </h4>
              <p style={{ fontSize: 12, color: C.gray400, maxWidth: 160, margin: "4px auto 0" }}>
                {s.desc}
              </p>

              {/* progress % for active stage */}
              {isActive && pct > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: s.color }}>
                  {pct}% done
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Tasks card */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            📋 Stage {currentStage} Tasks: {currentStageDef.name}
          </h3>

          {currentStageDef.tasks.map((task, i) => {
            const done = taskCompletion[i];
            return (
              <div key={i} onClick={() => handleTaskToggle(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  background: done ? "#E2F0E6" : i === 0 && !anyTaskDone ? C.goldLight : C.offWhite,
                  borderRadius: 10, marginBottom: 8, fontSize: 13, cursor: "pointer",
                  border: `1px solid ${done ? "#BBF7D0" : "transparent"}`,
                  transition: "all 0.15s",
                }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                  background: done ? C.teal : i === 0 && !anyTaskDone ? C.gold : C.gray200,
                }}>
                  {done
                    ? <CheckCircle size={16} color={C.white} />
                    : i === 0 && !anyTaskDone
                      ? <Play size={14} color={C.white} />
                      : <span style={{ fontSize: 12, fontWeight: 700, color: C.gray400 }}>{i + 1}</span>
                  }
                </div>
                <span style={{
                  fontWeight: done ? 400 : i === 0 && !anyTaskDone ? 600 : 400,
                  color: done ? C.tealDark : i === 0 && !anyTaskDone ? C.navy : C.gray600,
                  textDecoration: done ? "line-through" : "none",
                  flex: 1,
                }}>
                  {task}
                </span>
                {done && <CheckCircle size={14} color={C.teal} />}
              </div>
            );
          })}

          {/* Quiz shortcut */}
          {ev && (
            <button onClick={() => navigate(`/events/${ev.id}/quiz`)}
              style={{
                width: "100%", marginTop: 16, padding: "12px", borderRadius: 10, border: "none",
                background: currentStageDef.color, color: C.white, fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
              Start Next Quiz →
            </button>
          )}

          {/* Advance stage button */}
          {currentStage < 4 && IS_PRODUCTION && (
            <button
              onClick={handleAdvanceStage}
              disabled={!allTasksDone || updating}
              style={{
                width: "100%", marginTop: 10, padding: "11px 12px", borderRadius: 10,
                border: `2px solid ${allTasksDone ? STAGES[currentStage].color : C.gray200}`,
                background: "transparent",
                color: allTasksDone ? STAGES[currentStage].color : C.gray400,
                fontSize: 13, fontWeight: 700, cursor: allTasksDone ? "pointer" : "not-allowed",
                fontFamily: "inherit", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8, transition: "all 0.15s",
              }}>
              {updating
                ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
                : <><ArrowRight size={14} /> Move to Stage {currentStage + 1}: {STAGES[currentStage].name}</>
              }
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </button>
          )}

          {currentStage < 4 && !IS_PRODUCTION && (
            <p style={{ marginTop: 12, fontSize: 12, color: C.gray400, textAlign: "center" }}>
              Complete quizzes to advance your stage automatically.
            </p>
          )}
        </div>

        {/* Priority topics card */}
        {ev && (
          <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🎯 Priority Topics</h3>

            {IS_PRODUCTION && (mastery || []).length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: C.gray600, fontSize: 14 }}>
                <p style={{ marginBottom: 8 }}>No mastery data yet.</p>
                <p style={{ fontSize: 12, color: C.gray400 }}>
                  Take quizzes to see which topics need the most work.
                </p>
              </div>
            ) : (
              sortedTopics.map((m, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                  borderBottom: i < sortedTopics.length - 1 ? `1px solid ${C.gray100}` : "none",
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
                    background: i < 3 ? "#FEF2F2" : i < 5 ? C.goldLight : "#E2F0E6",
                    color: i < 3 ? C.coral : i < 5 ? "#A0522D" : C.tealDark,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{m?.topic}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* mini progress bar */}
                    <div style={{ width: 48, height: 5, background: C.gray100, borderRadius: 100 }}>
                      <div style={{
                        height: "100%", borderRadius: 100,
                        width: `${m?.score ?? 0}%`,
                        background: (m?.score ?? 0) >= 80 ? C.teal : (m?.score ?? 0) >= 60 ? C.gold : C.coral,
                      }} />
                    </div>
                    <span style={{
                      fontSize: 13, fontWeight: 700, minWidth: 36, textAlign: "right",
                      color: (m?.score ?? 0) >= 80 ? C.tealDark : (m?.score ?? 0) >= 60 ? C.gold : C.coral,
                    }}>
                      {m?.score ?? 0}%
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* Stage-specific advice */}
            {sortedTopics.length > 0 && (
              <div style={{
                marginTop: 16, padding: "12px 14px", background: C.offWhite,
                borderRadius: 10, fontSize: 12, color: C.gray600, lineHeight: 1.6,
              }}>
                <strong style={{ color: currentStageDef.color }}>
                  Stage {currentStage} focus:
                </strong>{" "}
                {currentStage === 1 && "Aim for 50%+ on every topic before moving on."}
                {currentStage === 2 && `Focus on ${sortedTopics.slice(0, 3).map(t => t.topic).join(", ")}.`}
                {currentStage === 3 && "Push your top topics above 85% for state-level depth."}
                {currentStage === 4 && "Maintain all topics above 80% through competition day."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
