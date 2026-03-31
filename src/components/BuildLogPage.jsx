import { useState, useMemo, useEffect, useCallback } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Brain, Camera, ChevronDown, ChevronUp, Image, Plus, Timer, Wrench, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { C } from '../ui';
import { EVENTS } from '../data/mockData';
import { IS_PRODUCTION } from '../lib/featureFlags';
import { useEvents } from '../hooks/useEvents';
import { useAppContext } from '../lib/AppContext';
import { useCurrentEvent } from '../hooks/useCurrentEvent';
import { useBuildLogs } from '../hooks/useBuildLogs';
import { SkeletonDashboard } from './shared/Skeleton';
import { BUILD_EVENTS, INITIAL_BUILD_RUNS, BUILD_DESIGN_IMAGES, generateBuildDiagnostics } from './BuildLogPage/mockData';

// ─── Convert a DB build_entry row → the flat "run" shape the UI expects ──────
function entryToRun(entry) {
  const m = entry.measurements || {};
  return {
    id: entry.id,
    date: entry.entry_date,
    notes: entry.notes,
    tags: entry.tags || [],
    imageCount: (entry.photo_paths || []).length,
    // spread all event-specific measurement fields stored in JSONB
    ...m,
  };
}

export default function BuildLogPage() {
  const navigate = useNavigate();
  const { currentUser: user } = useAppContext();
  const { event } = useCurrentEvent();
  const { events: prodEvents } = useEvents();
  const displayEvents = IS_PRODUCTION && prodEvents?.length > 0 ? prodEvents : EVENTS;
  const buildEventsDisplay = displayEvents.filter(e => e.type === "build");
  const buildEvents = buildEventsDisplay.filter(e => (user?.events || []).includes(e.id));

  const [selectedBuildEvent, setSelectedBuildEvent] = useState(event?.type === "build" ? event : buildEvents[0]);
  // Mock-mode only state — in production all run data comes from the hook
  const [mockRuns, setMockRuns] = useState(IS_PRODUCTION ? {} : INITIAL_BUILD_RUNS);
  const [showAddRun, setShowAddRun] = useState(false);
  const [showAddImage, setShowAddImage] = useState(false);
  const [activeTab, setActiveTab] = useState("runs"); // runs | images | diagnostics
  const [expandedRun, setExpandedRun] = useState(null);
  const [newRun, setNewRun] = useState({});
  const [savingRun, setSavingRun] = useState(false);

  // ── Production: real data via useBuildLogs ──────────────────────────────
  // Always call the hook; enabled: false in prototype mode (userId / eventId = null)
  const {
    logs,
    entries,
    loading: logsLoading,
    entriesLoading,
    createLog,
    addEntry,
  } = useBuildLogs(
    IS_PRODUCTION ? user?.id : null,
    IS_PRODUCTION ? selectedBuildEvent?.id : null
  );

  // Auto-create one build log per event the first time a user visits
  useEffect(() => {
    if (!IS_PRODUCTION || !user?.id || !selectedBuildEvent?.id) return;
    if (!logsLoading && logs.length === 0) {
      createLog(`${selectedBuildEvent.name} Log`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logsLoading, logs.length, user?.id, selectedBuildEvent?.id]);

  // The one log for this event (we keep it simple: one log per user+event)
  const activeLogId = logs?.[0]?.id ?? null;

  // Stable entry→run converter
  const toRuns = useCallback((entryList) => entryList.map(entryToRun), []);

  // currentRuns: real entries in production, mock state in prototype
  const currentRuns = useMemo(() => {
    if (IS_PRODUCTION) return toRuns(entries);
    return mockRuns[selectedBuildEvent?.id] || [];
  }, [entries, mockRuns, selectedBuildEvent?.id, toRuns]);

  const currentImages = BUILD_DESIGN_IMAGES[selectedBuildEvent?.id] || [];
  const diagnostics = useMemo(() => generateBuildDiagnostics(selectedBuildEvent?.id, currentRuns), [selectedBuildEvent?.id, currentRuns]);

  // ── Per-event metric helpers ────────────────────────────────────────────
  const getMetricLabel = (evId) => {
    const labels = { 12: "Efficiency", 13: "Flight Time", 14: "Run Time", 15: "Completion", 16: "Accuracy" };
    return labels[evId] || "Score";
  };
  const getMetricValue = (run, evId) => {
    if (evId === 12) return run.efficiency?.toFixed(1) || "—";
    if (evId === 13) return (run.flightTime?.toFixed(2) + "s") || "—";
    if (evId === 14) return (run.runTime?.toFixed(2) + "s") || "—";
    if (evId === 15) return `${run.actionsCompleted || 0}/${run.totalActions || 10}`;
    if (evId === 16) return `${Math.abs((run.targetDistance || 0) - (run.actualDistance || 0))}cm off`;
    return "—";
  };
  const getPrimaryMetric = (run, evId) => {
    if (evId === 12) return run.efficiency || 0;
    if (evId === 13) return run.flightTime || 0;
    if (evId === 14) return 10 - (run.runTime || 10);
    if (evId === 15) return ((run.actionsCompleted || 0) / (run.totalActions || 10)) * 100;
    if (evId === 16) return 100 - Math.abs((run.targetDistance || 0) - (run.actualDistance || 0));
    return 0;
  };

  // Chart data
  const chartData = useMemo(() => [...currentRuns].reverse().map((run, i) => ({
    run: `#${i + 1}`,
    date: run.date?.slice(5) || "",
    value: getPrimaryMetric(run, selectedBuildEvent?.id),
    ...(selectedBuildEvent?.id === 12 ? { efficiency: run.efficiency, mass: run.mass, load: run.loadHeld / 100 } : {}),
    ...(selectedBuildEvent?.id === 13 ? { flightTime: run.flightTime, mass: run.mass } : {}),
    ...(selectedBuildEvent?.id === 14 ? { runTime: run.runTime, accuracy: run.accuracy } : {}),
    ...(selectedBuildEvent?.id === 15 ? { actions: ((run.actionsCompleted || 0) / (run.totalActions || 10)) * 100, completionTime: run.completionTime } : {}),
    ...(selectedBuildEvent?.id === 16 ? { error: Math.abs((run.targetDistance || 0) - (run.actualDistance || 0)), time: run.runTime } : {}),
  })), [currentRuns, selectedBuildEvent?.id]);

  // ── Save a new practice run ─────────────────────────────────────────────
  const addNewRun = async () => {
    const evId = selectedBuildEvent?.id;

    // Build the measurements object — all event-specific fields go here so
    // they can be stored in the JSONB column and spread back on read.
    const measurements = { designVersion: newRun.designVersion || "v1" };
    if (evId === 12) {
      const mass = parseFloat(newRun.mass) || 0;
      const loadHeld = parseFloat(newRun.loadHeld) || 0;
      Object.assign(measurements, {
        mass, loadHeld,
        efficiency: mass > 0 ? loadHeld / mass : 0,
        contactDepth: parseFloat(newRun.contactDepth) || 0,
      });
    } else if (evId === 13) {
      Object.assign(measurements, {
        flightTime: parseFloat(newRun.flightTime) || 0,
        mass: parseFloat(newRun.mass) || 0,
      });
    } else if (evId === 14) {
      Object.assign(measurements, {
        runTime: parseFloat(newRun.runTime) || 0,
        distance: parseFloat(newRun.distance) || 8.0,
        accuracy: parseFloat(newRun.accuracy) || 0,
      });
    } else if (evId === 15) {
      Object.assign(measurements, {
        completionTime: parseFloat(newRun.completionTime) || 0,
        actionsCompleted: parseInt(newRun.actionsCompleted) || 0,
        totalActions: parseInt(newRun.totalActions) || 10,
      });
    } else if (evId === 16) {
      Object.assign(measurements, {
        runTime: parseFloat(newRun.runTime) || 0,
        targetDistance: parseFloat(newRun.targetDistance) || 750,
        actualDistance: parseFloat(newRun.actualDistance) || 0,
        eggIntact: newRun.eggIntact !== "false",
      });
    }

    const tags = newRun.tags ? newRun.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    const notes = newRun.notes || "";

    if (IS_PRODUCTION) {
      if (!activeLogId) return; // log not created yet — shouldn't happen
      setSavingRun(true);
      try {
        await addEntry(activeLogId, { notes, measurements, tags });
      } finally {
        setSavingRun(false);
      }
    } else {
      // Prototype: push into local state
      const existingRuns = mockRuns[evId] || [];
      const newId = Math.max(0, ...existingRuns.map(r => r.id)) + 1;
      const baseRun = {
        id: newId,
        date: new Date().toISOString().slice(0, 10),
        notes,
        tags,
        imageCount: 0,
        ...measurements,
      };
      setMockRuns(prev => ({ ...prev, [evId]: [baseRun, ...(prev[evId] || [])] }));
    }

    setNewRun({});
    setShowAddRun(false);
  };

  // ── Empty-event guard ───────────────────────────────────────────────────
  if (buildEvents.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Wrench size={48} color={C.gray200} style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: C.navy }}>No Build Events Assigned</h2>
        <p style={{ color: C.gray400, fontSize: 14 }}>You don't have any build events. The Build Log is for Boomilever, Helicopter, Hovercraft, Mission Possible, and Scrambler.</p>
        <button onClick={() => navigate("/events")}
          style={{ marginTop: 16, padding: "10px 20px", borderRadius: 8, border: "none", background: C.teal, color: C.white, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
          Browse Events
        </button>
      </div>
    );
  }

  // ── Production loading skeleton ─────────────────────────────────────────
  if (IS_PRODUCTION && (logsLoading || entriesLoading)) {
    return <SkeletonDashboard stats={2} rows={5} style={{ padding: "4px 0" }} />;
  }

  const isSaving = savingRun;

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
        <Wrench size={24} color={C.coral} /> Build Event Log
      </h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 24 }}>
        Track practice runs, upload design photos, and get AI diagnostics on your build events.
      </p>

      {/* Event Selector */}
      {buildEvents.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {buildEvents.map(ev => (
            <button key={ev.id} onClick={() => { setSelectedBuildEvent(ev); setShowAddRun(false); setExpandedRun(null); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10,
                border: selectedBuildEvent?.id === ev.id ? `2px solid ${C.coral}` : `1px solid ${C.gray200}`,
                background: selectedBuildEvent?.id === ev.id ? "#F5E2DC" : C.white,
                color: selectedBuildEvent?.id === ev.id ? C.coral : C.navy,
                fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ fontSize: 18 }}>{ev.icon}</span>
              {ev.name}
              {currentRuns.length > 0 && selectedBuildEvent?.id === ev.id && (
                <span style={{ background: C.coral, color: C.white, fontSize: 11, fontWeight: 700,
                  padding: "2px 7px", borderRadius: 100 }}>{currentRuns.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedBuildEvent && (
        <>
          {/* Tab Bar */}
          <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `2px solid ${C.gray200}` }}>
            {[
              { id: "runs", label: "Practice Runs", icon: <Timer size={15} />, count: currentRuns.length },
              { id: "images", label: "Design Photos", icon: <Camera size={15} />, count: currentImages.length },
              { id: "diagnostics", label: "AI Diagnostics", icon: <Brain size={15} />, count: diagnostics.issues.length },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 20px",
                  border: "none", borderBottom: activeTab === tab.id ? `3px solid ${C.coral}` : "3px solid transparent",
                  background: "transparent", color: activeTab === tab.id ? C.coral : C.gray400,
                  fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: -2 }}>
                {tab.icon} {tab.label}
                {tab.count > 0 && (
                  <span style={{ background: activeTab === tab.id ? C.coral : C.gray200,
                    color: activeTab === tab.id ? C.white : C.gray600,
                    fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 100 }}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* ─── PRACTICE RUNS TAB ─── */}
          {activeTab === "runs" && (
            <div>
              {/* Chart */}
              {currentRuns.length >= 2 && (
                <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}`, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                    📈 {getMetricLabel(selectedBuildEvent.id)} Over Time
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.gray100} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      {selectedBuildEvent.id === 12 && <>
                        <Line type="monotone" dataKey="efficiency" stroke={C.coral} strokeWidth={2.5} name="Efficiency" dot={{ fill: C.coral, r: 4 }} />
                        <Line type="monotone" dataKey="mass" stroke={C.gold} strokeWidth={1.5} strokeDasharray="4 4" name="Mass (g)" dot={{ fill: C.gold, r: 3 }} />
                      </>}
                      {selectedBuildEvent.id === 13 && <>
                        <Line type="monotone" dataKey="flightTime" stroke={C.coral} strokeWidth={2.5} name="Flight Time (s)" dot={{ fill: C.coral, r: 4 }} />
                        <Line type="monotone" dataKey="mass" stroke={C.gold} strokeWidth={1.5} strokeDasharray="4 4" name="Mass (g)" dot={{ fill: C.gold, r: 3 }} />
                      </>}
                      {selectedBuildEvent.id === 14 && <>
                        <Line type="monotone" dataKey="runTime" stroke={C.coral} strokeWidth={2.5} name="Run Time (s)" dot={{ fill: C.coral, r: 4 }} />
                        <Line type="monotone" dataKey="accuracy" stroke={C.teal} strokeWidth={1.5} strokeDasharray="4 4" name="Accuracy (%)" dot={{ fill: C.teal, r: 3 }} />
                      </>}
                      {selectedBuildEvent.id === 15 && <>
                        <Line type="monotone" dataKey="actions" stroke={C.coral} strokeWidth={2.5} name="Completion (%)" dot={{ fill: C.coral, r: 4 }} />
                        <Line type="monotone" dataKey="completionTime" stroke={C.gold} strokeWidth={1.5} strokeDasharray="4 4" name="Time (s)" dot={{ fill: C.gold, r: 3 }} />
                      </>}
                      {selectedBuildEvent.id === 16 && <>
                        <Line type="monotone" dataKey="error" stroke={C.coral} strokeWidth={2.5} name="Distance Error (cm)" dot={{ fill: C.coral, r: 4 }} />
                        <Line type="monotone" dataKey="time" stroke={C.teal} strokeWidth={1.5} strokeDasharray="4 4" name="Run Time (s)" dot={{ fill: C.teal, r: 3 }} />
                      </>}
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Add Run Button */}
              <button onClick={() => setShowAddRun(!showAddRun)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px",
                  borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: showAddRun ? C.gray200 : C.coral, color: showAddRun ? C.navy : C.white,
                  fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                {showAddRun ? <XCircle size={16} /> : <Plus size={16} />}
                {showAddRun ? "Cancel" : "Log New Practice Run"}
              </button>

              {/* Add Run Form */}
              {showAddRun && (
                <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `2px solid ${C.coral}`, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: C.coral }}>
                    ✏️ Log Practice Run — {selectedBuildEvent.icon} {selectedBuildEvent.name}
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                    {selectedBuildEvent.id === 12 && <>
                      <FormField label="Structure Mass (g)" value={newRun.mass} onChange={v => setNewRun({...newRun, mass: v})} placeholder="e.g. 14.2" />
                      <FormField label="Load Held (g)" value={newRun.loadHeld} onChange={v => setNewRun({...newRun, loadHeld: v})} placeholder="e.g. 8500" />
                      <FormField label="Contact Depth (cm)" value={newRun.contactDepth} onChange={v => setNewRun({...newRun, contactDepth: v})} placeholder="10, 15, or 20" />
                    </>}
                    {selectedBuildEvent.id === 13 && <>
                      <FormField label="Flight Time (seconds)" value={newRun.flightTime} onChange={v => setNewRun({...newRun, flightTime: v})} placeholder="e.g. 8.42" />
                      <FormField label="Mass (g)" value={newRun.mass} onChange={v => setNewRun({...newRun, mass: v})} placeholder="e.g. 3.2" />
                    </>}
                    {selectedBuildEvent.id === 14 && <>
                      <FormField label="Run Time (seconds)" value={newRun.runTime} onChange={v => setNewRun({...newRun, runTime: v})} placeholder="e.g. 4.32" />
                      <FormField label="Distance (m)" value={newRun.distance} onChange={v => setNewRun({...newRun, distance: v})} placeholder="e.g. 8.0" />
                      <FormField label="Accuracy (%)" value={newRun.accuracy} onChange={v => setNewRun({...newRun, accuracy: v})} placeholder="e.g. 92" />
                    </>}
                    {selectedBuildEvent.id === 15 && <>
                      <FormField label="Completion Time (s)" value={newRun.completionTime} onChange={v => setNewRun({...newRun, completionTime: v})} placeholder="e.g. 62" />
                      <FormField label="Actions Completed" value={newRun.actionsCompleted} onChange={v => setNewRun({...newRun, actionsCompleted: v})} placeholder="e.g. 8" />
                      <FormField label="Total Actions" value={newRun.totalActions} onChange={v => setNewRun({...newRun, totalActions: v})} placeholder="e.g. 10" />
                    </>}
                    {selectedBuildEvent.id === 16 && <>
                      <FormField label="Run Time (seconds)" value={newRun.runTime} onChange={v => setNewRun({...newRun, runTime: v})} placeholder="e.g. 2.84" />
                      <FormField label="Target Distance (cm)" value={newRun.targetDistance} onChange={v => setNewRun({...newRun, targetDistance: v})} placeholder="e.g. 750" />
                      <FormField label="Actual Distance (cm)" value={newRun.actualDistance} onChange={v => setNewRun({...newRun, actualDistance: v})} placeholder="e.g. 738" />
                    </>}
                    <FormField label="Design Version" value={newRun.designVersion} onChange={v => setNewRun({...newRun, designVersion: v})} placeholder="e.g. v3" />
                    <FormField label="Tags (comma-separated)" value={newRun.tags} onChange={v => setNewRun({...newRun, tags: v})} placeholder="e.g. crack, heavy" />
                    {selectedBuildEvent.id === 16 && (
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: C.gray600 }}>Egg Intact?</label>
                        <select value={newRun.eggIntact || "true"} onChange={e => setNewRun({...newRun, eggIntact: e.target.value})}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.gray200}`,
                            fontSize: 14, fontFamily: "inherit", background: C.white }}>
                          <option value="true">✅ Yes</option>
                          <option value="false">❌ No — Cracked</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: C.gray600 }}>Notes</label>
                    <textarea value={newRun.notes || ""} onChange={e => setNewRun({...newRun, notes: e.target.value})}
                      placeholder="Describe what happened during this practice run..."
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.gray200}`,
                        fontSize: 14, fontFamily: "inherit", minHeight: 70, resize: "vertical" }} />
                  </div>
                  <button onClick={addNewRun} disabled={isSaving}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, border: "none",
                      background: isSaving ? C.gray200 : C.coral,
                      color: isSaving ? C.gray400 : C.white,
                      fontSize: 14, fontWeight: 700, cursor: isSaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                    {isSaving && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
                    {isSaving ? "Saving…" : "Save Practice Run"}
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </button>
                </div>
              )}

              {/* Run List */}
              {currentRuns.map((run, idx) => (
                <div key={run.id} style={{ background: C.white, borderRadius: 14, padding: 0,
                  border: `1px solid ${C.gray200}`, marginBottom: 10, overflow: "hidden" }}>
                  {/* Run Header */}
                  <div onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: "pointer" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10,
                      background: idx === 0 ? "#F5E2DC" : C.gray100,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 800, color: idx === 0 ? C.coral : C.gray400 }}>
                      #{currentRuns.length - idx}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{run.date} · {run.designVersion}</div>
                      <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>
                        {run.notes?.slice(0, 80)}{(run.notes?.length || 0) > 80 ? "..." : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginRight: 8 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>{getMetricValue(run, selectedBuildEvent.id)}</div>
                      <div style={{ fontSize: 11, color: C.gray400 }}>{getMetricLabel(selectedBuildEvent.id)}</div>
                    </div>
                    {run.tags?.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 120 }}>
                        {run.tags.slice(0, 2).map(tag => (
                          <span key={tag} style={{ padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 600,
                            background: tag.includes("crack") || tag.includes("fail") || tag.includes("break") || tag.includes("egg-crack") ? "#FEF2F2" :
                              tag.includes("best") || tag.includes("stable") || tag.includes("accurate") || tag.includes("complete") ? "#E2F0E6" : C.goldLight,
                            color: tag.includes("crack") || tag.includes("fail") || tag.includes("break") || tag.includes("egg-crack") ? C.coral :
                              tag.includes("best") || tag.includes("stable") || tag.includes("accurate") || tag.includes("complete") ? C.tealDark : "#A0522D" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {expandedRun === run.id ? <ChevronUp size={16} color={C.gray400} /> : <ChevronDown size={16} color={C.gray400} />}
                  </div>

                  {/* Expanded Details */}
                  {expandedRun === run.id && (
                    <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.gray100}` }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 16, marginBottom: 14 }}>
                        {selectedBuildEvent.id === 12 && <>
                          <MiniStat label="Mass" value={`${run.mass}g`} />
                          <MiniStat label="Load Held" value={`${run.loadHeld}g`} />
                          <MiniStat label="Efficiency" value={run.efficiency?.toFixed(1)} highlight />
                          <MiniStat label="Contact Depth" value={`${run.contactDepth}cm`} />
                        </>}
                        {selectedBuildEvent.id === 13 && <>
                          <MiniStat label="Flight Time" value={`${run.flightTime}s`} highlight />
                          <MiniStat label="Mass" value={`${run.mass}g`} />
                        </>}
                        {selectedBuildEvent.id === 14 && <>
                          <MiniStat label="Run Time" value={`${run.runTime}s`} />
                          <MiniStat label="Distance" value={`${run.distance}m`} />
                          <MiniStat label="Accuracy" value={`${run.accuracy}%`} highlight />
                        </>}
                        {selectedBuildEvent.id === 15 && <>
                          <MiniStat label="Time" value={`${run.completionTime}s`} />
                          <MiniStat label="Actions" value={`${run.actionsCompleted}/${run.totalActions}`} highlight />
                        </>}
                        {selectedBuildEvent.id === 16 && <>
                          <MiniStat label="Run Time" value={`${run.runTime}s`} />
                          <MiniStat label="Target" value={`${run.targetDistance}cm`} />
                          <MiniStat label="Actual" value={`${run.actualDistance}cm`} />
                          <MiniStat label="Error" value={`${Math.abs(run.targetDistance - run.actualDistance)}cm`} highlight />
                          <MiniStat label="Egg" value={run.eggIntact ? "✅ Safe" : "❌ Cracked"} />
                        </>}
                      </div>
                      <div style={{ padding: "12px 14px", background: C.offWhite, borderRadius: 10, fontSize: 13, color: C.gray600 }}>
                        <strong style={{ color: C.navy }}>Notes:</strong> {run.notes}
                      </div>
                      {run.imageCount > 0 && (
                        <div style={{ marginTop: 10, fontSize: 12, color: C.teal, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                          <Camera size={14} /> {run.imageCount} photo{run.imageCount > 1 ? "s" : ""} attached
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {currentRuns.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: C.gray400 }}>
                  <Timer size={32} color={C.gray200} style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 14 }}>No build runs logged yet. Click &quot;Log New Practice Run&quot; to start tracking.</p>
                </div>
              )}
            </div>
          )}

          {/* ─── DESIGN IMAGES TAB ─── */}
          {activeTab === "images" && (
            <div>
              <button onClick={() => setShowAddImage(!showAddImage)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px",
                  borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: showAddImage ? C.gray200 : C.navy, color: showAddImage ? C.navy : C.white,
                  fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
                {showAddImage ? <XCircle size={16} /> : <Camera size={16} />}
                {showAddImage ? "Cancel" : "Upload Design Photo"}
              </button>

              {showAddImage && (
                <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `2px solid ${C.navy}`, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📸 Upload Design Photo</h3>
                  <div style={{ border: `2px dashed ${C.gray200}`, borderRadius: 14, padding: "36px 20px",
                    textAlign: "center", marginBottom: 16, cursor: "pointer", background: C.offWhite }}
                    onClick={() => setShowAddImage(false)}>
                    <Image size={32} color={C.gray400} style={{ marginBottom: 10 }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Click to upload photo</p>
                    <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>JPG, PNG — Take a photo of your build, design sketch, or test results</p>
                  </div>
                  <p style={{ fontSize: 12, color: C.gray400, padding: "8px 12px", background: C.goldLight, borderRadius: 8 }}>
                    <strong style={{ color: C.gold }}>Tip:</strong> Include multiple angles (side, top, detail of joints/mechanisms) for better AI analysis.
                  </p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
                {currentImages.map(img => (
                  <div key={img.id} style={{ background: C.white, borderRadius: 14, overflow: "hidden",
                    border: `1px solid ${C.gray200}` }}>
                    <div style={{ height: 160, background: `linear-gradient(135deg, ${C.gray100}, ${C.gray200})`,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <Camera size={28} color={C.gray400} />
                        <p style={{ fontSize: 11, color: C.gray400, marginTop: 6 }}>{img.version}</p>
                      </div>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{img.name}</h4>
                      <p style={{ fontSize: 12, color: C.gray600, lineHeight: 1.5 }}>{img.description}</p>
                      <p style={{ fontSize: 11, color: C.gray400, marginTop: 6 }}>{img.date}</p>
                    </div>
                  </div>
                ))}
              </div>

              {currentImages.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: C.gray400 }}>
                  <Camera size={32} color={C.gray200} style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 14 }}>No design photos uploaded yet. Photos help the AI analyze your build.</p>
                </div>
              )}
            </div>
          )}

          {/* ─── AI DIAGNOSTICS TAB ─── */}
          {activeTab === "diagnostics" && (
            <div>
              {diagnostics.issues.length === 0 && diagnostics.suggestions.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, background: C.white, borderRadius: 16, border: `1px solid ${C.gray200}` }}>
                  <Brain size={40} color={C.gray200} style={{ marginBottom: 12 }} />
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Not Enough Data Yet</h3>
                  <p style={{ color: C.gray400, fontSize: 14 }}>
                    Log at least 2 practice runs to activate AI diagnostics. The more data you provide, the better the analysis.
                  </p>
                </div>
              ) : (
                <>
                  {/* Issues */}
                  {diagnostics.issues.length > 0 && (
                    <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}`, marginBottom: 20 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                        🤖 AI-Detected Issues
                      </h3>
                      {diagnostics.issues.map((issue, i) => (
                        <div key={i} style={{ display: "flex", gap: 14, padding: "16px 18px",
                          background: issue.severity === "high" ? "#FEF2F2" : issue.severity === "medium" ? C.goldLight : C.offWhite,
                          borderRadius: 12, marginBottom: 10,
                          border: `1px solid ${issue.severity === "high" ? "#FECACA" : issue.severity === "medium" ? "#FDE68A" : C.gray200}` }}>
                          <span style={{ fontSize: 20, flexShrink: 0 }}>{issue.icon}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4,
                              color: issue.severity === "high" ? C.coral : issue.severity === "medium" ? "#A0522D" : C.navy }}>
                              {issue.area}
                            </div>
                            <p style={{ fontSize: 13, color: C.gray600, lineHeight: 1.6 }}>{issue.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggestions */}
                  {diagnostics.suggestions.length > 0 && (
                    <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                        💡 Recommendations
                      </h3>
                      {diagnostics.suggestions.map((sug, i) => (
                        <div key={i} style={{ display: "flex", gap: 12, padding: "14px 16px",
                          background: i === 0 ? C.goldLight : C.offWhite, borderRadius: 10, marginBottom: 8,
                          fontSize: 13, color: C.gray600, lineHeight: 1.6, alignItems: "flex-start" }}>
                          <span style={{ width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
                            background: i === 0 ? C.gold : C.gray200, color: i === 0 ? C.white : C.gray600 }}>
                            {i + 1}
                          </span>
                          {sug}
                        </div>
                      ))}

                      <div style={{ marginTop: 16, padding: "14px 16px", background: "#E2F0E6", borderRadius: 10,
                        border: "1px solid #BBF7D0", fontSize: 13, color: C.tealDark }}>
                        <strong>Pro tip:</strong> Upload photos of your build from multiple angles. In production, the AI can analyze structural geometry, identify weak points, and compare your design to proven competition-winning approaches.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Small sub-components ──────────────────────────────────────────────────────

function FormField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: C.gray600 }}>{label}</label>
      <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.gray200}`,
          fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
    </div>
  );
}

function MiniStat({ label, value, highlight }) {
  return (
    <div style={{ background: highlight ? "#F5E2DC" : C.offWhite, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: highlight ? C.coral : C.navy }}>{value}</div>
      <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{label}</div>
    </div>
  );
}
