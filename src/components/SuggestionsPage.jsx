import { useState, useMemo } from "react";
import { ChevronUp, Loader2, MessageSquarePlus, Plus, RefreshCw, Send } from "lucide-react";
import { C } from "../ui";
import { useAppContext } from "../lib/AppContext";
import { useSuggestions } from "../hooks/useSuggestions";

// ── Status config ───────────────────────────────────────
const STATUS_CONFIG = {
  new:          { label: "New",          color: "#6B7280", bg: "#F3F4F6" },
  considering:  { label: "Considering",  color: "#D97706", bg: "#FEF3C7" },
  planned:      { label: "Planned",      color: "#0D9488", bg: "#CCFBF1" },
  in_progress:  { label: "In Progress",  color: "#2563EB", bg: "#DBEAFE" },
  completed:    { label: "Completed",    color: "#16A34A", bg: "#DCFCE7" },
  declined:     { label: "Declined",     color: "#DC2626", bg: "#FEE2E2" },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

// ── Status badge ────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8,
      padding: "3px 8px", borderRadius: 4,
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.label}
    </span>
  );
}

// ── Vote button ─────────────────────────────────────────
function VoteButton({ count, voted, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 2,
        width: 52, minHeight: 56, borderRadius: 10,
        border: voted ? `2px solid ${C.teal}` : `1px solid ${C.gray200}`,
        background: voted ? "#E0F2F1" : C.white,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit", transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      <ChevronUp size={16} color={voted ? C.teal : C.gray400} strokeWidth={voted ? 3 : 2} />
      <span style={{ fontSize: 14, fontWeight: 700, color: voted ? C.teal : C.navy }}>
        {count}
      </span>
    </button>
  );
}

