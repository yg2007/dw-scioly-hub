import { C } from '../../ui';

export default function MiniStat({ label, value, highlight }) {
  return (
    <div style={{ padding: "10px 12px", background: highlight ? "#F5E2DC" : C.gray100, borderRadius: 8, textAlign: "center" }}>
      <div style={{ fontSize: 11, color: C.gray400, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: highlight ? C.coral : C.navy, marginTop: 2 }}>{value}</div>
    </div>
  );
}
