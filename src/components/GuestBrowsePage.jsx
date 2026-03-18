import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, CartesianGrid, Legend, Cell } from 'recharts';
import { ArrowLeft, BookOpen, GraduationCap, LogOut } from 'lucide-react';
import { C, TROJAN_SVG, TYPE_COLORS } from '../ui';
import { EVENTS } from '../data/mockData';

export default function GuestBrowsePage({ onSignIn }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const typeColors = { study: { bg: C.goldLight, text: "#A0522D", label: "Study" }, lab: { bg: "#E2F0E6", text: C.tealDark, label: "Lab / Process" }, build: { bg: "#F5E2DC", text: C.coral, label: "Build" } };
  const filtered = filterType === "all" ? EVENTS : EVENTS.filter(e => e.type === filterType);

  return (
    <div style={{ minHeight: "100vh", background: C.offWhite, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Top Bar */}
      <div style={{ background: C.navy, padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {TROJAN_SVG(22)}
          <span style={{ color: C.gold, fontWeight: 800, fontSize: 17, letterSpacing: -0.5 }}>DW SciOly Hub</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>·</span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Browsing as Guest</span>
        </div>
        <button onClick={onSignIn}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8,
            border: `1px solid ${C.gold}`, background: "transparent", color: C.gold,
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          <LogOut size={14} /> Sign In
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 36px" }}>
        {/* Header */}
        {!selectedEvent && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.tealDark, textTransform: "uppercase", letterSpacing: 1.5 }}>Daniel Wright Junior High School</span>
              <span style={{ fontSize: 12, color: C.gray400 }}>·</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>🏆 14× State Champions</span>
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6, color: C.navy }}>
              Science Olympiad Division B — All Events
            </h1>
            <p style={{ color: C.gray600, fontSize: 15, marginBottom: 28, maxWidth: 700 }}>
              Browse all 23 competitive events and 3 trial events for the 2025–2026 season. Sign in to access personalized study plans, quizzes, and team features.
            </p>

            {/* Stats Bar */}
            <div style={{ display: "flex", gap: 14, marginBottom: 28 }}>
              {[
                { label: "Total Events", value: "23 + 3 Trial", color: C.navy },
                { label: "Study Events", value: EVENTS.filter(e => e.type === "study").length, color: "#A0522D" },
                { label: "Lab / Process", value: EVENTS.filter(e => e.type === "lab").length, color: C.tealDark },
                { label: "Build Events", value: EVENTS.filter(e => e.type === "build").length, color: C.coral },
              ].map((s, i) => (
                <div key={i} style={{ background: C.white, borderRadius: 12, padding: "14px 20px", border: `1px solid ${C.gray200}`, flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {[
                { id: "all", label: "All Events", count: EVENTS.length },
                { id: "study", label: "Study", count: EVENTS.filter(e => e.type === "study").length },
                { id: "lab", label: "Lab / Process", count: EVENTS.filter(e => e.type === "lab").length },
                { id: "build", label: "Build", count: EVENTS.filter(e => e.type === "build").length },
              ].map(f => (
                <button key={f.id} onClick={() => setFilterType(f.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100,
                    border: filterType === f.id ? "none" : `1px solid ${C.gray200}`,
                    background: filterType === f.id ? C.navy : C.white,
                    color: filterType === f.id ? C.white : C.gray600,
                    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {f.label}
                  <span style={{ background: filterType === f.id ? "rgba(255,255,255,0.2)" : C.gray100,
                    color: filterType === f.id ? C.white : C.gray400,
                    padding: "1px 7px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{f.count}</span>
                </button>
              ))}
            </div>

            {/* Event Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {filtered.map(ev => {
                const tc = typeColors[ev.type];
                return (
                  <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                    style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}`,
                      cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <span style={{ fontSize: 32 }}>{ev.icon}</span>
                      <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700,
                        textTransform: "uppercase", background: tc.bg, color: tc.text }}>{tc.label}</span>
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: C.navy }}>{ev.name}</h3>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: C.gray400, marginBottom: 14 }}>
                      <span>Team of {ev.teamSize}</span>
                      <span>·</span>
                      <span>{ev.topics.length} topics</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {ev.topics.slice(0, 4).map(t => (
                        <span key={t} style={{ padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                          background: C.gray100, color: C.gray600 }}>{t}</span>
                      ))}
                      {ev.topics.length > 4 && (
                        <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: C.gray100, color: C.gray400 }}>+{ev.topics.length - 4} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Event Detail View (Guest) */}
        {selectedEvent && (
          <div>
            <button onClick={() => setSelectedEvent(null)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                color: C.gray400, fontSize: 13, cursor: "pointer", marginBottom: 20, fontFamily: "inherit" }}>
              <ArrowLeft size={14} /> Back to All Events
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 32 }}>
              <span style={{ fontSize: 52 }}>{selectedEvent.icon}</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>{selectedEvent.name}</h2>
                  <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700,
                    textTransform: "uppercase", background: typeColors[selectedEvent.type].bg, color: typeColors[selectedEvent.type].text }}>
                    {typeColors[selectedEvent.type].label}
                  </span>
                </div>
                <p style={{ color: C.gray600, fontSize: 14 }}>
                  Team of {selectedEvent.teamSize} · {selectedEvent.topics.length} topics · Division B 2025–2026
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
              {/* Topics List */}
              <div style={{ background: C.white, borderRadius: 16, padding: 28, border: `1px solid ${C.gray200}` }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                  <BookOpen size={16} color={C.teal} /> Topics Covered
                </h3>
                {selectedEvent.topics.map((topic, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    background: i % 2 === 0 ? C.offWhite : "transparent", borderRadius: 8, marginBottom: 2 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
                      background: C.gray100, color: C.gray600 }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: C.navy }}>{topic}</span>
                  </div>
                ))}
              </div>

              {/* Event Info Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    📋 Event Details
                  </h3>
                  {[
                    { label: "Event Type", value: typeColors[selectedEvent.type].label },
                    { label: "Team Size", value: `Up to ${selectedEvent.teamSize} members` },
                    { label: "Number of Topics", value: selectedEvent.topics.length },
                    { label: "Season", value: "2025–2026" },
                    { label: "Division", value: "B (Middle School)" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0",
                      borderBottom: i < 4 ? `1px solid ${C.gray100}` : "none", fontSize: 13 }}>
                      <span style={{ color: C.gray400 }}>{item.label}</span>
                      <span style={{ fontWeight: 600, color: C.navy }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {selectedEvent.type === "study" && (
                  <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      📝 What to Expect
                    </h3>
                    <p style={{ fontSize: 13, color: C.gray600, lineHeight: 1.7 }}>
                      This is a <strong>study/test event</strong>. Teams will answer questions on the topics listed. Expect a written exam covering factual recall, application, and analysis.
                      Each team may bring a collection of notes and resources. High score wins.
                    </p>
                  </div>
                )}
                {selectedEvent.type === "lab" && (
                  <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      🧪 What to Expect
                    </h3>
                    <p style={{ fontSize: 13, color: C.gray600, lineHeight: 1.7 }}>
                      This is a <strong>lab/process event</strong> combining written knowledge with hands-on tasks.
                      Teams may need to perform measurements, run experiments, analyze evidence, or demonstrate practical skills.
                      {selectedEvent.id === 4 && " Codebusters includes timed cryptanalysis — speed and accuracy both count."}
                      {selectedEvent.id === 8 && " Crime Busters involves identifying unknown substances, analyzing physical evidence, and writing crime scene analysis."}
                      {selectedEvent.id === 17 && " Experimental Design requires teams to design and conduct an experiment from scratch during the event."}
                    </p>
                  </div>
                )}
                {selectedEvent.type === "build" && (
                  <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      🏗️ What to Expect
                    </h3>
                    <p style={{ fontSize: 13, color: C.gray600, lineHeight: 1.7 }}>
                      This is a <strong>build event</strong>. Teams construct a device before the competition and test it at the tournament.
                      Scoring typically involves performance metrics (load, time, accuracy) and may include a design knowledge test.
                      {selectedEvent.id === 12 && " Boomilever is scored on efficiency — load held divided by structure mass. Lighter structures that hold more weight win."}
                      {selectedEvent.id === 13 && " Helicopter scoring is based on total flight time. Longer sustained flight wins."}
                      {selectedEvent.id === 16 && " Scrambler must travel a set distance and stop accurately, with the egg intact. Distance accuracy and egg safety are critical."}
                      {selectedEvent.id === 15 && " Mission Possible involves a Rube Goldberg-style device with a required sequence of energy transfers."}
                      {selectedEvent.id === 14 && " Hovercraft must navigate a track as quickly and accurately as possible."}
                    </p>
                  </div>
                )}

                {/* Sign-in CTA */}
                <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`, borderRadius: 16, padding: 24, color: C.white }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: C.gold }}>🔓 Want more?</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 16 }}>
                    Sign in to access adaptive quizzes, AI-powered study paths, test upload analysis, partner synergy tracking, and coach dashboards.
                  </p>
                  <button onClick={onSignIn}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 8,
                      border: "none", background: C.gold, color: C.navy,
                      fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    <GraduationCap size={15} /> Sign In to Get Started
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
