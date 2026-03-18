import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, CartesianGrid, Legend, Cell } from 'recharts';
import { Brain, Camera, ChevronDown, ChevronUp, Image, Plus, Timer, Wrench, XCircle } from 'lucide-react';
import { C } from '../ui';
import { EVENTS } from '../data/mockData';


const BUILD_EVENTS = EVENTS.filter(e => e.type === "build");

const INITIAL_BUILD_RUNS = {
  12: [ // Boomilever
    { id: 1, date: "2026-03-10", mass: 14.2, loadHeld: 8500, efficiency: 598.6, contactDepth: 12, notes: "Balsa cross-braced design #3. Held well but cracked at left joint under max load.", designVersion: "v3", tags: ["crack", "joint-failure"], imageCount: 2 },
    { id: 2, date: "2026-03-06", mass: 16.8, loadHeld: 7200, efficiency: 428.6, contactDepth: 15, notes: "Thicker members. Heavier but more stable. No cracking. Slow load application.", designVersion: "v3", tags: ["stable", "heavy"], imageCount: 1 },
    { id: 3, date: "2026-03-01", mass: 12.1, loadHeld: 5400, efficiency: 446.3, contactDepth: 10, notes: "Lightweight attempt. Buckled at center strut before reaching target load.", designVersion: "v2", tags: ["buckling", "lightweight"], imageCount: 1 },
    { id: 4, date: "2026-02-22", mass: 18.5, loadHeld: 9100, efficiency: 491.9, contactDepth: 15, notes: "First prototype with laminated joints. Very strong but way too heavy.", designVersion: "v1", tags: ["laminated", "heavy"], imageCount: 0 },
  ],
  13: [ // Helicopter
    { id: 1, date: "2026-03-12", flightTime: 8.42, mass: 3.2, notes: "Best flight so far! Blade angle 22° worked well. Slight wobble on descent.", designVersion: "v4", tags: ["personal-best", "wobble"], imageCount: 1 },
    { id: 2, date: "2026-03-08", flightTime: 6.87, mass: 3.5, notes: "Added counterweight. Too heavy, fell fast. Blade flex issue.", designVersion: "v3", tags: ["heavy", "blade-flex"], imageCount: 2 },
    { id: 3, date: "2026-03-03", flightTime: 7.15, mass: 2.8, notes: "Lighter build. Good float time but spins off course. Need better balance.", designVersion: "v3", tags: ["off-course", "balance"], imageCount: 0 },
    { id: 4, date: "2026-02-25", flightTime: 5.23, mass: 4.1, notes: "Prototype with paper blades. Way too heavy. Switching to balsa.", designVersion: "v2", tags: ["heavy", "prototype"], imageCount: 1 },
  ],
  14: [ // Hovercraft
    { id: 1, date: "2026-03-11", runTime: 4.32, distance: 8.0, accuracy: 92, notes: "Best accuracy yet. Skirt seal improved with tape. Slight drift left.", designVersion: "v3", tags: ["accurate", "drift"], imageCount: 1 },
    { id: 2, date: "2026-03-07", runTime: 3.89, distance: 8.0, accuracy: 78, notes: "Fast but inaccurate. Motor too powerful for fine control.", designVersion: "v2", tags: ["fast", "inaccurate"], imageCount: 0 },
    { id: 3, date: "2026-02-28", runTime: 5.67, distance: 8.0, accuracy: 85, notes: "New fan mount. Slower but more controlled. Skirt leak on right side.", designVersion: "v2", tags: ["controlled", "skirt-leak"], imageCount: 2 },
  ],
  15: [ // Mission Possible
    { id: 1, date: "2026-03-09", completionTime: 62, actionsCompleted: 8, totalActions: 10, notes: "Steps 7-8 failed. Marble didn't trigger lever. Need steeper ramp angle.", designVersion: "v2", tags: ["ramp-issue", "incomplete"], imageCount: 1 },
    { id: 2, date: "2026-03-04", completionTime: 78, actionsCompleted: 10, totalActions: 10, notes: "Full completion! But slow. Dominoes took 15 sec. Need tighter spacing.", designVersion: "v2", tags: ["complete", "slow"], imageCount: 3 },
    { id: 3, date: "2026-02-27", completionTime: 45, actionsCompleted: 6, totalActions: 10, notes: "Steps 4-10 failed. Pulley string snapped. Using stronger cord next time.", designVersion: "v1", tags: ["string-break", "incomplete"], imageCount: 0 },
  ],
  16: [ // Scrambler
    { id: 1, date: "2026-03-13", runTime: 2.84, targetDistance: 750, actualDistance: 738, eggIntact: true, notes: "Closest run yet! 12cm off target. Egg survived. Need finer braking adjustment.", designVersion: "v3", tags: ["close", "egg-safe"], imageCount: 1 },
    { id: 2, date: "2026-03-08", runTime: 2.51, targetDistance: 750, actualDistance: 692, eggIntact: false, notes: "Fast but overshot braking point. Egg cracked on rebound. Softer bumper needed.", designVersion: "v3", tags: ["egg-crack", "overshoot"], imageCount: 2 },
    { id: 3, date: "2026-03-02", runTime: 3.12, targetDistance: 750, actualDistance: 745, eggIntact: true, notes: "Very accurate! But too slow. Need more counterweight for faster acceleration.", designVersion: "v2", tags: ["accurate", "slow"], imageCount: 0 },
  ],
};

