import { useState, useRef, useEffect } from "react";
import { X, AlertTriangle, GraduationCap, Microscope, Check, Loader2, Mail, UserPlus, CheckCircle } from "lucide-react";
import { C } from "../../ui";

export default function InviteModal({ events, onSubmit, onAddDirect, onClose }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [addedMembers, setAddedMembers] = useState([]); // track successfully added names
  const [lastSuccess, setLastSuccess] = useState(null);  // brief success flash
  const nameRef = useRef(null);

  // Auto-focus name field on mount and after each successful add
  useEffect(() => {
    if (nameRef.current) nameRef.current.focus();
  }, [addedMembers.length]);

  const toggleEvent = (id) => {
    setSelectedEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const validate = () => {
    if (!fullName.trim()) { setError("Name is required"); return false; }
    if (!email.includes("@")) { setError("Valid email is required"); return false; }
    setError(null);
    return true;
  };

  // Reset all per-member fields after a successful add
  const resetForNext = (name) => {
    setFullName("");
    setEmail("");
    setSelectedEvents([]);
    setError(null);
    setAddedMembers((prev) => [...prev, name]);
    setLastSuccess(name);
    // Clear success flash after 3s
    setTimeout(() => setLastSuccess((cur) => cur === name ? null : cur), 3000);
  };

  const handleAddDirect = async () => {
    if (!validate()) return;
    setSending(true);
    setError(null);
    try {
      const name = fullName.trim();
      await onAddDirect({
        fullName: name,
        email: email.trim().toLowerCase(),
        role,
        eventIds: selectedEvents,
        _keepOpen: true, // signal to parent: don't close the modal
      });
      resetForNext(name);
    } catch (err) {
      setError(err.message || "Failed to add member");
    } finally {
      setSending(false);
    }
  };

  const handleSendInvite = async () => {
    if (!validate()) return;
    setSending(true);
    setError(null);
    try {
      const name = fullName.trim();
      await onSubmit({
        fullName: name,
        email: email.trim().toLowerCase(),
        role,
        eventIds: selectedEvents,
        _keepOpen: true,
      });
      resetForNext(name);
    } catch (err) {
      setError(err.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }} onClick={onClose}>
      <div style={{
        background: C.white, borderRadius: 20, width: 560, maxHeight: "85vh",
        overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: "24px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.navy, marginBottom: 4 }}>Invite Team Member</h2>
            <p style={{ fontSize: 13, color: C.gray400 }}>
              {addedMembers.length > 0
                ? `${addedMembers.length} added so far — add more or click Done.`
                : "They'll receive an email to sign in with Google."}
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
          {/* Success flash */}
          {lastSuccess && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, background: "#E8F5E9",
              color: "#2E7D32", fontSize: 13, fontWeight: 600, marginBottom: 16,
              display: "flex", alignItems: "center", gap: 6,
              animation: "fadeIn 0.2s ease",
            }}>
              <CheckCircle size={14} /> {lastSuccess} added to the team!
              <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            </div>
          )}

          {/* Added members summary */}
          {addedMembers.length > 0 && !lastSuccess && (
            <div style={{
              padding: "8px 14px", borderRadius: 8, background: C.gray100,
              color: C.gray600, fontSize: 12, marginBottom: 16,
              display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
            }}>
              <Check size={12} color={C.teal} />
              <span style={{ fontWeight: 600 }}>Added:</span>
              {addedMembers.map((name, i) => (
                <span key={i} style={{
                  padding: "2px 8px", background: "#E2F0E6", borderRadius: 4,
                  fontSize: 11, fontWeight: 600, color: C.tealDark,
                }}>
                  {name}
                </span>
              ))}
            </div>
          )}

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, background: "#FDE8EC",
              color: C.coral, fontSize: 13, fontWeight: 500, marginBottom: 16,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1 }}>Full Name</span>
            <input ref={nameRef} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jordan Smith"
              onKeyDown={(e) => e.key === "Enter" && document.getElementById("invite-email")?.focus()}
              style={{ display: "block", width: "100%", marginTop: 6, padding: "12px 14px", border: `1px solid ${C.gray200}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </label>

          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1 }}>Email Address</span>
            <input id="invite-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. jordan.smith@school.edu" type="email"
              onKeyDown={(e) => e.key === "Enter" && handleAddDirect()}
              style={{ display: "block", width: "100%", marginTop: 6, padding: "12px 14px", border: `1px solid ${C.gray200}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </label>

          <div style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>Role</span>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { id: "student", label: "Student", icon: GraduationCap, desc: "Takes quizzes, views study paths" },
                { id: "coach", label: "Event Coach", icon: Microscope, desc: "Manages assigned events" },
              ].map((r) => (
                <button key={r.id} onClick={() => setRole(r.id)} style={{
                  flex: 1, padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  border: role === r.id ? `2px solid ${C.gold}` : `1px solid ${C.gray200}`,
                  background: role === r.id ? C.goldLight : C.white, fontFamily: "inherit", textAlign: "left",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <r.icon size={16} color={role === r.id ? C.gold : C.gray400} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: role === r.id ? C.gold : C.navy }}>{r.label}</span>
                  </div>
                  <span style={{ fontSize: 12, color: C.gray400 }}>{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
              Assign Events <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: C.gray400 }}>(optional — applies to all adds)</span>
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 240, overflow: "auto", padding: 2 }}>
              {events.map((ev) => {
                const sel = selectedEvents.includes(ev.id);
                return (
                  <button key={ev.id} onClick={() => toggleEvent(ev.id)} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                    borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    border: sel ? `2px solid ${C.teal}` : `1px solid ${C.gray200}`,
                    background: sel ? "#E2F0E6" : C.white,
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{ev.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: sel ? C.tealDark : C.navy }}>{ev.name}</span>
                    {sel && <Check size={14} color={C.teal} style={{ marginLeft: "auto" }} />}
                  </button>
                );
              })}
            </div>
            {selectedEvents.length > 0 && (
              <p style={{ fontSize: 12, color: C.tealDark, fontWeight: 600, marginTop: 8 }}>
                {selectedEvents.length} event{selectedEvents.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={handleAddDirect} disabled={sending} style={{
              width: "100%", padding: "14px", borderRadius: 10, border: "none",
              background: sending ? C.gray400 : C.gold, color: C.white, fontSize: 14, fontWeight: 700,
              cursor: sending ? "wait" : "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {sending ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <UserPlus size={16} />}
              {sending ? "Adding..." : addedMembers.length > 0 ? "Add Another" : "Add to Team"}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.gray200}`,
                background: addedMembers.length > 0 ? C.teal : C.white,
                color: addedMembers.length > 0 ? C.white : C.gray600,
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                {addedMembers.length > 0 ? <><Check size={14} /> Done ({addedMembers.length} added)</> : "Cancel"}
              </button>
              <button onClick={handleSendInvite} disabled={sending} style={{
                flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.gray200}`,
                background: C.white, color: C.navy, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <Mail size={14} /> Send Invite Email Instead
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