// ── Suggestion card ─────────────────────────────────────
function SuggestionCard({ suggestion, voted, onToggleVote, isCoach, onStatusChange }) {
  const author = suggestion.author;
  const authorName = author?.full_name || "Unknown";
  const initials = authorName.split(" ").map(n => n[0]).join("").toUpperCase();
  const timeAgo = getTimeAgo(suggestion.created_at);

  return (
    <div style={{
      display: "flex", gap: 14, padding: "16px 18px",
      background: C.white, borderRadius: 12,
      border: `1px solid ${C.gray200}`,
      transition: "box-shadow 0.15s",
    }}>
      <VoteButton count={suggestion.vote_count} voted={voted} onToggle={onToggleVote} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{suggestion.title}</span>
          <StatusBadge status={suggestion.status} />
        </div>

        {suggestion.description && (
          <p style={{ fontSize: 13, color: C.gray600, margin: "0 0 10px 0", lineHeight: 1.5 }}>
            {suggestion.description}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: C.gray400 }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            background: author?.avatar_color || C.teal,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.white, fontSize: 8, fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <span>{authorName}</span>
          <span>·</span>
          <span>{timeAgo}</span>

          {isCoach && (
            <select
              value={suggestion.status}
              onChange={(e) => onStatusChange(suggestion.id, e.target.value)}
              style={{
                marginLeft: "auto", fontSize: 11, padding: "2px 6px",
                borderRadius: 4, border: `1px solid ${C.gray200}`,
                fontFamily: "inherit", cursor: "pointer", color: C.gray600,
              }}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Time ago helper ─────────────────────────────────────
function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ═══════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════
export default function SuggestionsPage() {
  const { currentUser, userRole } = useAppContext();
  const isCoach = userRole === "coach" || userRole === "admin";
  const {
    suggestions, myVotes, loading, error,
    createSuggestion, toggleVote, updateStatus, refresh,
  } = useSuggestions(currentUser?.id);

  // ── Form state ──
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ── Filter ──
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "all") return suggestions;
    if (filter === "mine") return suggestions.filter((s) => s.author_id === currentUser?.id);
    return suggestions.filter((s) => s.status === filter);
  }, [suggestions, filter, currentUser]);

  // ── Submit handler ──
  const handleSubmit = async () => {
    if (!title.trim() || title.trim().length < 3) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createSuggestion({ title: title.trim(), description: description.trim() });
      setTitle("");
      setDescription("");
      setShowForm(false);
    } catch (err) {
      console.error("Submit suggestion:", err);
      setSubmitError("Failed to submit — please try again.");
    }
    setSubmitting(false);
  };

  // ── Vote handler ──
  const handleVote = async (id) => {
    try {
      await toggleVote(id);
    } catch (err) {
      console.error("Toggle vote:", err);
    }
  };

  // ── Counts ──
  const counts = useMemo(() => {
    const c = { all: suggestions.length, mine: 0 };
    for (const s of suggestions) {
      c[s.status] = (c[s.status] || 0) + 1;
      if (s.author_id === currentUser?.id) c.mine++;
    }
    return c;
  }, [suggestions, currentUser]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <MessageSquarePlus size={22} color={C.teal} />
            Suggestions Log
          </h2>
          <p style={{ color: C.gray600, fontSize: 14 }}>
            Share ideas, report issues, and vote on what gets built next.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={refresh} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 14px",
            background: C.white, color: C.gray600, border: `1px solid ${C.gray200}`,
            borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowForm(!showForm)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
            background: C.teal, color: C.white, border: "none",
            borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            <Plus size={14} /> New Suggestion
          </button>
        </div>
      </div>

      {/* Submit form */}
      {showForm && (
        <div style={{
          background: C.white, borderRadius: 14, padding: 20,
          border: `1px solid ${C.gray200}`, marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 12 }}>
            Submit a Suggestion
          </div>
          <input
            type="text"
            placeholder="Title — what's your idea or issue?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            style={{
              width: "100%", padding: "10px 14px", fontSize: 14,
              border: `1px solid ${C.gray200}`, borderRadius: 8,
              fontFamily: "inherit", marginBottom: 10,
              boxSizing: "border-box",
            }}
          />
          <textarea
            placeholder="Optional: describe it in more detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            style={{
              width: "100%", padding: "10px 14px", fontSize: 13,
              border: `1px solid ${C.gray200}`, borderRadius: 8,
              fontFamily: "inherit", resize: "vertical", marginBottom: 12,
              boxSizing: "border-box",
            }}
          />
          {submitError && (
            <div style={{ fontSize: 12, color: C.coral, marginBottom: 8 }}>{submitError}</div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => { setShowForm(false); setTitle(""); setDescription(""); setSubmitError(null); }}
              style={{
                padding: "8px 16px", background: C.gray100, color: C.gray600,
                border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || title.trim().length < 3}
              style={{
                padding: "8px 20px",
                background: submitting || title.trim().length < 3 ? C.gray200 : C.teal,
                color: C.white, border: "none", borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: submitting ? "default" : "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { key: "all", label: "All" },
          { key: "mine", label: "Mine" },
          { key: "new", label: "New" },
          { key: "considering", label: "Considering" },
          { key: "planned", label: "Planned" },
          { key: "in_progress", label: "In Progress" },
          { key: "completed", label: "Completed" },
        ].map((tab) => {
          const active = filter === tab.key;
          const count = counts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: "6px 14px", borderRadius: 20,
                border: active ? `1px solid ${C.teal}` : `1px solid ${C.gray200}`,
                background: active ? "#E0F2F1" : C.white,
                color: active ? C.teal : C.gray600,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: "center",
                  padding: "1px 5px", borderRadius: 10,
                  background: active ? C.teal : C.gray200,
                  color: active ? C.white : C.gray600,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: C.gray400, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 14 }}>Loading suggestions...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ padding: 20, background: "#FEE2E2", borderRadius: 10, color: "#DC2626", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div style={{
          padding: "48px 20px", textAlign: "center",
          background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💡</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>
            {filter === "all" ? "No suggestions yet" : `No ${filter === "mine" ? "suggestions from you" : filter.replace("_", " ") + " suggestions"}`}
          </div>
          <div style={{ fontSize: 13, color: C.gray400, marginBottom: 16 }}>
            {filter === "all"
              ? "Be the first! Click \"New Suggestion\" to share an idea or report an issue."
              : "Try changing the filter or submit a new suggestion."}
          </div>
          {filter === "all" && (
            <button onClick={() => setShowForm(true)} style={{
              padding: "10px 20px", background: C.teal, color: C.white,
              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Submit the First Suggestion
            </button>
          )}
        </div>
      )}

      {/* Suggestion list */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              voted={myVotes.has(s.id)}
              onToggleVote={() => handleVote(s.id)}
              isCoach={isCoach}
              onStatusChange={updateStatus}
            />
          ))}
        </div>
      )}

      {/* Footer info */}
      {!loading && suggestions.length > 0 && (
        <div style={{ textAlign: "center", padding: "20px 0 8px", fontSize: 11, color: C.gray400 }}>
          {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""} total · Vote for the ones you care about most
        </div>
      )}
    </div>
  );
}
