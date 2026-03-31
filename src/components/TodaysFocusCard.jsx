/**
 * TodaysFocusCard
 *
 * Flagship student feature — surfaces the student's #1 study priority:
 * the weakest topic across all their events, with a one-click "Start Focus Quiz" button.
 *
 * Lives at the top of StudentDashboard, above the main grid.
 */
import { useNavigate } from "react-router-dom";
import { ArrowRight, Target, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { C } from "../ui";
import { useTodaysFocus } from "../hooks/useTodaysFocus";

// Topic-specific study tips — shown in the card to direct the student
const TOPIC_TIPS = {
  "Cell Biology":    "Review cell organelles, membranes, and division cycles.",
  "Genetics":        "Brush up on Punnett squares, mutations, and gene expression.",
  "Ecology":         "Focus on food webs, nutrient cycles, and population dynamics.",
  "Evolution":       "Review natural selection, speciation, and phylogenetics.",
  "Anatomy":         "Study organ systems, functions, and anatomical terminology.",
  "Chemistry":       "Practice stoichiometry, balancing equations, and periodic trends.",
  "Physics":         "Work through kinematics formulas and energy conservation problems.",
  "Earth Science":   "Review plate tectonics, rock cycles, and atmospheric layers.",
  "Astronomy":       "Focus on stellar evolution, cosmology, and solar system mechanics.",
  "Optics":          "Practice ray diagrams, lens equations, and index of refraction.",
  "Thermodynamics":  "Review the laws of thermodynamics and heat transfer modes.",
  "Electricity":     "Practice Ohm's Law, circuit analysis, and capacitance.",
  "Waves":           "Focus on wave equations, interference, and Doppler effect.",
  "Mechanics":       "Work through Newton's Laws and rotational dynamics problems.",
  "Neuroscience":    "Review neuron anatomy, action potentials, and brain regions.",
  "Biochemistry":    "Study enzyme kinetics, metabolic pathways, and macromolecules.",
  "Forensics":       "Review evidence analysis methods and chemical identification.",
  "Meteorology":     "Focus on atmospheric pressure, fronts, and cloud formation.",
  "Geology":         "Study rock identification, mineral properties, and geological time.",
  "Paleontology":    "Review fossil formation, cladistics, and key geological eras.",
};

function getStudyTip(topic) {
  if (!topic) return "Take a quiz to identify your weakest areas and get personalized focus.";
  // Exact match first
  if (TOPIC_TIPS[topic]) return TOPIC_TIPS[topic];
  // Partial match
  for (const [key, tip] of Object.entries(TOPIC_TIPS)) {
    if (topic.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(topic.toLowerCase())) {
      return tip;
    }
  }
  return `Review core concepts in ${topic} and practice applying them to problems.`;
}

function MasteryBar({ score }) {
  const color = score >= 80 ? C.teal : score >= 60 ? C.gold : C.coral;
  return (
    <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.2)", borderRadius: 100, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${score}%`, borderRadius: 100,
        background: color, transition: "width 0.6s ease",
      }} />
    </div>
  );
}

function TrendIcon({ trend }) {
  if (trend === "up") return <TrendingUp size={13} color={C.teal} />;
  if (trend === "down") return <TrendingDown size={13} color={C.coral} />;
  return <Minus size={13} color="rgba(255,255,255,0.4)" />;
}

export default function TodaysFocusCard({ user }) {
  const navigate = useNavigate();
  const { focus, loading } = useTodaysFocus(user);

  if (loading) {
    return (
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%)`,
        borderRadius: 16, padding: "22px 26px", marginBottom: 24,
        border: `1px solid rgba(255,255,255,0.08)`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Target size={18} color="rgba(255,255,255,0.3)" />
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Finding your focus…</div>
      </div>
    );
  }

  if (!focus) return null;

  const tip = getStudyTip(focus.topic);
  const quizUrl = focus.topic
    ? `/events/${focus.eventId}/quiz?topic=${encodeURIComponent(focus.topic)}`
    : `/events/${focus.eventId}/quiz`;

  const scoreColor = focus.score !== null
    ? (focus.score >= 80 ? C.teal : focus.score >= 60 ? C.gold : C.coral)
    : "rgba(255,255,255,0.5)";

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.navy} 0%, #0d2340 60%, #152b1e 100%)`,
      borderRadius: 16, padding: "22px 26px", marginBottom: 24,
      border: `1px solid rgba(255,255,255,0.1)`,
      boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative glow */}
      <div style={{
        position: "absolute", top: -40, right: -40, width: 180, height: 180,
        borderRadius: "50%", background: `radial-gradient(circle, ${C.gold}22 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        {/* Left: label + content */}
        <div style={{ flex: 1, minWidth: 200 }}>
          {/* Header badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{
              background: `${C.gold}22`, border: `1px solid ${C.gold}44`,
              borderRadius: 20, padding: "3px 10px",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <Target size={11} color={C.gold} />
              <span style={{ fontSize: 10, fontWeight: 800, color: C.gold, letterSpacing: 1, textTransform: "uppercase" }}>
                Today's Focus
              </span>
            </div>
          </div>

          {/* Event + topic */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>{focus.eventIcon}</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.white, lineHeight: 1.2 }}>
                {focus.topic || focus.eventName}
              </div>
              {focus.topic && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
                  {focus.eventName}
                  {focus.subtopic && <span> · {focus.subtopic}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Mastery score + bar */}
          {focus.score !== null ? (
            <div style={{ marginTop: 12, maxWidth: 280 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor }}>{focus.score}%</span>
                  <TrendIcon trend={focus.trend} />
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                  {focus.score < 60 ? "Needs Work" : focus.score < 80 ? "Getting There" : "Strong"}
                </span>
              </div>
              <MasteryBar score={focus.score} />
            </div>
          ) : (
            <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
              No quiz data yet — start below to establish your baseline.
            </div>
          )}

          {/* Study tip */}
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 10, lineHeight: 1.6, maxWidth: 400 }}>
            💡 {tip}
          </p>
        </div>

        {/* Right: CTA button */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, justifyContent: "center" }}>
          <button
            onClick={() => navigate(quizUrl)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: C.gold, color: C.navy,
              border: "none", borderRadius: 12,
              padding: "13px 20px", cursor: "pointer",
              fontSize: 13, fontWeight: 800, fontFamily: "inherit",
              whiteSpace: "nowrap",
              boxShadow: `0 4px 16px ${C.gold}44`,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 20px ${C.gold}55`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 4px 16px ${C.gold}44`; }}
          >
            Start Focus Quiz
            <ArrowRight size={14} />
          </button>

          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "right" }}>
            10 targeted questions · ~5 min
          </div>
        </div>
      </div>
    </div>
  );
}
