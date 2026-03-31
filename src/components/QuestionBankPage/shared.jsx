import { C } from "../../ui";

export function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 100,
      fontSize: 11, fontWeight: 700, color: color || C.white,
      background: bg || C.teal, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

export function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: C.gray400 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.gray600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{subtitle}</div>
    </div>
  );
}

export function LoadingRows() {
  return (
    <div style={{ padding: "40px 0", textAlign: "center", color: C.gray400, fontSize: 13 }}>
      Loading…
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{ padding: "16px 20px", background: "#FEF2F2", borderRadius: 10, border: `1px solid #FECACA`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: C.coral }}>{message}</span>
      {onRetry && (
        <button onClick={onRetry} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
          borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.white,
          color: C.coral, fontSize: 12, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit" }}>Retry</button>
      )}
    </div>
  );
}
