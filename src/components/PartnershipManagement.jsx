import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Loader2, AlertCircle, RefreshCw, Users, X } from 'lucide-react';
import { SkeletonDashboard } from './shared/Skeleton';
import { C } from '../ui';
import { IS_PRODUCTION } from '../lib/featureFlags';
import { EVENTS, STUDENTS, PARTNERSHIPS, generateMastery } from '../data/mockData';
import { supabase } from '../lib/supabase';
import EventPartnershipCard from './PartnershipManagement/EventPartnershipCard';
import { getSynergyColor, getSynergyBg } from './PartnershipManagement/synergyUtils';

// ═══════════════════════════════════════════════════════════════
//  Partnership Management — Coach/Admin Page
//
//  Production mode:  Fetches partnerships, events, users, and
//                    topic_mastery from Supabase. All mutations
//                    go through the DB.
//  Prototype mode:   Uses mock data arrays for demos.
// ═══════════════════════════════════════════════════════════════

export default function PartnershipManagement() {
  // ── Local UI state ───────────────────────────────────────────
  const [_selectedEvent, _setSelectedEvent] = useState(null); // reserved for future event-level filter
  const [pairingMode, setPairingMode] = useState('competition'); // 'competition' | 'practice'
  const [creatingFor, setCreatingFor] = useState(null);
  const [selectedPartners, setSelectedPartners] = useState([]);
  const [error, setError] = useState(null);
  const [mutating, setMutating] = useState(false);

  // ── Data state ───────────────────────────────────────────────
  const [prodPartnerships, setProdPartnerships] = useState([]);
  const [prodEvents, setProdEvents] = useState([]);
  const [prodStudents, setProdStudents] = useState([]);
  const [prodMastery, setProdMastery] = useState([]); // all topic_mastery rows
  const [dataLoading, setDataLoading] = useState(IS_PRODUCTION);

  // Mock-mode partnerships (mutable copy)
  const [mockPartnerships, setMockPartnerships] = useState(PARTNERSHIPS);

  // ── Fetch all data from Supabase ─────────────────────────────
  const loadProductionData = useCallback(async () => {
    if (!IS_PRODUCTION) return;
    setDataLoading(true);
    setError(null);

    try {
      const [eventsRes, usersRes, partnershipsRes, masteryRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, name, type, team_size, icon")
          .order("id"),
        supabase
          .from("users")
          .select("id, full_name, initials, avatar_color, role, user_events(event_id)")
          .eq("role", "student")
          .order("full_name"),
        supabase
          .from("partnerships")
          .select("id, event_id, partner_a, partner_b, status, mode"),
        supabase
          .from("topic_mastery")
          .select("user_id, event_id, topic, score"),
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (partnershipsRes.error) throw partnershipsRes.error;
      if (masteryRes.error) throw masteryRes.error;

      setProdEvents(eventsRes.data || []);
      setProdStudents(
        (usersRes.data || []).map(u => ({
          ...u,
          name: u.full_name,
          color: u.avatar_color || C.teal,
          events: (u.user_events || []).map(ue => ue.event_id),
        }))
      );
      // Normalize partnerships with status + mode
      setProdPartnerships(
        (partnershipsRes.data || []).map(p => ({
          dbId: p.id,
          eventId: p.event_id,
          partners: [p.partner_a, p.partner_b],
          status: p.status || 'draft',
          mode: p.mode || 'competition',
        }))
      );
      setProdMastery(masteryRes.data || []);
    } catch (err) {
      console.error("PartnershipManagement load:", err);
      setError("Failed to load data: " + (err.message || err));
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadProductionData(); }, [loadProductionData]);

  // ── Unified data source ──────────────────────────────────────
  const events = IS_PRODUCTION ? prodEvents : EVENTS;
  const students = IS_PRODUCTION ? prodStudents : STUDENTS;
  const partnerships = IS_PRODUCTION ? prodPartnerships : mockPartnerships;

  // ── Build a mastery lookup: masteryMap[userId][eventId][topic] = score
  const masteryMap = useMemo(() => {
    if (!IS_PRODUCTION) return null; // use generateMastery() for mock
    const map = {};
    for (const row of prodMastery) {
      if (!map[row.user_id]) map[row.user_id] = {};
      if (!map[row.user_id][row.event_id]) map[row.user_id][row.event_id] = {};
      map[row.user_id][row.event_id][row.topic] = Number(row.score) || 0;
    }
    return map;
  }, [prodMastery]);

  // ── Helper: get topics for an event ──────────────────────────
  const getEventTopics = useCallback((eventId) => {
    if (!IS_PRODUCTION) {
      return EVENTS.find(e => e.id === eventId)?.topics || [];
    }
    // In production, derive topics from topic_mastery rows for this event
    const topicSet = new Set();
    for (const row of prodMastery) {
      if (row.event_id === eventId) topicSet.add(row.topic);
    }
    return [...topicSet];
  }, [prodMastery]);

  // ── Synergy score: real or mock ──────────────────────────────
  const calculateSynergy = useCallback((studentAId, studentBId, eventId) => {
    if (!IS_PRODUCTION) {
      // Mock mode — use generateMastery
      const event = EVENTS.find(e => e.id === eventId);
      if (!event?.topics) return 0;
      const masteryA = generateMastery(studentAId, eventId);
      const masteryB = generateMastery(studentBId, eventId);
      const topicScores = event.topics.map(topic => {
        const a = masteryA.find(m => m.topic === topic)?.score || 0;
        const b = masteryB.find(m => m.topic === topic)?.score || 0;
        return Math.max(a, b);
      });
      return topicScores.length > 0
        ? Math.round(topicScores.reduce((a, b) => a + b, 0) / topicScores.length)
        : 0;
    }

    // Production — use real mastery data
    const topics = getEventTopics(eventId);
    if (topics.length === 0) return null; // null = no data yet

    const aMap = masteryMap?.[studentAId]?.[eventId] || {};
    const bMap = masteryMap?.[studentBId]?.[eventId] || {};

    const topicScores = topics.map(t => Math.max(aMap[t] || 0, bMap[t] || 0));
    return Math.round(topicScores.reduce((a, b) => a + b, 0) / topicScores.length);
  }, [masteryMap, getEventTopics]);

  // ── Complementary score for recommendations ──────────────────
  const calculateComplementaryScore = useCallback((studentAId, studentBId, eventId) => {
    // Same logic as synergy — max-of-two per topic, averaged
    return calculateSynergy(studentAId, studentBId, eventId);
  }, [calculateSynergy]);


  // ── Event stats computation ──────────────────────────────────
  const eventStats = useMemo(() => {
    return events.map(event => {
      const eid = event.id;
      const teamSize = event.team_size || event.teamSize || 2;
      // Filter partnerships by current mode
      const eventPartnerships = partnerships.filter(p => p.eventId === eid && (p.mode || 'competition') === pairingMode);
      const eventStudents = students.filter(s => (s.events || []).includes(eid));

      // In competition mode, students already paired are excluded from the picker.
      // In practice mode, all event students remain available for selection.
      const assignedIds = new Set();
      if (pairingMode === 'competition') {
        eventPartnerships.forEach(p => p.partners.forEach(sid => assignedIds.add(sid)));
      }
      const unassignedStudents = eventStudents.filter(s => !assignedIds.has(s.id));

      return {
        eventId: eid,
        eventName: event.name,
        eventType: event.type,
        eventIcon: event.icon,
        teamSize,
        partnerships: eventPartnerships,
        assignedCount: assignedIds.size,
        unassignedStudents,
        allStudents: eventStudents,
        totalStudents: eventStudents.length,
        isComplete: pairingMode === 'competition' && unassignedStudents.length === 0 && eventStudents.length > 0,
      };
    });
  }, [events, students, partnerships, pairingMode]);

  // ── Smart pairing recommendations ────────────────────────────
  const getRecommendations = useCallback((eventId) => {
    const eventData = eventStats.find(e => e.eventId === eventId);
    if (!eventData || eventData.unassignedStudents.length === 0) return [];

    const { teamSize, unassignedStudents } = eventData;
    const candidates = [];

    if (teamSize === 2) {
      for (let i = 0; i < unassignedStudents.length; i++) {
        for (let j = i + 1; j < unassignedStudents.length; j++) {
          const score = calculateComplementaryScore(
            unassignedStudents[i].id,
            unassignedStudents[j].id,
            eventId
          );
          candidates.push({
            students: [unassignedStudents[i].id, unassignedStudents[j].id],
            score,
          });
        }
      }
    } else if (teamSize === 3) {
      for (let i = 0; i < unassignedStudents.length; i++) {
        for (let j = i + 1; j < unassignedStudents.length; j++) {
          for (let k = j + 1; k < unassignedStudents.length; k++) {
            const s1 = calculateComplementaryScore(unassignedStudents[i].id, unassignedStudents[j].id, eventId);
            const s2 = calculateComplementaryScore(unassignedStudents[i].id, unassignedStudents[k].id, eventId);
            const s3 = calculateComplementaryScore(unassignedStudents[j].id, unassignedStudents[k].id, eventId);
            candidates.push({
              students: [unassignedStudents[i].id, unassignedStudents[j].id, unassignedStudents[k].id],
              score: s1 !== null && s2 !== null && s3 !== null
                ? Math.round((s1 + s2 + s3) / 3)
                : null,
            });
          }
        }
      }
    }

    return candidates
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
      .slice(0, 3)
      .map(rec => ({
        ...rec,
        studentObjs: rec.students.map(sid => students.find(s => s.id === sid)),
      }));
  }, [eventStats, students, calculateComplementaryScore]);

  // ── Create partnership ───────────────────────────────────────
  const handleCreatePartnership = async () => {
    if (selectedPartners.length === 0 || !creatingFor) return;

    const event = events.find(e => e.id === creatingFor);
    const teamSize = event?.team_size || event?.teamSize || 2;
    if (!event || selectedPartners.length !== teamSize) {
      setError(`Please select exactly ${teamSize} students.`);
      return;
    }

    setMutating(true);
    setError(null);

    try {
      if (IS_PRODUCTION) {
        // For 2-person teams: insert one row
        // For 3-person teams: insert all pairs (3 rows)
        const rows = [];
        if (teamSize === 2) {
          rows.push({ event_id: creatingFor, partner_a: selectedPartners[0], partner_b: selectedPartners[1], mode: pairingMode });
        } else if (teamSize === 3) {
          // Store all 3 pairwise combinations
          rows.push({ event_id: creatingFor, partner_a: selectedPartners[0], partner_b: selectedPartners[1], mode: pairingMode });
          rows.push({ event_id: creatingFor, partner_a: selectedPartners[0], partner_b: selectedPartners[2], mode: pairingMode });
          rows.push({ event_id: creatingFor, partner_a: selectedPartners[1], partner_b: selectedPartners[2], mode: pairingMode });
        }

        const { data: _insertedRows, error: insertError } = await supabase
          .from("partnerships")
          .insert(rows)
          .select();

        if (insertError) throw insertError;

        // Refresh from server to stay in sync
        await loadProductionData();
      } else {
        // Mock mode
        setMockPartnerships(prev => [...prev, {
          eventId: creatingFor,
          partners: [...selectedPartners],
        }]);
      }

      setSelectedPartners([]);
      setCreatingFor(null);
    } catch (err) {
      setError(err.message || "Failed to create partnership");
    } finally {
      setMutating(false);
    }
  };

  // ── Finalize all competition partnerships for an event ───────
  const handleFinalizeEvent = async (eventId) => {
    setMutating(true);
    setError(null);
    try {
      if (IS_PRODUCTION) {
        const eventPartnershipIds = partnerships
          .filter(p => p.eventId === eventId && p.status === 'draft' && (p.mode || 'competition') === 'competition')
          .map(p => p.dbId)
          .filter(Boolean);

        if (eventPartnershipIds.length > 0) {
          const { error: updateErr } = await supabase
            .from("partnerships")
            .update({ status: 'finalized', finalized_at: new Date().toISOString() })
            .in("id", eventPartnershipIds);
          if (updateErr) throw updateErr;
        }
        await loadProductionData();
      } else {
        setMockPartnerships(prev => prev.map(p =>
          p.eventId === eventId ? { ...p, status: 'finalized' } : p
        ));
      }
    } catch (err) {
      setError(err.message || "Failed to finalize partnerships");
    } finally {
      setMutating(false);
    }
  };

  // ── Unfinalize (revert to draft) ─────────────────────────────
  const handleUnfinalizeEvent = async (eventId) => {
    setMutating(true);
    setError(null);
    try {
      if (IS_PRODUCTION) {
        const eventPartnershipIds = partnerships
          .filter(p => p.eventId === eventId && p.status === 'finalized' && (p.mode || 'competition') === 'competition')
          .map(p => p.dbId)
          .filter(Boolean);

        if (eventPartnershipIds.length > 0) {
          const { error: updateErr } = await supabase
            .from("partnerships")
            .update({ status: 'draft', finalized_at: null })
            .in("id", eventPartnershipIds);
          if (updateErr) throw updateErr;
        }
        await loadProductionData();
      } else {
        setMockPartnerships(prev => prev.map(p =>
          p.eventId === eventId ? { ...p, status: 'draft' } : p
        ));
      }
    } catch (err) {
      setError(err.message || "Failed to revert partnerships to draft");
    } finally {
      setMutating(false);
    }
  };

  // ── Quick-pair from recommendation ───────────────────────────
  const handleQuickPair = async (eventId, studentIds) => {
    setMutating(true);
    setError(null);

    try {
      if (IS_PRODUCTION) {
        const rows = [];
        if (studentIds.length === 2) {
          rows.push({ event_id: eventId, partner_a: studentIds[0], partner_b: studentIds[1], mode: pairingMode });
        } else if (studentIds.length === 3) {
          rows.push({ event_id: eventId, partner_a: studentIds[0], partner_b: studentIds[1], mode: pairingMode });
          rows.push({ event_id: eventId, partner_a: studentIds[0], partner_b: studentIds[2], mode: pairingMode });
          rows.push({ event_id: eventId, partner_a: studentIds[1], partner_b: studentIds[2], mode: pairingMode });
        }

        const { error: insertError } = await supabase
          .from("partnerships")
          .insert(rows)
          .select();

        if (insertError) throw insertError;
        await loadProductionData();
      } else {
        setMockPartnerships(prev => [...prev, { eventId, partners: [...studentIds] }]);
      }
    } catch (err) {
      setError(err.message || "Failed to create partnership");
    } finally {
      setMutating(false);
    }
  };

  // ── Delete partnership ───────────────────────────────────────
  const handleDeletePartnership = async (eventId, partnerIds, dbId) => {
    setMutating(true);
    setError(null);

    try {
      if (IS_PRODUCTION) {
        if (dbId) {
          // Delete the specific DB row
          const { error: delErr } = await supabase
            .from("partnerships")
            .delete()
            .eq("id", dbId);
          if (delErr) throw delErr;
        } else {
          // Fallback: delete by event + partner combination
          const { error: delErr } = await supabase
            .from("partnerships")
            .delete()
            .eq("event_id", eventId)
            .or(`and(partner_a.in.(${partnerIds.join(",")}),partner_b.in.(${partnerIds.join(",")}))`);
          if (delErr) throw delErr;
        }
        await loadProductionData();
      } else {
        setMockPartnerships(prev =>
          prev.filter(p => !(p.eventId === eventId && p.partners.every(pid => partnerIds.includes(pid))))
        );
      }
    } catch (err) {
      setError(err.message || "Failed to delete partnership");
    } finally {
      setMutating(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────
  if (dataLoading) {
    return <SkeletonDashboard stats={3} rows={8} style={{ padding: "4px 0" }} />;
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{ padding: "0 0 40px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>👥 Partnership Management</h1>
          <p style={{ color: C.gray600, fontSize: 14 }}>
            Create and manage event team pairings. View synergy scores and get smart pairing recommendations.
          </p>
        </div>
        {IS_PRODUCTION && (
          <button onClick={loadProductionData} disabled={mutating} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
            background: C.white, color: C.gray600, border: `1px solid ${C.gray200}`,
            borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      </div>

      {/* Mode Toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.gray100, borderRadius: 10, padding: 4, maxWidth: 380 }}>
        {[
          { id: "competition", label: "Competition Lineup", icon: "🏆" },
          { id: "practice", label: "Practice Pairings", icon: "🧪" },
        ].map(m => (
          <button key={m.id} onClick={() => { setPairingMode(m.id); setCreatingFor(null); setSelectedPartners([]); }} style={{
            flex: 1, padding: "10px 16px", borderRadius: 8, border: "none",
            background: pairingMode === m.id ? C.white : "transparent",
            color: pairingMode === m.id ? C.navy : C.gray400,
            fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            boxShadow: pairingMode === m.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <span>{m.icon}</span> {m.label}
          </button>
        ))}
      </div>

      {/* Practice mode info banner */}
      {pairingMode === 'practice' && (
        <div style={{
          padding: "12px 18px", marginBottom: 20, borderRadius: 10,
          background: "linear-gradient(135deg, #EDE9FE 0%, #FEF3C7 100%)",
          border: "1px solid #C4B5FD", fontSize: 13, color: "#5B21B6", lineHeight: 1.5,
        }}>
          <strong>Practice mode:</strong> Students can appear in multiple pairings so you can compare different configurations.
          Practice pairings are never shown to students — only competition lineups can be announced.
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Events", value: events.length, color: C.navy },
          { label: pairingMode === 'practice' ? "Practice Groups" : "Partnerships", value: eventStats.reduce((s, e) => s + e.partnerships.length, 0), color: C.teal },
          { label: "Students Paired", value: new Set(eventStats.flatMap(e => e.partnerships.flatMap(p => p.partners))).size, color: C.gold },
          ...(pairingMode === 'competition' ? [{ label: "Needs Pairing", value: eventStats.reduce((s, e) => s + e.unassignedStudents.length, 0), color: C.coral }] : []),
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, background: C.white, borderRadius: 12, padding: "14px 20px",
            border: `1px solid ${C.gray200}`,
          }}>
            <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: "#FFEAE2", border: `1px solid ${C.coral}`, borderRadius: 12,
          padding: 14, marginBottom: 24, display: "flex", alignItems: "center",
          gap: 10, fontSize: 13, color: C.coral,
        }}>
          <AlertCircle size={18} />
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.coral }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Events Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 24 }}>
        {eventStats.map(eventData => {
          if (eventData.totalStudents === 0) return null;
          const recommendations = getRecommendations(eventData.eventId);
          return (
            <EventPartnershipCard
              key={`${eventData.eventId}-${pairingMode}`}
              eventData={eventData}
              pairingMode={pairingMode}
              recommendations={recommendations}
              students={students}
              creatingFor={creatingFor}
              setCreatingFor={setCreatingFor}
              selectedPartners={selectedPartners}
              setSelectedPartners={setSelectedPartners}
              mutating={mutating}
              onCreatePartnership={handleCreatePartnership}
              onFinalize={handleFinalizeEvent}
              onUnfinalize={handleUnfinalizeEvent}
              onQuickPair={handleQuickPair}
              onDeletePartnership={handleDeletePartnership}
              calculateSynergy={calculateSynergy}
              getSynergyColor={getSynergyColor}
              getSynergyBg={getSynergyBg}
            />
          );
        })}
      </div>

      {/* Empty State */}
      {eventStats.filter(e => e.totalStudents > 0).length === 0 && (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Users size={48} color={C.gray200} style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: C.gray600 }}>No Students Assigned</h2>
          <p style={{ color: C.gray400, fontSize: 14 }}>Assign students to events from the Team page first, then come back here to pair them.</p>
        </div>
      )}
    </div>
  );
}