const BUILD_DESIGN_IMAGES = {
  12: [
    { id: 1, name: "Boomilever v3 — Side View", date: "2026-03-10", description: "Cross-braced design with reinforced joints. Note the 45° angle members.", version: "v3" },
    { id: 2, name: "Joint Detail — Epoxy Application", date: "2026-03-09", description: "Close-up of laminated joint with epoxy. 3 layers of balsa.", version: "v3" },
    { id: 3, name: "Boomilever v2 — Failed Center Strut", date: "2026-03-01", description: "Post-test photo showing buckling at center strut.", version: "v2" },
  ],
  13: [
    { id: 1, name: "Helicopter v4 — Blade Assembly", date: "2026-03-12", description: "22° blade angle with balsa blades. Lighter assembly.", version: "v4" },
    { id: 2, name: "Counterweight Test Setup", date: "2026-03-08", description: "Testing different counterweight positions.", version: "v3" },
  ],
  16: [
    { id: 1, name: "Scrambler v3 — Braking System", date: "2026-03-13", description: "Adjustable brake arm with rubber contact pad.", version: "v3" },
    { id: 2, name: "Egg Cradle Close-up", date: "2026-03-08", description: "Foam-lined cradle. Cracked on this run — adding more padding.", version: "v3" },
  ],
};

