import { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, Check, AlertTriangle } from "lucide-react";
import { C } from "../ui";
import { supabase } from "../lib/supabase";

// ═══════════════════════════════════════════════════════════════
//  Event Management Modal — Add / Edit events
//
//  Coaches and admins can create new events or edit existing ones.
//  Supports name, type, team size, icon, trial flag, and topics.
// ═══════════════════════════════════════════════════════════════

const TYPE_OPTIONS = [
  { value: "study", label: "Study", icon: "📖" },
  { value: "lab", label: "Lab", icon: "🧪" },
  { value: "build", label: "Build", icon: "🏗️" },
];

const ICON_SUGGESTIONS = [
  "🔬", "🧬", "🫀", "⚡", "🪨", "🌍", "🦗", "🌦️", "🏗️", "🚁",
  "💨", "⚙️", "🏎️", "🧪", "🔧", "📏", "🧫", "💧", "✍️", "🛰️",
  "🔐", "🪐", "⭐", "🗺️", "🔭", "🧲", "🦠", "🌿", "🧠", "🎯",
];

export default function EventManagementModal({ event, onClose, onSaved }) {
  const isEditing = !!event;

  const [name, setName] = useState(event?.name || "");
  const [type, setType] = useState(event?.type || "study");
  const [teamSize, setTeamSize] = useState(event?.team_size || 2);
  const [icon, setIcon] = useState(event?.icon || "📋");
  const [isTrial, setIsTrial] = useState(event?.is_trial || false);
  const [topics, setTopics] = useState([]);
  const [newTopic, setNewTopic] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Load existing topics when editing
  useEffect(() => {
    if (!event?.id) return;
    supabase
      .from("event_topics")
      .select("id, name, sort_order")
      .eq("event_id", event.id)
      .order("sort_order")
      .then(({ data }) => {
        setTopics((data || []).map(t => ({ id: t.id, name: t.name, isExisting: true })));
      });
  }, [event?.id]);

  const addTopic = () => {
    const trimmed = newTopic.trim();
    if (!trimmed) return;
    if (topics.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) return;
    setTopics(prev => [...prev, { name: trimmed, isExisting: false }]);
    setNewTopic("");
  };

  const removeTopic = (idx) => {
    setTopics(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Event name is required"); return; }
    setSaving(true);
    setError(null);

    try {
      let eventId = event?.id;

      if (isEditing) {
        // Update existing event
        const { error: err } = await supabase
          .from("events")
          .update({
            name: name.trim(),
            type,
            team_size: teamSize,
            icon,
            is_trial: isTrial,
          })
          .eq("id", event.id);
        if (err) throw err;
      } else {
        // Insert new event
        const { data, error: err } = await supabase
          .from("events")
          .insert({
            name: name.trim(),
            type,
            team_size: teamSize,
            icon,
            is_trial: isTrial,
            season: "2025-2026",
          })
          .select("id")
          .single();
        if (err) throw err;
        eventId = data.id;
      }

      // Sync topics:
      // 1. Delete removed existing topics
      if (isEditing) {
        const keepIds = topics.filter(t => t.isExisting && t.id).map(t => t.id);
        if (keepIds.length > 0) {
          await supabase
            .from("event_topics")
            .delete()
            .eq("event_id", eventId)
            .not("id", "in", `(${keepIds.join(",")})`);
        } else {
          // All existing topics were removed
          await supabase.from("event_topics").delete().eq("event_id", eventId);
        }
      }

      // 2. Insert new topics
      const newTopics = topics
        .filter(t => !t.isExisting)
        .map((t, i) => ({
          event_id: eventId,
          name: t.name,
          sort_order: (topics.filter(x => x.isExisting).length) + i,
        }));

      if (newTopics.length > 0) {
        const { error: topicErr } = await supabase
          .from("event_topics")
          .insert(newTopics);
        if (topicErr) throw topicErr;
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error("EventManagementModal save:", err);
      setError(err.message || "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50, padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.white, borderRadius: 16, width: "100%", maxWidth: 520,
          maxHeight: "90vh", overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: `1px solid ${C.gray200}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>
            {isEditing ? "Edit Event" : "Add New Event"}
          </h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.gray200}`,
            background: C.white, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", color: C.gray400,
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, background: "#FEF2F2",
              color: C.coral, fontSize: 13, marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {/* Icon + Name row */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ position: "relative" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 6, display: "block" }}>Icon</label>
              <button
                onClick={() => setShowIconPicker(!showIconPicker)}
                style={{
                  width: 48, height: 48, borderRadius: 10,
                  border: `1px solid ${C.gray200}`, background: C.offWhite,
                  fontSize: 24, cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                {icon}
              </button>
              {showIconPicker && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, marginTop: 4,
                  background: C.white, border: `1px solid ${C.gray200}`,
                  borderRadius: 10, padding: 8, zIndex: 10,
                  display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.12)", width: 220,
                }}>
                  {ICON_SUGGESTIONS.map(emoji => (
                    <button key={emoji} onClick={() => { setIcon(emoji); setShowIconPicker(false); }}
                      style={{
                        width: 32, height: 32, border: "none", borderRadius: 6,
                        background: icon === emoji ? C.goldLight : "transparent",
                        fontSize: 18, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 6, display: "block" }}>
                Event Name *
              </label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Anatomy & Physiology"
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  border: `1px solid ${C.gray200}`, fontSize: 14,
                  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Type + Team Size */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 6, display: "block" }}>
                Event Type
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {TYPE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setType(opt.value)}
                    style={{
                      flex: 1, padding: "10px 8px", borderRadius: 8,
                      border: type === opt.value ? `2px solid ${C.teal}` : `1px solid ${C.gray200}`,
                      background: type === opt.value ? "#E2F0E6" : C.white,
                      cursor: "pointer", fontSize: 13, fontWeight: 600,
                      fontFamily: "inherit", color: type === opt.value ? C.tealDark : C.gray600,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    }}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ width: 100 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 6, display: "block" }}>
                Team Size
              </label>
              <select
                value={teamSize} onChange={e => setTeamSize(Number(e.target.value))}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${C.gray200}`, fontSize: 14,
                  fontFamily: "inherit", background: C.white, cursor: "pointer",
                }}
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Trial event toggle */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
            padding: "12px 14px", borderRadius: 10, background: C.offWhite,
          }}>
            <input
              type="checkbox" checked={isTrial}
              onChange={e => setIsTrial(e.target.checked)}
              style={{ width: 18, height: 18, cursor: "pointer", accentColor: C.teal }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>Trial Event</div>
              <div style={{ fontSize: 11, color: C.gray400 }}>Mark as a trial/pilot event</div>
            </div>
          </div>

          {/* Topics */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 8, display: "block" }}>
              Topics ({topics.length})
            </label>
            {topics.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {topics.map((t, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "5px 10px", borderRadius: 100,
                    background: C.offWhite, border: `1px solid ${C.gray200}`,
                    fontSize: 12, fontWeight: 500, color: C.navy,
                  }}>
                    {t.name}
                    <button onClick={() => removeTopic(i)} style={{
                      width: 16, height: 16, borderRadius: "50%", border: "none",
                      background: "transparent", cursor: "pointer", padding: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: C.gray400,
                    }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTopic(); } }}
                placeholder="Add a topic..."
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${C.gray200}`, fontSize: 13,
                  fontFamily: "inherit", outline: "none",
                }}
              />
              <button onClick={addTopic} disabled={!newTopic.trim()}
                style={{
                  padding: "10px 14px", borderRadius: 10, border: "none",
                  background: newTopic.trim() ? C.teal : C.gray200,
                  color: C.white, fontSize: 13, fontWeight: 600,
                  cursor: newTopic.trim() ? "pointer" : "default",
                  fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
                }}>
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px", borderTop: `1px solid ${C.gray200}`,
          display: "flex", justifyContent: "flex-end", gap: 10,
        }}>
          <button onClick={onClose} style={{
            padding: "10px 20px", borderRadius: 10,
            border: `1px solid ${C.gray200}`, background: C.white,
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            color: C.gray600,
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{
              padding: "10px 20px", borderRadius: 10, border: "none",
              background: saving ? C.gray400 : C.teal,
              color: C.white, fontSize: 13, fontWeight: 600,
              cursor: saving ? "default" : "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}>
            {saving ? (
              <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving...</>
            ) : (
              <><Check size={14} /> {isEditing ? "Save Changes" : "Create Event"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
