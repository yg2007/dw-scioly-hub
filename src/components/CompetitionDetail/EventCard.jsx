import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { C } from "../../ui";
import { IS_PRODUCTION } from "../../lib/featureFlags";
import { TEAM_COLORS } from "./constants";
import TeamColumn from "./TeamColumn";
import ScoreInput from "./ScoreInput";

export default function EventCard({
  event,
  expanded,
  onToggle,
  assignments,
  availableStudents,
  onAssignStudent,
  onRemoveStudent,
  scores,
  onSaveScore,
  isSaving,
  // students prop received but not directly used — greenStudents/whiteStudents derived locally
  getStudentName,
  getStudentInitials,
  getStudentColor,
  getTeamSize,
}) {
  const [greenScore, setGreenScore] = useState("");
  const [greenPlacement, setGreenPlacement] = useState("");
  const [whiteScore, setWhiteScore] = useState("");
  const [whitePlacement, setWhitePlacement] = useState("");

  // Initialize scores from state when expanding
  useEffect(() => {
    if (expanded) {
      const greenKey = `${event.id}-green`;
      const whiteKey = `${event.id}-white`;
      const greenData = scores[greenKey];
      const whiteData = scores[whiteKey];

      setGreenScore(greenData?.score ? String(greenData.score) : "");
      setGreenPlacement(
        greenData?.placement ? String(greenData.placement) : ""
      );
      setWhiteScore(whiteData?.score ? String(whiteData.score) : "");
      setWhitePlacement(
        whiteData?.placement ? String(whiteData.placement) : ""
      );
    }
  }, [expanded, event.id, scores]);

  const greenStudents = useMemo(() => Object.entries(assignments)
    .filter(([, team]) => team === "green")
    .map(([studentId]) => IS_PRODUCTION ? studentId : parseInt(studentId, 10)), [assignments]);

  const whiteStudents = useMemo(() => Object.entries(assignments)
    .filter(([, team]) => team === "white")
    .map(([studentId]) => IS_PRODUCTION ? studentId : parseInt(studentId, 10)), [assignments]);

  const teamSize = getTeamSize(event?.id);
  const greenFull = greenStudents.length >= teamSize;
  const whiteFull = whiteStudents.length >= teamSize;

  return (
    <div
      style={{
        border: `1px solid ${C.gray200}`,
        borderRadius: 14,
        overflow: "hidden",
        background: C.white,
      }}
    >
      {/* ─── EVENT HEADER / TOGGLE ─── */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "16px 20px",
          background: C.offWhite,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 14,
          fontFamily: "inherit",
          fontWeight: 600,
          color: C.navy,
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = C.gray100)}
        onMouseLeave={(e) => (e.currentTarget.style.background = C.offWhite)}
      >
        {expanded ? (
          <ChevronUp size={18} color={C.tealDark} />
        ) : (
          <ChevronDown size={18} color={C.tealDark} />
        )}
        <span style={{ fontSize: 18 }}>{event?.icon || "🔬"}</span>
        <span style={{ flex: 1, textAlign: "left" }}>{event?.name}</span>
        <span
          style={{
            fontSize: 12,
            color: C.gray400,
            fontWeight: 500,
          }}
        >
          🟢 {greenStudents.length} ⚪ {whiteStudents.length}
          {" assigned"}
        </span>
      </button>

      {/* ─── EXPANDED CONTENT ─── */}
      {expanded && (
        <div style={{ padding: "20px", borderTop: `1px solid ${C.gray200}` }}>
          {/* ─── TEAM ASSIGNMENT SECTION ─── */}
          <div style={{ marginBottom: 28 }}>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.gray600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 14,
              }}
            >
              Team Assignments (Team Size: {teamSize})
            </h3>

            {/* TEAMS SIDE BY SIDE */}
            <div
              className="team-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {/* GREEN TEAM */}
              <TeamColumn
                team="green"
                students={greenStudents}
                full={greenFull}
                teamSize={teamSize}
                getStudentName={getStudentName}
                getStudentInitials={getStudentInitials}
                getStudentColor={getStudentColor}
                onRemove={onRemoveStudent}
              />

              {/* WHITE TEAM */}
              <TeamColumn
                team="white"
                students={whiteStudents}
                full={whiteFull}
                teamSize={teamSize}
                getStudentName={getStudentName}
                getStudentInitials={getStudentInitials}
                getStudentColor={getStudentColor}
                onRemove={onRemoveStudent}
              />
            </div>

            {/* AVAILABLE STUDENTS */}
            {availableStudents.length > 0 && (
              <div
                style={{
                  padding: 14,
                  background: C.gray100,
                  borderRadius: 10,
                  border: `1px solid ${C.gray200}`,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.gray600,
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Available Students ({availableStudents.length})
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {availableStudents.map((studentId) => (
                    <div
                      key={studentId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        background: C.white,
                        borderRadius: 8,
                        border: `1px solid ${C.gray200}`,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: getStudentColor(studentId),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: C.white,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {getStudentInitials(studentId)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {getStudentName(studentId)}
                      </span>
                      <button
                        onClick={() => onAssignStudent(studentId, "green")}
                        disabled={greenFull}
                        style={{
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          border: "none",
                          borderRadius: 6,
                          background: greenFull ? C.gray200 : "#4CAF50",
                          color: greenFull ? C.gray600 : C.white,
                          cursor: greenFull ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (!greenFull) e.currentTarget.style.background = TEAM_COLORS.green.accent;
                        }}
                        onMouseLeave={(e) => {
                          if (!greenFull) e.currentTarget.style.background = "#4CAF50";
                        }}
                      >
                        {TEAM_COLORS.green.icon} Green
                      </button>
                      <button
                        onClick={() => onAssignStudent(studentId, "white")}
                        disabled={whiteFull}
                        style={{
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          border: "none",
                          borderRadius: 6,
                          background: whiteFull ? C.gray200 : "#9E9E9E",
                          color: whiteFull ? C.gray600 : C.white,
                          cursor: whiteFull ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (!whiteFull) e.currentTarget.style.background = TEAM_COLORS.white.accent;
                        }}
                        onMouseLeave={(e) => {
                          if (!whiteFull) e.currentTarget.style.background = "#9E9E9E";
                        }}
                      >
                        {TEAM_COLORS.white.icon} White
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── SCORE ENTRY SECTION ─── */}
          <div>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.gray600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 14,
              }}
            >
              Score Entry
            </h3>

            <div
              className="score-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {/* GREEN TEAM SCORES */}
              <ScoreInput
                team="green"
                score={greenScore}
                onScoreChange={setGreenScore}
                placement={greenPlacement}
                onPlacementChange={setGreenPlacement}
                isSaving={isSaving}
                onSave={() => onSaveScore("green", greenScore, greenPlacement)}
                students={greenStudents.length}
              />

              {/* WHITE TEAM SCORES */}
              <ScoreInput
                team="white"
                score={whiteScore}
                onScoreChange={setWhiteScore}
                placement={whitePlacement}
                onPlacementChange={setWhitePlacement}
                isSaving={isSaving}
                onSave={() => onSaveScore("white", whiteScore, whitePlacement)}
                students={whiteStudents.length}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