// AI Diagnostics Engine for Build Events
function generateBuildDiagnostics(eventId, runs) {
  if (!runs || runs.length < 2) return { issues: [], suggestions: [], trend: "insufficient" };

  const eventName = EVENTS.find(e => e.id === eventId)?.name || "Build Event";
  const issues = [];
  const suggestions = [];

  if (eventId === 12) { // Boomilever
    const avgEfficiency = runs.reduce((s, r) => s + (r.efficiency || 0), 0) / runs.length;
    const hasCracking = runs.some(r => r.tags?.includes("crack") || r.tags?.includes("joint-failure"));
    const hasBuckling = runs.some(r => r.tags?.includes("buckling"));
    const tooHeavy = runs.filter(r => r.mass > 16).length > runs.length / 2;
    const bestEfficiency = Math.max(...runs.map(r => r.efficiency || 0));
    const worstEfficiency = Math.min(...runs.map(r => r.efficiency || 0));

    if (hasCracking) {
      issues.push({ severity: "high", area: "Joint Integrity", detail: "Cracking detected at joints under load. This suggests the adhesive bond or wood grain orientation isn't distributing stress evenly.", icon: "🔴" });
      suggestions.push("Apply epoxy in thin, even layers and clamp joints for at least 4 hours. Consider adding small gusset plates (triangular reinforcements) at critical joints.");
      suggestions.push("Check wood grain direction — grain should run along the length of each member for maximum tensile strength. Cross-grain pieces are prone to splitting.");
    }
    if (hasBuckling) {
      issues.push({ severity: "high", area: "Member Buckling", detail: "Center strut buckling indicates the member is too slender for the compressive load. The slenderness ratio is likely too high.", icon: "🔴" });
      suggestions.push("Increase cross-section of compression members (struts) or add lateral bracing. For balsa, a 2:1 width-to-thickness ratio helps resist buckling.");
      suggestions.push("Consider laminating two thinner strips together — this creates a stronger composite section than a single piece of the same total thickness.");
    }
    if (tooHeavy) {
      issues.push({ severity: "medium", area: "Excessive Mass", detail: `${runs.filter(r => r.mass > 16).length} of ${runs.length} builds exceeded 16g. Higher mass directly reduces your efficiency score.`, icon: "🟡" });
      suggestions.push("Target 12-14g for optimal efficiency. Remove material from low-stress areas — the middle sections of tension members can often be thinner.");
    }
    if (bestEfficiency > 0) {
      issues.push({ severity: "info", area: "Efficiency Trend", detail: `Best efficiency: ${bestEfficiency.toFixed(1)} (Load/Mass). Your range is ${worstEfficiency.toFixed(1)} to ${bestEfficiency.toFixed(1)}.`, icon: "📊" });
      suggestions.push(`Top state-level teams achieve 700+ efficiency. You're at ${bestEfficiency.toFixed(1)} — focus on reducing mass while maintaining the load capacity of your v3 design.`);
    }
  }

  else if (eventId === 13) { // Helicopter
    const times = runs.map(r => r.flightTime || 0);
    const bestTime = Math.max(...times);
    const hasWobble = runs.some(r => r.tags?.includes("wobble") || r.tags?.includes("off-course"));
    const hasBalanceIssue = runs.some(r => r.tags?.includes("balance"));
    const hasBladeFlex = runs.some(r => r.tags?.includes("blade-flex"));
    const improving = times.length >= 2 && times[0] > times[times.length - 1];

    if (hasWobble || hasBalanceIssue) {
      issues.push({ severity: "high", area: "Flight Stability", detail: "Wobble and off-course behavior indicate a center-of-gravity imbalance or inconsistent blade geometry.", icon: "🔴" });
      suggestions.push("Ensure all blades are identical in weight and angle. Even 0.5° difference between blades causes wobble. Use a protractor jig for consistent blade angles.");
      suggestions.push("Check the center shaft is perfectly vertical. A bent or angled shaft creates asymmetric lift and drift.");
    }
    if (hasBladeFlex) {
      issues.push({ severity: "medium", area: "Blade Rigidity", detail: "Blade flex under rotation reduces effective lift and wastes energy. Blades should maintain their set angle during flight.", icon: "🟡" });
      suggestions.push("Stiffen blades with a thin balsa spar along the leading edge, or switch to a slightly thicker material. The blade should feel rigid when you gently push the tip.");
    }
    if (improving) {
      issues.push({ severity: "info", area: "Positive Trend", detail: `Flight times improving: ${times[times.length - 1].toFixed(2)}s → ${times[0].toFixed(2)}s. Best: ${bestTime.toFixed(2)}s.`, icon: "📈" });
    }
    suggestions.push(`State-winning helicopters typically achieve 10-14 seconds. Your best is ${bestTime.toFixed(2)}s — consider reducing total mass to under 3g and optimizing blade pitch angle between 20-25°.`);
  }

  else if (eventId === 16) { // Scrambler
    const hasEggBreak = runs.some(r => r.eggIntact === false);
    const accuracyRuns = runs.filter(r => r.targetDistance && r.actualDistance);
    const avgError = accuracyRuns.length ? accuracyRuns.reduce((s, r) => s + Math.abs(r.targetDistance - r.actualDistance), 0) / accuracyRuns.length : 0;
    const hasOvershoot = runs.some(r => r.tags?.includes("overshoot"));

    if (hasEggBreak) {
      issues.push({ severity: "high", area: "Egg Protection", detail: "Egg cracked during at least one run. This is an automatic penalty. The cradle or braking mechanism needs improvement.", icon: "🔴" });
      suggestions.push("Add more cushioning material (foam, cotton) around the egg cradle. The egg should not touch any hard surface during deceleration.");
      suggestions.push("Reduce braking force by extending the braking distance — a gentler stop over a longer distance protects the egg better than a sudden stop.");
    }
    if (hasOvershoot) {
      issues.push({ severity: "high", area: "Braking Accuracy", detail: "Vehicle overshooting the target suggests the braking mechanism engages too late or doesn't provide enough friction.", icon: "🔴" });
      suggestions.push("Calibrate brake engagement point for each target distance. Consider a string-based brake where string length = desired travel distance minus braking distance.");
    }
    if (avgError > 0) {
      issues.push({ severity: "medium", area: "Distance Accuracy", detail: `Average distance error: ${avgError.toFixed(0)}cm from target. Consistency is key for scoring.`, icon: "🟡" });
      suggestions.push(`Run at least 5 trials at each target distance and record the results. Your error of ${avgError.toFixed(0)}cm can be reduced by fine-tuning the string length for your braking system.`);
    }
  }

  else if (eventId === 14) { // Hovercraft
    const hasDrift = runs.some(r => r.tags?.includes("drift"));
    const hasSkirtLeak = runs.some(r => r.tags?.includes("skirt-leak"));

    if (hasDrift) {
      issues.push({ severity: "medium", area: "Directional Control", detail: "Vehicle drifting off course. This could be asymmetric thrust, uneven weight distribution, or a skirt leak on one side.", icon: "🟡" });
      suggestions.push("Check that the thrust fan is perfectly centered. Even 2-3mm offset creates a turning moment. Use a laser pointer or plumb bob to verify alignment.");
    }
    if (hasSkirtLeak) {
      issues.push({ severity: "high", area: "Skirt Seal", detail: "Air leaking from the skirt reduces lift and causes uneven hovering. This directly affects both speed and accuracy.", icon: "🔴" });
      suggestions.push("Reinforce skirt attachment with hot glue along the entire perimeter. Test the seal by running the lift fan with the vehicle stationary — listen for hissing and feel for air escape with your hand.");
    }
    suggestions.push("For competition tracks, practice on the same surface type (smooth gym floor vs. rough table). Hovercraft behavior changes dramatically with surface friction.");
  }

  else if (eventId === 15) { // Mission Possible
    const incompleteRuns = runs.filter(r => r.actionsCompleted < r.totalActions);
    const hasRampIssue = runs.some(r => r.tags?.includes("ramp-issue"));
    const hasStringBreak = runs.some(r => r.tags?.includes("string-break"));

    if (incompleteRuns.length > 0) {
      issues.push({ severity: "high", area: "Reliability", detail: `${incompleteRuns.length} of ${runs.length} runs failed to complete all actions. Reliability is more important than speed.`, icon: "🔴" });
      suggestions.push("Focus on 100% completion rate before optimizing for speed. Each failed action loses more points than a few extra seconds of time.");
    }
    if (hasRampIssue) {
      issues.push({ severity: "medium", area: "Ramp/Trigger Angle", detail: "Marble failed to trigger the next step — the ramp angle is likely too shallow for reliable energy transfer.", icon: "🟡" });
      suggestions.push("Increase ramp angle by 5-10° and test 10 times. The marble should trigger the next step at least 9/10 times before you consider it reliable.");
    }
    if (hasStringBreak) {
      issues.push({ severity: "high", area: "Materials Failure", detail: "String/cord broke during a run. Use stronger materials and test them under 2× the expected load.", icon: "🔴" });
      suggestions.push("Switch to braided fishing line (10lb test) instead of thread or twine. It's stronger, more consistent, and doesn't stretch.");
    }
  }

  // Generic suggestions for all build events
  if (runs.length < 5) {
    suggestions.push("You have only " + runs.length + " logged runs. Aim for at least 10 practice runs before competition to build consistency and identify patterns.");
  }

  return { issues, suggestions, trend: runs.length >= 3 ? "sufficient" : "insufficient" };
}



