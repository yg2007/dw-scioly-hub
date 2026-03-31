import { useEffect, useState, useMemo } from 'react';
import { Users } from 'lucide-react';
import { SkeletonDashboard } from './shared/Skeleton';
import { C } from '../ui';
import { EVENTS, PARTNERSHIPS, STUDENTS, generateMastery } from '../data/mockData';
import { IS_PRODUCTION } from '../lib/featureFlags';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../lib/AppContext';

// ═══════════════════════════════════════════════════════════════
//  Partner Synergy Page — Student View
//
//  Shows the logged-in student their event partnerships with
//  topic-by-topic mastery comparison against their partner.
//
//  Production: fetches partnerships, partner info, event_topics,
//              and topic_mastery from Supabase.
//  Prototype:  uses mock data arrays.
// ═══════════════════════════════════════════════════════════════

export default function PartnerSynergyPage() {
  const { currentUser: user } = useAppContext();

  // ── Production state ─────────────────────────────────────────
  const [prodPartnerships, setProdPartnerships] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [partnerUserData, setPartnerUserData] = useState({});
  const [prodEventData, setProdEventData] = useState({});    // eventId → { name, icon, team_size, topics: [] }
  const [prodMyMastery, setProdMyMastery] = useState([]);     // topic_mastery rows for current user
  const [prodPartnerMastery, setProdPartnerMastery] = useState([]); // topic_mastery rows for all partners

  // ── Fetch everything from Supabase ───────────────────────────
  useEffect(() => {
    if (!IS_PRODUCTION || !user?.id) return;

    setProdLoading(true);

    (async () => {
      try {
        // 1. Fetch partnerships where this user is partner_a or partner_b
        const { data: rawPartnerships, error: pErr } = await supabase
          .from("partnerships")
          .select("id, event_id, partner_a, partner_b")
          .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`);

        if (pErr) throw pErr;
        if (!rawPartnerships || rawPartnerships.length === 0) {
          setProdPartnerships([]);
          setProdLoading(false);
          return;
        }

        // Deduplicate by event_id — if 3-person teams created multiple rows,
        // group them by event so we show one card per event
        const byEvent = {};
        for (const p of rawPartnerships) {
          const eid = p.event_id;
          if (!byEvent[eid]) byEvent[eid] = { dbId: p.id, eventId: eid, partnerIds: new Set() };
          // Add the OTHER person as a partner
          if (p.partner_a !== user.id) byEvent[eid].partnerIds.add(p.partner_a);
          if (p.partner_b !== user.id) byEvent[eid].partnerIds.add(p.partner_b);
        }

        const partnerships = Object.values(byEvent).map(p => ({
          ...p,
          partnerIds: [...p.partnerIds],
        }));
        setProdPartnerships(partnerships);

        // 2. Collect unique partner IDs and event IDs
        const allPartnerIds = [...new Set(partnerships.flatMap(p => p.partnerIds))];
        const allEventIds = [...new Set(partnerships.map(p => p.eventId))];

        // 3. Fetch partner user info, event details, event topics, and mastery — all in parallel
        const [usersRes, eventsRes, topicsRes, myMasteryRes, partnerMasteryRes] = await Promise.all([
          allPartnerIds.length > 0
            ? supabase.from("users").select("id, full_name, avatar_color, initials").in("id", allPartnerIds)
            : { data: [] },
          supabase.from("events").select("id, name, icon, team_size, type").in("id", allEventIds),
          supabase.from("event_topics").select("event_id, name, sort_order").in("event_id", allEventIds).order("sort_order"),
          supabase.from("topic_mastery").select("event_id, topic, score").eq("user_id", user.id).in("event_id", allEventIds),
          allPartnerIds.length > 0
            ? supabase.from("topic_mastery").select("user_id, event_id, topic, score").in("user_id", allPartnerIds).in("event_id", allEventIds)
            : { data: [] },
        ]);

        // Partner user map
        const userMap = {};
        (usersRes.data || []).forEach(u => { userMap[u.id] = u; });
        setPartnerUserData(userMap);

        // Event data map (with topics attached)
        const eventMap = {};
        (eventsRes.data || []).forEach(e => {
          eventMap[e.id] = { ...e, topics: [] };
        });
        (topicsRes.data || []).forEach(t => {
          if (eventMap[t.event_id]) {
            eventMap[t.event_id].topics.push(t.name);
          }
        });
        setProdEventData(eventMap);

        // Mastery arrays
        setProdMyMastery(myMasteryRes.data || []);
        setProdPartnerMastery(partnerMasteryRes.data || []);

      } catch (err) {
        console.error("PartnerSynergyPage load:", err);
      } finally {
        setProdLoading(false);
      }
    })();
  }, [user?.id]);

  // ── Build mastery lookup maps ────────────────────────────────
  const myMasteryMap = useMemo(() => {
    // map[eventId][topic] = score
    const m = {};
    for (const row of prodMyMastery) {
      if (!m[row.event_id]) m[row.event_id] = {};
      m[row.event_id][row.topic] = Number(row.score) || 0;
    }
    return m;
  }, [prodMyMastery]);

  const partnerMasteryMap = useMemo(() => {
    // map[userId][eventId][topic] = score
    const m = {};
    for (const row of prodPartnerMastery) {
      if (!m[row.user_id]) m[row.user_id] = {};
      if (!m[row.user_id][row.event_id]) m[row.user_id][row.event_id] = {};
      m[row.user_id][row.event_id][row.topic] = Number(row.score) || 0;
    }
    return m;
  }, [prodPartnerMastery]);

  // ── Unified partnerships list ────────────────────────────────
  const userPartnerships = IS_PRODUCTION
    ? prodPartnerships
    : (PARTNERSHIPS || []).filter(p => p?.partners?.includes(user?.id));

  // ── Loading ──────────────────────────────────────────────────
  if (prodLoading) {
    return <SkeletonDashboard stats={2} rows={6} style={{ padding: "4px 0" }} />;
  }

  // ── Empty state ──────────────────────────────────────────────
  if (userPartnerships.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Users size={48} color={C.gray200} style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No Partnerships Yet</h2>
        <p style={{ color: C.gray400, fontSize: 14 }}>Your coach will assign event partners soon.</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>👥 Partner Synergy</h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
        See how you and your partners complement each other across event topics.
      </p>

      {userPartnerships.map(p => {
        let partnerIds, partners, ev, topics, myMastery, theirMasteryArr;

        if (IS_PRODUCTION) {
          // ── Production data ──────────────────────────────
          partnerIds = p.partnerIds || [];
          partners = partnerIds.map(pid => partnerUserData[pid]).filter(Boolean);
          ev = prodEventData[p.eventId];
          if (!ev || partners.length === 0) return null;

          topics = ev.topics || [];
          const myEventMastery = myMasteryMap[p.eventId] || {};

          // For the first partner (primary view — most common case is 2-person teams)
          const primaryPartner = partners[0];
          const theirEventMastery = partnerMasteryMap[primaryPartner.id]?.[p.eventId] || {};

          myMastery = topics.map(t => ({ topic: t, score: myEventMastery[t] || 0 }));
          theirMasteryArr = topics.map(t => ({ topic: t, score: theirEventMastery[t] || 0 }));

        } else {
          // ── Mock data ────────────────────────────────────
          const partnerId = (p.partners || []).find(id => id !== user?.id);
          const partnerObj = (STUDENTS || []).find(s => s?.id === partnerId);
          ev = (EVENTS || []).find(e => e?.id === p?.eventId);
          if (!partnerObj || !ev) return null;

          partners = [partnerObj];
          topics = ev.topics || [];
          myMastery = generateMastery(user?.id, p?.eventId) || [];
          theirMasteryArr = generateMastery(partnerId, p?.eventId) || [];
        }

        const partner = partners[0];
        const hasAnyData = myMastery.some(m => m.score > 0) || theirMasteryArr.some(m => m.score > 0);

        return (
          <div key={p.eventId} style={{ background: C.white, borderRadius: 16, padding: 28,
            border: `1px solid ${C.gray200}`, marginBottom: 20 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 28 }}>{ev.icon}</span>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{ev.name}</h3>
                  <p style={{ fontSize: 12, color: C.gray400 }}>Team of {ev.team_size || ev.teamSize}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  background: `${(user.color || user.avatar_color || C.teal)}15`, borderRadius: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: (user.color || user.avatar_color || C.teal),
                    fontSize: 9, fontWeight: 700, color: C.white, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {user.initials}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>You</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  background: `${(partner.avatar_color || partner.color || C.teal)}15`, borderRadius: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: (partner.avatar_color || partner.color || C.teal),
                    fontSize: 9, fontWeight: 700, color: C.white, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {partner.initials}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{(partner.full_name || partner.name || "Partner").split(" ")[0]}</span>
                </div>
              </div>
            </div>

            {/* Coverage Grid */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px 60px", gap: 0, fontSize: 12 }}>
                <div style={{ padding: "8px 10px", fontWeight: 700, color: C.gray400 }}>Topic</div>
                <div style={{ padding: "8px 10px", fontWeight: 700, color: C.gray400 }}>Coverage</div>
                <div style={{ padding: "8px 10px", fontWeight: 700, color: C.gray400, textAlign: "center" }}>You</div>
                <div style={{ padding: "8px 10px", fontWeight: 700, color: C.gray400, textAlign: "center" }}>
                  {(partner.full_name || partner.name || "Partner").split(" ")[0]}
                </div>
              </div>

              {topics.length === 0 && (
                <div style={{ padding: "20px 10px", textAlign: "center", color: C.gray400, fontSize: 13, fontStyle: "italic" }}>
                  No topics configured for this event yet.
                </div>
              )}

              {topics.map((topicName, i) => {
                const myScore = myMastery[i]?.score || 0;
                const theirScore = theirMasteryArr[i]?.score || 0;
                const _combined = Math.max(myScore, theirScore); // reserved for combined-score view
                const isNoData = !hasAnyData;

                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px 60px",
                    gap: 0, borderTop: `1px solid ${C.gray100}`, alignItems: "center" }}>
                    <div style={{ padding: "10px", fontSize: 13, fontWeight: 500 }}>{topicName}</div>
                    <div style={{ padding: "10px" }}>
                      {isNoData ? (
                        <span style={{ fontSize: 12, color: C.gray400 }}>No quiz data yet</span>
                      ) : (
                        <div style={{ height: 12, background: C.gray100, borderRadius: 100, position: "relative", overflow: "hidden" }}>
                          <div style={{ position: "absolute", height: "100%", width: `${myScore}%`,
                            background: `${(user.color || user.avatar_color || C.teal)}55`, borderRadius: 100 }} />
                          <div style={{ position: "absolute", height: "100%", width: `${theirScore}%`,
                            background: `${(partner.avatar_color || partner.color || C.teal)}55`, borderRadius: 100 }} />
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700,
                      color: isNoData ? C.gray400 : (myScore >= 80 ? C.tealDark : myScore >= 60 ? C.gold : C.coral) }}>
                      {isNoData ? "—" : `${myScore}%`}
                    </div>
                    <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700,
                      color: isNoData ? C.gray400 : (theirScore >= 80 ? C.tealDark : theirScore >= 60 ? C.gold : C.coral) }}>
                      {isNoData ? "—" : `${theirScore}%`}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#E2F0E6", color: C.tealDark }}>
                🟢 Both strong
              </span>
              <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: C.goldLight, color: "#A0522D" }}>
                🟡 One covers it
              </span>
              <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#FEF2F2", color: C.coral }}>
                🔴 Gap for both
              </span>
            </div>

            {/* AI Suggestion */}
            <div style={{ marginTop: 16, padding: "14px 16px", background: C.goldLight, borderRadius: 10, fontSize: 13 }}>
              <strong style={{ color: C.gold }}>🤖 AI Suggestion:</strong>{" "}
              <span style={{ color: C.gray600 }}>
                {hasAnyData ? (
                  <>
                    {(user?.name || user?.full_name || "You").split(" ")[0]}, focus on{" "}
                    {[...myMastery].sort((a, b) => a.score - b.score)[0]?.topic || "your weakest area"}.{" "}
                    {(partner.full_name || partner.name || "Partner").split(" ")[0]} should prioritize{" "}
                    {[...theirMasteryArr].sort((a, b) => a.score - b.score)[0]?.topic || "their weakest area"}.
                  </>
                ) : (
                  <>Take some quizzes together to unlock personalized study recommendations!</>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
