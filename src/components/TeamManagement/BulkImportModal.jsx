import { useState, useMemo } from "react";
import { X, Upload, AlertTriangle, Check, Loader2, Users, CheckCircle } from "lucide-react";
import { C } from "../../ui";

// ─── Event name aliases → canonical names ────────────────────
// Maps shorthand/abbreviations from the pasted data to the full
// event names stored in the database.
const EVENT_ALIASES = {
  // Direct abbreviations
  "mp": "Mission Possible",
  "dp": "Dynamic Planet",
  "r&m": "Rocks & Minerals",
  "p&p": "Potions & Poisons",
  "widi": "Write It Do It",
  "expd": "Experimental Design",
  // Common short forms
  "anatomy": "Anatomy & Physiology",
  "disease detectives": "Disease Detectives",
  "circuit lab": "Circuit Lab",
  "codebusters": "Codebusters",
  "heredity": "Heredity",
  "solar system": "Solar System",
  "rocks & minerals": "Rocks & Minerals",
  "rocks and minerals": "Rocks & Minerals",
  "crime busters": "Crime Busters",
  "crimebusters": "Crime Busters",
  "dynamic planet": "Dynamic Planet",
  "entomology": "Entomology",
  "meteorology": "Meteorology",
  "boomilever": "Boomilever",
  "helicopter": "Helicopter",
  "hovercraft": "Hovercraft",
  "mission possible": "Mission Possible",
  "scrambler": "Scrambler",
  "experimental design": "Experimental Design",
  "machines": "Machines",
  "metric mastery": "Metric Mastery",
  "potions & poisons": "Potions & Poisons",
  "potions and poisons": "Potions & Poisons",
  "water quality": "Water Quality",
  "write it do it": "Write It Do It",
  "remote sensing": "Remote Sensing",
};

/**
 * Parse a raw event string like "MP, Disease Detectives" into an array
 * of canonical event names, matching against the provided events list.
 */
function resolveEventNames(rawStr, events) {
  if (!rawStr || !rawStr.trim()) return [];
  // Split on comma, clean up
  const parts = rawStr.split(",").map(s => s.trim()).filter(Boolean);
  const resolved = [];
  for (const part of parts) {
    const clean = part.replace(/\(part time\)/gi, "").trim();
    if (!clean) continue;
    const lower = clean.toLowerCase();

    // 1. Try alias lookup
    const aliased = EVENT_ALIASES[lower];
    if (aliased) {
      const ev = events.find(e => e.name === aliased);
      if (ev) { resolved.push(ev); continue; }
    }

    // 2. Try exact match on event name (case-insensitive)
    const exact = events.find(e => e.name.toLowerCase() === lower);
    if (exact) { resolved.push(exact); continue; }

    // 3. Try partial / fuzzy match
    const partial = events.find(e =>
      e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase())
    );
    if (partial) { resolved.push(partial); continue; }

    // 4. Mark as unresolved — store the raw string
    resolved.push({ id: null, name: clean, _unresolved: true });
  }
  return resolved;
}

/**
 * Parse a single email field that may contain semicolons and/or multiple emails.
 * Returns the first valid email.
 */
function parseEmail(raw) {
  if (!raw) return "";
  // Split on semicolons or spaces, take the first one that looks like an email
  const parts = raw.split(/[;\s]+/).map(s => s.trim()).filter(Boolean);
  const email = parts.find(p => p.includes("@"));
  return email ? email.toLowerCase() : "";
}

/**
 * Determine role from name. "(Jr. Coach)" → "coach" (same DB role, but we tag the name).
 * Returns { cleanName, role, isJrCoach }
 */