export default function BuildLogPage({ event, user, navigate }) {
  const buildEvents = BUILD_EVENTS.filter(e => user.events.includes(e.id));
  const [selectedBuildEvent, setSelectedBuildEvent] = useState(event?.type === "build" ? event : buildEvents[0]);
  const [runs, setRuns] = useState(INITIAL_BUILD_RUNS);
  const [showAddRun, setShowAddRun] = useState(false);
  const [showAddImage, setShowAddImage] = useState(false);
  const [activeTab, setActiveTab] = useState("runs"); // runs | images | diagnostics
  const [expandedRun, setExpandedRun] = useState(null);
  const [newRun, setNewRun] = useState({});

  const currentRuns = runs[selectedBuildEvent?.id] || [];
  const currentImages = BUILD_DESIGN_IMAGES[selectedBuildEvent?.id] || [];
  const diagnostics = generateBuildDiagnostics(selectedBuildEvent?.id, currentRuns);

  // Performance metric helpers per event type
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
  const chartData = [...currentRuns].reverse().map((run, i) => ({
    run: `#${i + 1}`,
    date: run.date?.slice(5) || "",
    value: getPrimaryMetric(run, selectedBuildEvent?.id),
    ...(selectedBuildEvent?.id === 12 ? { efficiency: run.efficiency, mass: run.mass, load: run.loadHeld / 100 } : {}),
    ...(selectedBuildEvent?.id === 13 ? { flightTime: run.flightTime, mass: run.mass } : {}),
    ...(selectedBuildEvent?.id === 14 ? { runTime: run.runTime, accuracy: run.accuracy } : {}),
    ...(selectedBuildEvent?.id === 15 ? { actions: ((run.actionsCompleted || 0) / (run.totalActions || 10)) * 100, completionTime: run.completionTime } : {}),
    ...(selectedBuildEvent?.id === 16 ? { error: Math.abs((run.targetDistance || 0) - (run.actualDistance || 0)), time: run.runTime } : {}),
  }));

  const addNewRun = () => {
    const evId = selectedBuildEvent?.id;
    const newId = Math.max(0, ...currentRuns.map(r => r.id)) + 1;
    const baseRun = {
      id: newId,
      date: new Date().toISOString().slice(0, 10),
      designVersion: newRun.designVersion || "v1",
      notes: newRun.notes || "",
      tags: newRun.tags ? newRun.tags.split(",").map(t => t.trim()) : [],
      imageCount: 0,
    };

    if (evId === 12) {
      baseRun.mass = parseFloat(newRun.mass) || 0;
      baseRun.loadHeld = parseFloat(newRun.loadHeld) || 0;
      baseRun.efficiency = baseRun.mass > 0 ? baseRun.loadHeld / baseRun.mass : 0;
      baseRun.contactDepth = parseFloat(newRun.contactDepth) || 0;
    } else if (evId === 13) {
      baseRun.flightTime = parseFloat(newRun.flightTime) || 0;
      baseRun.mass = parseFloat(newRun.mass) || 0;
    } else if (evId === 14) {
      baseRun.runTime = parseFloat(newRun.runTime) || 0;
      baseRun.distance = parseFloat(newRun.distance) || 8.0;
      baseRun.accuracy = parseFloat(newRun.accuracy) || 0;
    } else if (evId === 15) {
      baseRun.completionTime = parseFloat(newRun.completionTime) || 0;
      baseRun.actionsCompleted = parseInt(newRun.actionsCompleted) || 0;
      baseRun.totalActions = parseInt(newRun.totalActions) || 10;
    } else if (evId === 16) {
      baseRun.runTime = parseFloat(newRun.runTime) || 0;
      baseRun.targetDistance = parseFloat(newRun.targetDistance) || 750;
      baseRun.actualDistance = parseFloat(newRun.actualDistance) || 0;
      baseRun.eggIntact = newRun.eggIntact !== "false";
    }

    setRuns(prev => ({ ...prev, [evId]: [baseRun, ...(prev[evId] || [])] }));
    setNewRun({});
    setShowAddRun(false);
  };

  if (buildEvents.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Wrench size={48} color={C.gray200} style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: C.navy }}>No Build Events Assigned</h2>
        <p style={{ color: C.gray400, fontSize: 14 }}>You don't have any build events. The Build Log is for Boomilever, Helicopter, Hovercraft, Mission Possible, and Scrambler.</p>
        <button onClick={() => navigate("events")}
          style={{ marginTop: 16, padding: "10px 20px", borderRadius: 8, border: "none", background: C.teal, color: C.white, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
          Browse Events
        </button>
      </div>
    );
  }

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
                  padding: "2px 7px", borderRadius: 100 }}>{(runs[ev.id] || []).length}</span>
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
                      {selectedBuildEvent.id === 16 && <>
                        <Line type="monotone" dataKey="error" stroke={C.coral} strokeWidth={2.5} name="Distance Error (cm)" dot={{ fill: C.coral, r: 4 }} />
                        <Line type="monotone" dataKey="time" stroke={C.teal} strokeWidth={1.5} strokeDasharray="4 4" name="Run Time (s)" dot={{ fill: C.teal, r: 3 }} />
                      </>}
                      {selectedBuildEvent.id === 14 && <>
                        <Line type="monotone" dataKey="runTime" stroke={C.coral} strokeWidth={2.5} name="Run Time (s)" dot={{ fill: C.coral, r: 4 }} />
                        <Line type="monotone" dataKey="accuracy" stroke={C.teal} strokeWidth={1.5} strokeDasharray="4 4" name="Accuracy (%)" dot={{ fill: C.teal, r: 3 }} />
                      </>}
                      {selectedBuildEvent.id === 15 && <>
                        <Line type="monotone" dataKey="actions" stroke={C.coral} strokeWidth={2.5} name="Completion (%)" dot={{ fill: C.coral, r: 4 }} />
                        <Line type="monotone" dataKey="completionTime" stroke={C.gold} strokeWidth={1.5} strokeDasharray="4 4" name="Time (s)" dot={{ fill: C.gold, r: 3 }} />
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
                  <button onClick={addNewRun}
                    style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: C.coral,
                      color: C.white, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Save Practice Run
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
                  <p style={{ fontSize: 14 }}>No practice runs logged yet. Click "Log New Practice Run" to get started.</p>
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
                    {/* Placeholder for actual image */}
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
