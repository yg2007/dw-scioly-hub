import { RefreshCw } from "lucide-react";
import { C } from "../../ui";
import { useIngestionLog } from "../../hooks/useQuestionBank";
import { EmptyState, LoadingRows, ErrorBanner } from "./shared";

const ghostBtnStyle = {
  display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
  borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.white,
  color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer",
  fontFamily: "inherit",
};

const thStyle = {
  padding: "10px 14px", textAlign: "left", fontWeight: 600,
};

const tdStyle = {
  padding: "10px 14px", verticalAlign: "top",
};

export default function IngestionLogTab() {
  const { log, loading, error, refetch } = useIngestionLog();

  if (loading) return <LoadingRows />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;

  if (log.length === 0) {
    return (
      <EmptyState
        icon="📥"
        title="No ingestion records"
        subtitle="Run the seed script to load tournament question banks."
      />
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={refetch} style={ghostBtnStyle}><RefreshCw size={13} /> Refresh</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginBottom: 28 }}>
        {log.map((entry) => (
          <div key={entry.id} style={{ background: C.white, borderRadius: 12, padding: 18, border: `1px solid ${C.gray200}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 8 }}>{entry.source_name}</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.teal }}>{entry.question_count ?? 0}</div>
                <div style={{ fontSize: 11, color: C.gray400 }}>questions</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.gold }}>{entry.event_count ?? 0}</div>
                <div style={{ fontSize: 11, color: C.gray400 }}>events</div>
              </div>
            </div>
            {entry.notes && (
              <div style={{ fontSize: 11, color: C.gray400, marginTop: 8, lineHeight: 1.4 }}>{entry.notes}</div>
            )}
            <div style={{ fontSize: 11, color: C.gray400, marginTop: 6 }}>
              {new Date(entry.ingested_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div style={{ border: `1px solid ${C.gray200}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.gray100, color: C.gray600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
              <th style={thStyle}>Source</th>
              <th style={thStyle}>Questions</th>
              <th style={thStyle}>Events</th>
              <th style={thStyle}>Notes</th>
              <th style={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {log.map((entry, i) => (
              <tr key={entry.id} style={{ background: i % 2 === 0 ? C.white : C.offWhite, borderTop: `1px solid ${C.gray100}` }}>
                <td style={tdStyle}>{entry.source_name}</td>
                <td style={{ ...tdStyle, color: C.teal, fontWeight: 700 }}>{entry.question_count ?? 0}</td>
                <td style={{ ...tdStyle, color: C.gold, fontWeight: 700 }}>{entry.event_count ?? 0}</td>
                <td style={{ ...tdStyle, color: C.gray400, fontSize: 12 }}>{entry.notes || "—"}</td>
                <td style={{ ...tdStyle, color: C.gray400, fontSize: 11, whiteSpace: "nowrap" }}>
                  {new Date(entry.ingested_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
