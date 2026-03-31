import { X } from "lucide-react";
import { C } from "../../ui";
import { TEAM_COLORS } from "./constants";

export default function TeamColumn({
  team,
  students,
  // full prop received but visual slot-full indicator not yet implemented
  teamSize,
  getStudentName,
  getStudentInitials,
  getStudentColor,
  onRemove,
}) {
  const colors = TEAM_COLORS[team];

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
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{colors.icon}</span>
        <span>{team === "green" ? "Green" : "White"} Team</span>
        <span style={{ fontSize: 11, color: C.gray600 }}>
          ({students.length}/{teamSize})
        </span>
      </div>

      {students.length === 0 ? (
        <div
          style={{
            fontSize: 12,
            color: C.gray400,
            fontStyle: "italic",
            padding: "8px 0",
          }}
        >
          No students assigned
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {students.map((studentId) => (
            <div
              key={studentId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px",
                background: C.white,
                borderRadius: 6,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: getStudentColor(studentId),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: C.white,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {getStudentInitials(studentId)}
              </div>
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 500,
                  color: C.navy,
                }}
              >
                {getStudentName(studentId)}
              </span>
              <button
                onClick={() => onRemove(studentId)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: C.coral,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(184, 66, 51, 0.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