function parseNameAndRole(raw) {
  if (!raw) return { cleanName: "", role: "coach", isJrCoach: false };
  const isJr = /\(Jr\.?\s*Coach\)/i.test(raw);
  const cleanName = raw
    .replace(/\(Jr\.?\s*Coach\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  // Convert "Last, First" → "First Last"
  let displayName = cleanName;
  if (cleanName.includes(",")) {
    const [last, first] = cleanName.split(",").map(s => s.trim());
    if (first && last) displayName = `${first} ${last}`;
  }
  return { cleanName: displayName, role: "coach", isJrCoach: isJr };
}

/**
 * Parse tab-delimited coach data.
 * Expected format: Name\tEmail\tEvent (with header row)
 */
function parseCoachData(text, events) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  // Skip header if present
  const startIdx = lines.length > 0 && /name/i.test(lines[0]) && /email/i.test(lines[0]) ? 1 : 0;
  const rows = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    if (cols.length < 2) continue; // need at least name + email
    const rawName = (cols[0] || "").trim();
    const rawEmail = (cols[1] || "").trim();
    const rawEvents = (cols[2] || "").trim();

    if (!rawName && !rawEmail) continue; // blank row

    const { cleanName, role, isJrCoach } = parseNameAndRole(rawName);
    const email = parseEmail(rawEmail);
    const resolvedEvents = resolveEventNames(rawEvents, events);

    if (!cleanName || !email) continue;

    rows.push({
      name: cleanName,
      email,
      role,
      isJrCoach,
      events: resolvedEvents,
      eventIds: resolvedEvents.filter(e => e.id != null).map(e => e.id),
      unresolvedEvents: resolvedEvents.filter(e => e._unresolved),
      status: "pending", // pending | adding | success | error
      error: null,
    });
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════
//  BULK IMPORT MODAL
// ═══════════════════════════════════════════════════════════════
export default function BulkImportModal({ events, onAddDirect, onClose }) {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState(null);       // parsed rows
  const [importing, setImporting] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);  // which row is being processed
  const [results, setResults] = useState([]);         // final results array
  const [done, setDone] = useState(false);

  // Parse the pasted data
  const handleParse = () => {
    const rows = parseCoachData(rawText, events);
    setParsed(rows);
  };

  // Summary stats for parsed data
  const summary = useMemo(() => {
    if (!parsed) return null;
    const jrCoaches = parsed.filter(r => r.isJrCoach).length;
    const coaches = parsed.length - jrCoaches;
    const unresolved = parsed.filter(r => r.unresolvedEvents.length > 0);
    const noEvents = parsed.filter(r => r.eventIds.length === 0);
    return { total: parsed.length, coaches, jrCoaches, unresolved, noEvents };
  }, [parsed]);

  // Run the bulk import sequentially
  const handleImport = async () => {
    if (!parsed || parsed.length === 0) return;
    setImporting(true);
    const finalResults = [];

    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i];
      setCurrentIdx(i);
      // Update row status in parsed
      setParsed(prev => prev.map((r, idx) => idx === i ? { ...r, status: "adding" } : r));

      try {
        await onAddDirect({
          fullName: row.name,
          email: row.email,
          role: row.role,
          eventIds: row.eventIds,
          _keepOpen: true, // don't close the parent modal
        });
        setParsed(prev => prev.map((r, idx) => idx === i ? { ...r, status: "success" } : r));
        finalResults.push({ ...row, status: "success" });
      } catch (err) {
        const errorMsg = err.message || "Failed";
        setParsed(prev => prev.map((r, idx) => idx === i ? { ...r, status: "error", error: errorMsg } : r));
        finalResults.push({ ...row, status: "error", error: errorMsg });
      }

      // Small delay to avoid hammering the server
      await new Promise(r => setTimeout(r, 300));
    }

    setResults(finalResults);
    setImporting(false);
    setDone(true);
  };

  const successCount = results.filter(r => r.status === "success").length;
  const errorCount = results.filter(r => r.status === "error").length;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }} onClick={onClose}>
      <div style={{
        background: C.white, borderRadius: 20, width: 720, maxHeight: "90vh",
        overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: "24px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.navy, marginBottom: 4 }}>
              Bulk Import Coaches
            </h2>
            <p style={{ fontSize: 13, color: C.gray400 }}>
              Paste a tab-delimited table with Name, Email, and Event columns.
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.gray200}`,
            background: C.white, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", color: C.gray400,
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "20px 28px 28px" }}>
          {/* Step 1: Paste data */}
          {!parsed && (
            <>
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={`Coach Name\tEmail\tEvent\nSmith, John\tjohn@email.com\tAnatomy, Circuit Lab\nDoe, Jane (Jr. Coach)\tjane@email.com;\tCodebusters`}
                style={{
                  width: "100%", minHeight: 220, padding: 14, fontSize: 13,
                  fontFamily: "monospace", border: `1px solid ${C.gray200}`,
                  borderRadius: 10, outline: "none", resize: "vertical",
                  boxSizing: "border-box", lineHeight: 1.6,
                }}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button onClick={handleParse} disabled={!rawText.trim()} style={{
                  flex: 1, padding: 14, borderRadius: 10, border: "none",
                  background: rawText.trim() ? C.gold : C.gray200, color: C.white,
                  fontSize: 14, fontWeight: 700, cursor: rawText.trim() ? "pointer" : "default",
                  fontFamily: "inherit", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8,
                }}>
                  <Upload size={16} /> Parse & Preview
                </button>
                <button onClick={onClose} style={{
                  padding: "14px 24px", borderRadius: 10, border: `1px solid ${C.gray200}`,
                  background: C.white, color: C.gray600, fontSize: 14, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* Step 2: Preview parsed data */}
          {parsed && !done && (
            <>
              {/* Summary */}
              <div style={{
                padding: "12px 16px", borderRadius: 10, background: C.offWhite,
                marginBottom: 16, fontSize: 13, color: C.gray600,
                display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center",
              }}>
                <span><strong style={{ color: C.navy }}>{summary.total}</strong> coaches parsed</span>
                <span><strong style={{ color: C.gold }}>{summary.coaches}</strong> coaches</span>
                <span><strong style={{ color: "#7C3AED" }}>{summary.jrCoaches}</strong> Jr. coaches</span>
                {summary.unresolved.length > 0 && (
                  <span style={{ color: C.coral }}>
                    <AlertTriangle size={12} style={{ verticalAlign: "middle" }} /> {summary.unresolved.length} with unresolved events
                  </span>
                )}
              </div>

              {/* Table preview */}
              <div style={{
                maxHeight: 400, overflow: "auto", borderRadius: 10,
                border: `1px solid ${C.gray200}`, marginBottom: 16,
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: C.offWhite, position: "sticky", top: 0 }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: C.gray400, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>#</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: C.gray400, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Name</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: C.gray400, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Email</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: C.gray400, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Role</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: C.gray400, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Events</th>
                      <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: C.gray400, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((row, i) => (
                      <tr key={i} style={{
                        borderTop: `1px solid ${C.gray100}`,
                        background: row.status === "success" ? "#F0FFF4" : row.status === "error" ? "#FFF5F5" : row.status === "adding" ? "#FFFDE7" : "transparent",
                      }}>
                        <td style={{ padding: "8px 12px", color: C.gray400 }}>{i + 1}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: C.navy }}>
                          {row.name}
                          {row.isJrCoach && (
                            <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: "#EDE9FE", color: "#7C3AED" }}>Jr.</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px", color: C.gray600 }}>{row.email}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: C.goldLight, color: C.gold }}>Coach</span>
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                            {row.events.map((ev, j) => (
                              <span key={j} style={{
                                padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                                background: ev._unresolved ? "#FEE2E2" : "#E2F0E6",
                                color: ev._unresolved ? C.coral : C.tealDark,
                              }}>
                                {ev._unresolved ? `⚠ ${ev.name}` : `${ev.icon || ""} ${ev.name}`}
                              </span>
                            ))}
                            {row.events.length === 0 && <span style={{ color: C.gray400, fontStyle: "italic" }}>—</span>}
                          </div>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          {row.status === "pending" && <span style={{ color: C.gray400 }}>—</span>}
                          {row.status === "adding" && <Loader2 size={14} color={C.gold} style={{ animation: "spin 1s linear infinite" }} />}
                          {row.status === "success" && <CheckCircle size={14} color="#2E7D32" />}
                          {row.status === "error" && (
                            <span title={row.error} style={{ cursor: "help" }}>
                              <AlertTriangle size={14} color={C.coral} />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleImport} disabled={importing} style={{
                  flex: 1, padding: 14, borderRadius: 10, border: "none",
                  background: importing ? C.gray400 : C.gold, color: C.white,
                  fontSize: 14, fontWeight: 700, cursor: importing ? "wait" : "pointer",
                  fontFamily: "inherit", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8,
                }}>
                  {importing ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      Adding {currentIdx + 1} of {parsed.length}...
                    </>
                  ) : (
                    <>
                      <Users size={16} /> Import All {parsed.length} Coaches
                    </>
                  )}
                </button>
                <button onClick={() => setParsed(null)} disabled={importing} style={{
                  padding: "14px 20px", borderRadius: 10, border: `1px solid ${C.gray200}`,
                  background: C.white, color: C.gray600, fontSize: 14, fontWeight: 600,
                  cursor: importing ? "default" : "pointer", fontFamily: "inherit",
                  opacity: importing ? 0.5 : 1,
                }}>
                  Back
                </button>
                <button onClick={onClose} disabled={importing} style={{
                  padding: "14px 20px", borderRadius: 10, border: `1px solid ${C.gray200}`,
                  background: C.white, color: C.gray600, fontSize: 14, fontWeight: 600,
                  cursor: importing ? "default" : "pointer", fontFamily: "inherit",
                  opacity: importing ? 0.5 : 1,
                }}>
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* Step 3: Results */}
          {done && (
            <>
              <div style={{
                padding: "16px 20px", borderRadius: 12, marginBottom: 16,
                background: errorCount === 0 ? "#E8F5E9" : "#FFF3E0",
                color: errorCount === 0 ? "#2E7D32" : "#E65100",
                fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {errorCount === 0 ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                {successCount} of {results.length} coaches imported successfully.
                {errorCount > 0 && ` ${errorCount} failed.`}
              </div>

              {/* Show errors */}
              {errorCount > 0 && (
                <div style={{
                  maxHeight: 200, overflow: "auto", marginBottom: 16,
                  borderRadius: 10, border: `1px solid ${C.gray200}`,
                }}>
                  {results.filter(r => r.status === "error").map((r, i) => (
                    <div key={i} style={{
                      padding: "10px 14px", borderTop: i > 0 ? `1px solid ${C.gray100}` : "none",
                      fontSize: 12, display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <AlertTriangle size={12} color={C.coral} />
                      <strong>{r.name}</strong>
                      <span style={{ color: C.gray400 }}>({r.email})</span>
                      <span style={{ color: C.coral, marginLeft: "auto" }}>{r.error}</span>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={onClose} style={{
                width: "100%", padding: 14, borderRadius: 10, border: "none",
                background: C.teal, color: C.white, fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <Check size={16} /> Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
