import { EVENTS } from "../../data/mockData";

export const BUILD_EVENTS = (EVENTS || []).filter(e => e?.type === "build");

export const INITIAL_BUILD_RUNS = {
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

export const BUILD_DESIGN_IMAGES = {
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
export function generateBuildDiagnostics(eventId, runs) {
  if (!runs || (runs || []).length < 2) return { issues: [], suggestions: [], trend: "insufficient" };

  const _eventName = (EVENTS || []).find(e => e?.id === eventId)?.name || "Build Event"; // reserved for future diagnostic messages
  const issues = [];
  const suggestions = [];

  if (eventId === 12) { // Boomilever
    const _avgEfficiency = (runs || []).reduce((s, r) => s + (r?.efficiency || 0), 0) / (runs || []).length;
    const hasCracking = (runs || []).some(r => r?.tags?.includes("crack") || r?.tags?.includes("joint-failure"));
    const hasBuckling = (runs || []).some(r => r?.tags?.includes("buckling"));
    const tooHeavy = (runs || []).filter(r => (r?.mass || 0) > 16).length > (runs || []).length / 2;
    const bestEfficiency = Math.max(...(runs || []).map(r => r?.efficiency || 0));
    const worstEfficiency = Math.min(...(runs || []).map(r => r?.efficiency || 0));

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
      issues.push({ severity: "medium", area: "Excessive Mass", detail: `${(runs || []).filter(r => (r?.mass || 0) > 16).length} of ${(runs || []).length} builds exceeded 16g. Higher mass directly reduces your efficiency score.`, icon: "🟡" });
      suggestions.push("Target 12-14g for optimal efficiency. Remove material from low-stress areas — the middle sections of tension members can often be thinner.");
    }
    if (bestEfficiency > 0) {
      issues.push({ severity: "info", area: "Efficiency Trend", detail: `Best efficiency: ${bestEfficiency.toFixed(1)} (Load/Mass). Your range is ${worstEfficiency.toFixed(1)} to ${bestEfficiency.toFixed(1)}.`, icon: "📊" });
      suggestions.push(`Top state-level teams achieve 700+ efficiency. You're at ${bestEfficiency.toFixed(1)} — focus on reducing mass while maintaining the load capacity of your v3 design.`);
    }
  }

  else if (eventId === 13) { // Helicopter
    const times = (runs || []).map(r => r?.flightTime || 0);
    const bestTime = Math.max(...times);
    const hasWobble = (runs || []).some(r => r?.tags?.includes("wobble") || r?.tags?.includes("off-course"));
    const hasBalanceIssue = (runs || []).some(r => r?.tags?.includes("balance"));
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
