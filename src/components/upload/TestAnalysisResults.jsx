// ═══════════════════════════════════════════════════════════════
//  TestAnalysisResults — Extracted sub-component for AI analysis
//
//  Handles: score summary cards, topic score chart,
//  strengths/weaknesses panels, AI recommendations.
//  Extracted from TestUploadPage to reduce component size.
// ═══════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { C } from '../../ui';

export default function TestAnalysisResults({ results, onStartStudyPath, onUploadAnother }) {
  const r = results;

  // useMemo must be called before any conditional return (rules-of-hooks)
  const barData = useMemo(() => {
    if (!r) return [];
    return (r.topics || []).map(t => ({
      name: (t.topic || "").length > 15 ? t.topic.slice(0, 13) + "…" : t.topic,
      score: t.score || 0,
      fill: (t.score || 0) >= 80 ? C.teal : (t.score || 0) >= 60 ? C.gold : C.coral,
    }));
  }, [r]);

  if (!r) return null;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>AI Analysis Results</h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
        {r.event?.icon} {r.event?.name} — Practice test analyzed
      </p>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Overall Score", value: `${r.overall || 0}%`, color: (r.overall || 0) >= 80 ? C.teal : (r.overall || 0) >= 60 ? C.gold : C.coral },
          { label: "Questions", value: `${r.totalCorrect || 0}/${r.totalQuestions || 0}`, color: C.navy },
          { label: "Learning Stage", value: r.stageLabel || "—", color: C.gold },
          { label: "Weak Areas", value: (r.weakest || []).length, color: C.coral },
        ].map((s, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 14, padding: 18, border: `1px solid ${C.gray200}` }}>
            <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Topic Scores Chart */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Topic Scores</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} layout="vertical" margin={{ left: 0 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Strengths & Weaknesses */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#F0FDF9", borderRadius: 16, padding: 20, border: "1px solid #BBF7D0" }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: C.tealDark, marginBottom: 10 }}>Strengths</h4>
            {(r.strongest || []).map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                fontSize: 13, borderBottom: i < (r.strongest || []).length - 1 ? "1px solid #D1FAE5" : "none" }}>
                <span>{t?.topic}</span>
                <span style={{ fontWeight: 700, color: C.tealDark }}>{t?.score}%</span>
              </div>
            ))}
          </div>
          <div style={{ background: "#FEF2F2", borderRadius: 16, padding: 20, border: "1px solid #FECACA" }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: C.coral, marginBottom: 10 }}>Needs Work</h4>
            {(r.weakest || []).map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                fontSize: 13, borderBottom: i < (r.weakest || []).length - 1 ? "1px solid #FECACA" : "none" }}>
                <span>{t?.topic}</span>
                <span style={{ fontWeight: 700, color: C.coral }}>{t?.score}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}`, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          AI Study Recommendations
        </h3>
        {(r.recommendations || []).map((rec, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", background: i === 0 ? C.goldLight : C.offWhite,
            borderRadius: 10, marginBottom: 8, fontSize: 13, color: C.gray600, alignItems: "flex-start" }}>
            <span style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
              background: i === 0 ? C.gold : C.gray200, color: i === 0 ? C.white : C.gray600 }}>
              {i + 1}
            </span>
            {rec}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onStartStudyPath}
          style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: C.teal,
            color: C.white, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Start AI Study Path
        </button>
        <button onClick={onUploadAnother}
          style={{ flex: 1, padding: "14px", borderRadius: 12, border: `2px solid ${C.gray200}`, background: C.white,
            color: C.navy, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Upload Another Test
        </button>
      </div>
    </div>
  );
}

TestAnalysisResults.propTypes = {
  results: PropTypes.shape({
    event: PropTypes.object,
    overall: PropTypes.number,
    totalQuestions: PropTypes.number,
    totalCorrect: PropTypes.number,
    topics: PropTypes.array,
    weakest: PropTypes.array,
    strongest: PropTypes.array,
    recommendations: PropTypes.array,
    stageLabel: PropTypes.string,
  }).isRequired,
  onStartStudyPath: PropTypes.func.isRequired,
  onUploadAnother: PropTypes.func.isRequired,
};
