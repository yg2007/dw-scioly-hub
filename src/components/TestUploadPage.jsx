import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, CartesianGrid, Legend, Cell } from 'recharts';
import { ArrowLeft, Upload } from 'lucide-react';
import { C } from '../ui';
import { EVENTS } from '../data/mockData';
import { IS_PRODUCTION } from '../lib/featureFlags';
import { useEvents } from '../hooks/useEvents';
import { useCurrentEvent } from '../hooks/useCurrentEvent';
import { useAppContext } from '../lib/AppContext';
import { supabase } from '../lib/supabase';

export default function TestUploadPage() {
  const navigate = useNavigate();
  const { currentUser: user } = useAppContext();
  const { event } = useCurrentEvent();
  const { events: prodEvents } = useEvents();
  const events = IS_PRODUCTION && prodEvents && prodEvents.length > 0 ? prodEvents : EVENTS;
  const fileInputRef = useRef(null);
  const answerKeyInputRef = useRef(null);

  const [step, setStep] = useState("select"); // select | uploading | analyzing | results
  const [selectedFile, setSelectedFile] = useState(null);
  const [realFile, setRealFile] = useState(null); // actual File object for production upload
  const [selectedAnswerKey, setSelectedAnswerKey] = useState(null);
  const [realAnswerKey, setRealAnswerKey] = useState(null);
  const [progress, setProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [selectedEventForUpload, setSelectedEventForUpload] = useState(event);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Max 10 MB.");
      return;
    }
    setRealFile(file);
    setSelectedFile({ name: file.name, size: `${sizeMB} MB` });
  };

  const handleAnswerKeySelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Max 10 MB.");
      return;
    }
    setRealAnswerKey(file);
    setSelectedAnswerKey({ name: file.name, size: `${sizeMB} MB` });
  };

  const startUpload = async () => {
    setStep("uploading");
    setProgress(0);

    if (IS_PRODUCTION && realFile && user?.id) {
      try {
        // Real upload to Supabase storage
        const filePath = `${user.id}/${Date.now()}_${realFile.name}`;
        setProgress(20);

        const { error: uploadErr } = await supabase.storage
          .from("test-scans")
          .upload(filePath, realFile);

        if (uploadErr) {
          throw new Error(`Storage upload failed: ${uploadErr.message}`);
        }
        setProgress(60);

        // Upload answer key if provided
        if (realAnswerKey) {
          const answerKeyPath = `${user.id}/${Date.now()}_key_${realAnswerKey.name}`;
          const { error: keyErr } = await supabase.storage.from("test-scans").upload(answerKeyPath, realAnswerKey);
          if (keyErr) console.warn("Answer key upload failed:", keyErr.message);
        }
        setProgress(80);

        // Save record in test_uploads table
        const { error: dbErr } = await supabase.from("test_uploads").insert({
          user_id: user.id,
          event_id: selectedEventForUpload.id,
          storage_path: filePath,
          file_name: realFile.name,
        });

        if (dbErr) {
          console.error("DB insert error:", dbErr);
          // Don't block — file is already uploaded
        }

        setProgress(100);
        setTimeout(() => {
          setStep("analyzing");
          simulateAnalysis();
        }, 500);
      } catch (err) {
        console.error("Upload error:", err);
        alert(err.message || "Upload failed. Check browser console for details.");
        setStep("select");
      }
    } else {
      // Prototype: simulate upload
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 15 + 5;
        if (p >= 100) {
          p = 100;
          clearInterval(interval);
          setTimeout(() => {
            setStep("analyzing");
            simulateAnalysis();
          }, 500);
        }
        setProgress(Math.min(100, Math.round(p)));
      }, 200);
    }
  };

  const simulateAnalysis = () => {
    const ev = selectedEventForUpload || events[0];
    const topics = ev?.topics || ["General"];
    let analyzed = 0;
    const interval = setInterval(() => {
      analyzed++;
      setProgress(Math.round((analyzed / topics.length) * 100));
      if (analyzed >= topics.length) {
        clearInterval(interval);
        const results = topics.map(t => {
          const score = Math.round(Math.random() * 50 + 30);
          const questionsOnTopic = Math.floor(Math.random() * 4) + 2;
          const correct = Math.round(questionsOnTopic * score / 100);
          return { topic: t, score, questionsOnTopic, correct, missed: questionsOnTopic - correct };
        });
        const overall = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
        const weakest = [...results].sort((a, b) => a.score - b.score).slice(0, 3);
        const strongest = [...results].sort((a, b) => b.score - a.score).slice(0, 3);

        setAnalysisResults({
          event: ev,
          overall,
          totalQuestions: results.reduce((s, r) => s + r.questionsOnTopic, 0),
          totalCorrect: results.reduce((s, r) => s + r.correct, 0),
          topics: results,
          weakest,
          strongest,
          recommendations: [
            `Focus on "${weakest[0]?.topic}" — your lowest area at ${weakest[0]?.score}%. Start with a targeted 10-question quiz.`,
            `Your partner should cover "${weakest[1]?.topic}" (${weakest[1]?.score}%) while you strengthen "${weakest[0]?.topic}".`,
            `Great strength in "${strongest[0]?.topic}" (${strongest[0]?.score}%) — maintain with weekly review quizzes.`,
            `Schedule a full practice test again in 2 weeks to measure improvement on weak areas.`,
          ],
          stage: overall >= 80 ? 3 : overall >= 60 ? 2 : 1,
          stageLabel: overall >= 80 ? "Refine" : overall >= 60 ? "Specialize" : "Generalize",
        });
        setStep("results");
      }
    }, 300);
  };

  if (step === "select") {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {event && (
          <button onClick={() => navigate(`/events/${event?.id || ''}`)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
              color: C.gray400, fontSize: 13, cursor: "pointer", marginBottom: 16, fontFamily: "inherit" }}>
            <ArrowLeft size={14} /> Back to Event
          </button>
        )}

        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Upload Practice Test</h2>
        <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
          Upload a test and its answer key. Our AI will map each question to the rules topics and identify your gaps.
        </p>

        <div style={{ background: C.white, borderRadius: 20, padding: 32, border: `1px solid ${C.gray200}` }}>
          {/* Event Selector */}
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Event</label>
          <select value={selectedEventForUpload?.id || ""} onChange={e => setSelectedEventForUpload(events.find(ev => ev.id === Number(e.target.value)))}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.gray200}`,
              fontSize: 14, fontFamily: "inherit", marginBottom: 24, background: C.white, color: C.navy }}>
            <option value="">Select an event...</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.icon} {ev.name}</option>
            ))}
          </select>

          {/* Upload Zone */}
          <input type="file" ref={fileInputRef} onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png,.docx" style={{ display: "none" }} />
          <div style={{ border: `2px dashed ${C.gray200}`, borderRadius: 16, padding: "40px 20px",
            textAlign: "center", marginBottom: 16, cursor: "pointer", transition: "border-color 0.2s",
            background: selectedFile ? "#F0FDF9" : "transparent" }}
            onClick={() => fileInputRef.current?.click()}>
            <Upload size={32} color={selectedFile ? C.teal : C.gray400} style={{ marginBottom: 12 }} />
            {selectedFile ? (
              <>
                <p style={{ fontSize: 15, fontWeight: 600, color: C.tealDark }}>📄 {selectedFile.name}</p>
                <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>{selectedFile.size} — Click to change</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 15, fontWeight: 600, color: C.navy }}>Click to upload test (PDF, photo, or typed)</p>
                <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>Supports PDF, JPG, PNG, DOCX — Max 10 MB</p>
              </>
            )}
          </div>

          <input type="file" ref={answerKeyInputRef} onChange={handleAnswerKeySelect}
            accept=".pdf,.jpg,.jpeg,.png,.docx,.txt,.csv" style={{ display: "none" }} />
          <div style={{ border: `2px dashed ${C.gray200}`, borderRadius: 16, padding: "30px 20px",
            textAlign: "center", marginBottom: 24, cursor: "pointer",
            background: selectedAnswerKey ? "#F0FDF9" : "transparent" }}
            onClick={() => answerKeyInputRef.current?.click()}>
            {selectedAnswerKey ? (
              <>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.tealDark }}>📋 {selectedAnswerKey.name}</p>
                <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>{selectedAnswerKey.size} — Click to change</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>📋 Upload Answer Key (optional)</p>
                <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>
                  For best analysis, include the answer key. You can also enter answers manually.
                </p>
              </>
            )}
          </div>

          <button onClick={startUpload} disabled={!selectedEventForUpload || !selectedFile}
            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: selectedEventForUpload && selectedFile ? C.teal : C.gray200,
              color: selectedEventForUpload && selectedFile ? C.white : C.gray400,
              fontSize: 15, fontWeight: 700, cursor: selectedEventForUpload && selectedFile ? "pointer" : "default",
              fontFamily: "inherit" }}>
            🤖 Analyze with AI
          </button>
        </div>
      </div>
    );
  }

  if (step === "uploading" || step === "analyzing") {
    return (
      <div style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}>
        <div style={{ background: C.white, borderRadius: 20, padding: 48, border: `1px solid ${C.gray200}` }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{step === "uploading" ? "📤" : "🤖"}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
            {step === "uploading" ? "Uploading Test..." : "AI Analyzing Your Test..."}
          </h2>
          <p style={{ color: C.gray600, fontSize: 14, marginBottom: 24 }}>
            {step === "uploading"
              ? "Securely uploading your practice test."
              : "Mapping questions to 2026 Div B rules topics and identifying your strengths and gaps."}
          </p>
          <div style={{ height: 10, background: C.gray100, borderRadius: 100, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", borderRadius: 100, width: `${progress}%`,
              background: `linear-gradient(90deg, ${C.gold}, ${C.teal})`, transition: "width 0.3s ease" }} />
          </div>
          <p style={{ fontSize: 13, color: C.gray400 }}>{progress}% complete</p>
          {step === "analyzing" && (
            <div style={{ marginTop: 20, padding: "10px 16px", background: C.goldLight, borderRadius: 8, fontSize: 12, color: C.gray600 }}>
              Identifying topic coverage... Calculating mastery scores... Generating recommendations...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === "results" && analysisResults) {
    const r = analysisResults;
    const barData = r.topics.map(t => ({
      name: t.topic.length > 15 ? t.topic.slice(0, 13) + "…" : t.topic,
      score: t.score,
      fill: t.score >= 80 ? C.teal : t.score >= 60 ? C.gold : C.coral,
    }));

    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>📊 AI Analysis Results</h2>
        <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
          {r.event.icon} {r.event.name} — Practice test analyzed
        </p>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Overall Score", value: `${r.overall}%`, color: r.overall >= 80 ? C.teal : r.overall >= 60 ? C.gold : C.coral },
            { label: "Questions", value: `${r.totalCorrect}/${r.totalQuestions}`, color: C.navy },
            { label: "Learning Stage", value: r.stageLabel, color: C.gold },
            { label: "Weak Areas", value: r.weakest.length, color: C.coral },
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
              <h4 style={{ fontSize: 14, fontWeight: 700, color: C.tealDark, marginBottom: 10 }}>💪 Strengths</h4>
              {r.strongest.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                  fontSize: 13, borderBottom: i < r.strongest.length - 1 ? "1px solid #D1FAE5" : "none" }}>
                  <span>{t.topic}</span>
                  <span style={{ fontWeight: 700, color: C.tealDark }}>{t.score}%</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#FEF2F2", borderRadius: 16, padding: 20, border: "1px solid #FECACA" }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: C.coral, marginBottom: 10 }}>⚠️ Needs Work</h4>
              {r.weakest.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                  fontSize: 13, borderBottom: i < r.weakest.length - 1 ? "1px solid #FECACA" : "none" }}>
                  <span>{t.topic}</span>
                  <span style={{ fontWeight: 700, color: C.coral }}>{t.score}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}`, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            🤖 AI Study Recommendations
          </h3>
          {r.recommendations.map((rec, i) => (
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
          <button onClick={() => navigate(`/events/${r.event?.id}/studypath`)}
            style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: C.teal,
              color: C.white, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            🧠 Start AI Study Path
          </button>
          <button onClick={() => { setStep("select"); setSelectedFile(null); setRealFile(null); setSelectedAnswerKey(null); setRealAnswerKey(null); setProgress(0); setAnalysisResults(null); }}
            style={{ flex: 1, padding: "14px", borderRadius: 12, border: `2px solid ${C.gray200}`, background: C.white,
              color: C.navy, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Upload Another Test
          </button>
        </div>
      </div>
    );
  }

  return null;
}
