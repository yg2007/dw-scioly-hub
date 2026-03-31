import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X, Loader2, Eye, EyeOff, Check, Zap } from 'lucide-react';
import { C, TYPE_COLORS } from '../../ui';
import { getSynergyColor, getSynergyBg } from './synergyUtils';

export default function EventPartnershipCard({
  eventData,
  pairingMode = 'competition',
  recommendations,
  students,
  creatingFor,
  setCreatingFor,
  selectedPartners,
  setSelectedPartners,
  mutating,
  onCreatePartnership,
  onFinalize,
  onUnfinalize,
  onQuickPair,
  onDeletePartnership,
  calculateSynergy,
}) {
  const { eventId, eventName, eventIcon, eventType, teamSize, partnerships: eventPartnerships, unassignedStudents, allStudents, isComplete } = eventData;
  const isPractice = pairingMode === 'practice';

  // In practice mode, the "available" pool is ALL event students (not just unassigned)
  const selectableStudents = isPractice ? allStudents : unassignedStudents;

  // ── Keyboard navigation for student picker ──
  const [focusIdx, setFocusIdx] = useState(-1);
  const listRef = useRef(null);

  // Reset focus when picker opens/closes
  useEffect(() => {
    if (creatingFor !== eventId) setFocusIdx(-1);
  }, [creatingFor, eventId]);

  const handlePickerKeyDown = useCallback((e) => {
    const len = selectableStudents.length;
    if (!len) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx(prev => Math.min(prev + 1, len - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusIdx >= 0 && focusIdx < len) {
        const sid = selectableStudents[focusIdx].id;
        if (selectedPartners.includes(sid)) {
          setSelectedPartners(prev => prev.filter(id => id !== sid));
        } else if (selectedPartners.length < teamSize) {
          setSelectedPartners(prev => [...prev, sid]);
        }
      }
    } else if (e.key === "Escape") {
      setCreatingFor(null);
      setSelectedPartners([]);
    }
  }, [selectableStudents, focusIdx, selectedPartners, teamSize, setSelectedPartners, setCreatingFor]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusIdx >= 0 && listRef.current) {
      const el = listRef.current.children[focusIdx];
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [focusIdx]);

  // Draft/finalized status (only relevant for competition mode)
  const hasDraft = !isPractice && eventPartnerships.some(p => (p.status || 'draft') === 'draft');
  const allFinalized = !isPractice && eventPartnerships.length > 0 && eventPartnerships.every(p => p.status === 'finalized');
  const statusColor = isPractice ? '#7C3AED' : allFinalized ? C.teal : isComplete ? C.gold : unassignedStudents.length > 0 ? C.coral : C.gold;

  return (
    <div style={{
      background: C.white, border: `1px solid ${C.gray200}`,
      borderRadius: 14, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    }}>
      {/* Event Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <span style={{ fontSize: 28 }}>{eventIcon}</span>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{eventName}</h3>
            <div style={{
              display: "inline-block",
              background: TYPE_COLORS[eventType]?.bg,
              color: TYPE_COLORS[eventType]?.text,
              padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
            }}>
              {TYPE_COLORS[eventType]?.label}
            </div>
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: 8,
          background: statusColor, color: C.white, fontSize: 14, fontWeight: 700,
        }}>
          {eventPartnerships.length}
        </div>
      </div>

      {/* Draft/Finalized Status + Action (competition mode only) */}
      {!isPractice && eventPartnerships.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          {allFinalized ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
              background: "#E8F5E9", borderRadius: 8, fontSize: 12, fontWeight: 700, color: C.teal }}>
              <Check size={14} /> Announced to Students
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
              background: "#FFF8E1", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#F57F17" }}>
              <EyeOff size={14} /> Draft — Students Can't See
            </div>
          )}
          <div style={{ flex: 1 }} />
          {hasDraft && (
            <button onClick={() => onFinalize(eventId)} disabled={mutating}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                background: C.teal, color: C.white, border: "none", borderRadius: 8,
                fontSize: 12, fontWeight: 700, cursor: mutating ? "default" : "pointer", fontFamily: "inherit" }}>
              <Eye size={14} /> Announce to Students
            </button>
          )}
          {allFinalized && (
            <button onClick={() => onUnfinalize(eventId)} disabled={mutating}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                background: C.white, color: C.gray600, border: `1px solid ${C.gray200}`, borderRadius: 8,
                fontSize: 12, fontWeight: 600, cursor: mutating ? "default" : "pointer", fontFamily: "inherit" }}>
              <EyeOff size={14} /> Revert to Draft
            </button>
          )}
        </div>
      )}

      {/* Current Partnerships */}
      {eventPartnerships.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.4px" }}>
            {isPractice ? "Practice Groups" : "Current Partnerships"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {eventPartnerships.map((partnership, idx) => {
              const synergy = calculateSynergy(partnership.partners[0], partnership.partners[1], eventId);
              const studentNames = partnership.partners
                .map(pid => students.find(s => s.id === pid))
                .filter(Boolean);

              return (
                <div key={partnership.dbId || idx} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: 10, background: getSynergyBg(synergy), borderRadius: 10,
                  border: `1px solid ${getSynergyColor(synergy)}20`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                    {partnership.partners.map((pid, i) => {
                      const student = students.find(s => s.id === pid);
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: "50%",
                            background: student?.color || student?.avatar_color || C.gray200,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: C.white, fontSize: 10, fontWeight: 700,
                          }}>
                            {student?.initials}
                          </div>
                          {i < partnership.partners.length - 1 && <span style={{ color: C.gray400 }}>+</span>}
                        </div>
                      );
                    })}
                    <span style={{ fontSize: 12, fontWeight: 500, color: C.gray600, minWidth: "max-content" }}>
                      {studentNames.map(s => s.name || s.full_name).join(" & ")}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isPractice && (
                      <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "#EDE9FE", color: "#7C3AED", whiteSpace: "nowrap" }}>PRACTICE</span>
                    )}
                    <div style={{ fontSize: 12, fontWeight: 700, color: getSynergyColor(synergy), whiteSpace: "nowrap" }}>
                      {synergy !== null ? `${synergy}%` : "No data"} {synergy !== null ? "🤝" : ""}
                    </div>
                    <button
                      onClick={() => onDeletePartnership(eventId, partnership.partners, partnership.dbId)}
                      disabled={mutating}
                      style={{
                        background: "none", border: "none",
                        cursor: mutating ? "default" : "pointer",
                        color: C.gray400, padding: 4, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        opacity: mutating ? 0.5 : 1,
                      }}
                      onMouseEnter={e => !mutating && (e.currentTarget.style.color = C.coral)}
                      onMouseLeave={e => !mutating && (e.currentTarget.style.color = C.gray400)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unassigned Students (competition mode only) */}
      {!isPractice && unassignedStudents.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>
            Unassigned ({unassignedStudents.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {unassignedStudents.map(student => (
              <div key={student.id} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", background: C.gray100, borderRadius: 20,
                fontSize: 12, fontWeight: 500, color: C.gray600,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: student.color || student.avatar_color || C.teal,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.white, fontSize: 9, fontWeight: 700,
                }}>
                  {student.initials}
                </div>
                {student.name || student.full_name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && creatingFor !== eventId && (
        <div style={{ marginBottom: 16, padding: 12, background: "#F0F8FF", borderRadius: 10, border: `1px solid ${C.slate}40` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={14} color={C.gold} /> Recommended Pairings
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recommendations.map((rec, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8, background: C.white, borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {(rec.studentObjs || []).map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%",
                        background: s?.color || s?.avatar_color || C.gray200,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: C.white, fontSize: 8, fontWeight: 700,
                      }}>
                        {s?.initials}
                      </div>
                      {i < rec.studentObjs.length - 1 && <span style={{ color: C.gray400, fontSize: 10 }}>+</span>}
                    </div>
                  ))}
                  <span style={{ fontSize: 11, color: C.gray600, fontWeight: 500 }}>
                    {(rec.studentObjs || []).map(s => s?.name || s?.full_name).join(" + ")}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: getSynergyColor(rec.score) }}>
                    {rec.score !== null ? `${rec.score}%` : "—"}
                  </span>
                  <button
                    onClick={() => onQuickPair(eventId, rec.students)}
                    disabled={mutating}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "none",
                      background: C.teal, color: C.white, fontSize: 10,
                      fontWeight: 700, cursor: mutating ? "default" : "pointer",
                      fontFamily: "inherit", opacity: mutating ? 0.5 : 1,
                    }}
                  >
                    Pair
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partner Selection Form */}
      {creatingFor === eventId && (
        <div style={{ padding: 12, background: C.offWhite, borderRadius: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>
              Select {teamSize} student{teamSize > 1 ? "s" : ""} to pair
            </div>
            <div style={{ fontSize: 10, color: C.gray400 }}>
              <kbd style={{ padding: "1px 4px", borderRadius: 3, background: C.gray100, fontSize: 9 }}>↑↓</kbd> navigate · <kbd style={{ padding: "1px 4px", borderRadius: 3, background: C.gray100, fontSize: 9 }}>Space</kbd> select
            </div>
          </div>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            ref={listRef}
            tabIndex={0}
            onKeyDown={handlePickerKeyDown}
            role="listbox"
            aria-label="Select students"
            style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto", outline: "none" }}
          >
            {selectableStudents.map((student, idx) => {
              const isSelected = selectedPartners.includes(student.id);
              const isFocused = idx === focusIdx;
              return (
              <button
                key={student.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  if (isSelected) {
                    setSelectedPartners(prev => prev.filter(id => id !== student.id));
                  } else if (selectedPartners.length < teamSize) {
                    setSelectedPartners(prev => [...prev, student.id]);
                  }
                }}
                onMouseEnter={() => setFocusIdx(idx)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 8,
                  border: isSelected ? `2px solid ${C.teal}` : isFocused ? `2px solid ${C.navy}` : `1px solid ${C.gray200}`,
                  background: isSelected ? "#E2F0E6" : isFocused ? "#f0f4ff" : C.white,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  outline: "none",
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: student.color || student.avatar_color || C.teal,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.white, fontSize: 9, fontWeight: 700,
                }}>
                  {student.initials}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: C.gray600 }}>{student.name || student.full_name}</span>
                {selectedPartners.includes(student.id) && (
                  <div style={{ marginLeft: "auto", width: 16, height: 16, borderRadius: "50%", background: C.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: C.white, fontSize: 10, fontWeight: 700 }}>✓</span>
                  </div>
                )}
              </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              onClick={onCreatePartnership}
              disabled={selectedPartners.length !== teamSize || mutating}
              style={{
                flex: 1, padding: "8px 12px",
                background: selectedPartners.length === teamSize && !mutating ? C.teal : C.gray200,
                color: C.white, border: "none", borderRadius: 8,
                fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                cursor: selectedPartners.length === teamSize && !mutating ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {mutating ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
              {mutating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => { setCreatingFor(null); setSelectedPartners([]); }}
              disabled={mutating}
              style={{
                padding: "8px 12px", background: C.gray100, color: C.gray600,
                border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Create Button — always available in practice mode, gated in competition mode */}
      {creatingFor !== eventId && (isPractice ? allStudents.length >= teamSize : unassignedStudents.length > 0) && (
        <button
          onClick={() => { setCreatingFor(eventId); setSelectedPartners([]); }}
          disabled={mutating}
          style={{
            width: "100%", padding: 10,
            background: isPractice ? '#7C3AED' : C.teal,
            color: C.white,
            border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6, transition: "opacity 0.15s",
          }}
          onMouseEnter={e => !mutating && (e.currentTarget.style.opacity = 0.85)}
          onMouseLeave={e => !mutating && (e.currentTarget.style.opacity = 1)}
        >
          <Plus size={16} /> {isPractice ? "Create Practice Group" : "Create Partnership"}
        </button>
      )}

      {/* Completion Badge (competition mode only) */}
      {!isPractice && isComplete && (
        <div style={{ padding: 10, background: "#E2F0E6", borderRadius: 10, textAlign: "center", fontSize: 12, fontWeight: 600, color: C.teal }}>
          ✓ All students paired
        </div>
      )}
    </div>
  );
}
