import { Loader2, Save } from "lucide-react";
import { C } from "../../ui";
import { TEAM_COLORS } from "./constants";

export default function ScoreInput({
  team,
  score,
  onScoreChange,
  placement,
  onPlacementChange,
  isSaving,
  onSave,
  students,
}) {
  const colors = TEAM_COLORS[team];
  const inputStyle = {
    display: "block",
    width: "100%",
    padding: "12px 14px",
    border: `1px solid ${C.gray200}`,
    borderRadius: 8,
    fontSize: 16,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    minHeight: 44, // touch-friendly min height
  };

  return (
    <div
      style={{
        padding: 14,
        background: colors.bg,
        borderRadius: 10,
        border: `2px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: colors.accent,
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{colors.icon}</span>
        <span>{team === "green" ? "Green" : "White"} Team</span>
      </div>

      {students === 0 ? (
        <div
          style={{
            fontSize: 12,
            color: C.gray400,
            fontStyle: "italic",
            padding: "8px 0",
          }}
        >
          No students on this team
        </div>
      ) : (
        <>
          <label
            style={{
              display: "block",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.gray600,
                display: "block",
                marginBottom: 4,
              }}
            >
              Score
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={score}
              onChange={(e) => onScoreChange(e.target.value)}
              placeholder="e.g. 125"
              style={inputStyle}
            />
          </label>

          <label
            style={{
              display: "block",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.gray600,
                display: "block",
                marginBottom: 4,
              }}
            >
              Placement
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={placement}
              onChange={(e) => onPlacementChange(e.target.value)}
              placeholder="e.g. 1"
              style={inputStyle}
            />
          </label>

          <button
            onClick={onSave}
            disabled={isSaving || (!score && !placement)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 8,
              minHeight: 44,
              border: "none",
              background:
                isSaving || (!score && !placement)
                  ? C.gray200
                  : colors.accent,
              color: C.white,
              fontSize: 12,
              fontWeight: 700,
              cursor: isSaving || (!score && !placement) ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!isSaving && (score || placement)) {
                e.currentTarget.style.opacity = "0.9";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {isSaving ? (
              <>
                <Loader2
                  size={12}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                <span>Saving...</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </>
            ) : (
              <>
                <Save size={12} />
                <span>Save Score</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
