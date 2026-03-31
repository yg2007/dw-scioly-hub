/**
 * Skeleton — shimmer placeholder shown while data is loading.
 *
 * Usage:
 *   <Skeleton width={200} height={20} />           // single bar
 *   <Skeleton width="100%" height={14} radius={4} /> // full-width thin bar
 *
 * Compound helpers exported below make it easy to build page-specific
 * skeleton layouts without repeating boilerplate.
 */

// ── Base primitive ─────────────────────────────────────────────
export default function Skeleton({ width = "100%", height = 16, radius = 8, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: radius, flexShrink: 0, ...style }}
    />
  );
}

// ── Stat card skeleton (number + label) ────────────────────────
export function SkeletonStatCard({ style = {} }) {
  return (
    <div style={{
      flex: 1, background: "#fff", borderRadius: 14, padding: "20px 24px",
      border: "1px solid #eaecf0", display: "flex", flexDirection: "column", gap: 10,
      minWidth: 120, ...style,
    }}>
      <Skeleton width={80} height={11} radius={4} />
      <Skeleton width={56} height={28} radius={6} />
    </div>
  );
}

// ── Event / roster row skeleton ────────────────────────────────
export function SkeletonRow({ cols = 4, style = {} }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
      borderBottom: "1px solid #f3f4f6", ...style,
    }}>
      {/* Avatar circle */}
      <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
      {/* Text columns */}
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} width={`${100 / cols}%`} height={13} radius={4}
          style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

// ── Event card skeleton (grid card) ────────────────────────────
export function SkeletonCard({ style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: 20,
      border: "1px solid #eaecf0", display: "flex", flexDirection: "column", gap: 12,
      ...style,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width="70%" height={14} radius={4} />
          <Skeleton width="45%" height={11} radius={4} />
        </div>
      </div>
      <Skeleton height={8} radius={4} />
      <div style={{ display: "flex", gap: 8 }}>
        <Skeleton width="40%" height={11} radius={4} />
        <Skeleton width="30%" height={11} radius={4} />
      </div>
    </div>
  );
}

// ── Horizontal bar skeleton (e.g. readiness bar row) ──────────
export function SkeletonBar({ style = {} }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 0", ...style,
    }}>
      <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }} />
      <Skeleton width={120} height={13} radius={4} />
      <div style={{ flex: 1 }}>
        <Skeleton height={8} radius={4} />
      </div>
      <Skeleton width={36} height={13} radius={4} />
    </div>
  );
}

// ── Full dashboard skeleton: stat row + N bars ─────────────────
export function SkeletonDashboard({ stats = 4, rows = 6, style = {} }) {
  return (
    <div style={{ ...style }}>
      {/* Stat cards row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 28 }}>
        {Array.from({ length: stats }).map((_, i) => <SkeletonStatCard key={i} />)}
      </div>
      {/* Content rows */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1px solid #eaecf0", overflow: "hidden",
      }}>
        {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  );
}

// ── Event grid skeleton: N cards in a responsive grid ─────────
export function SkeletonEventGrid({ count = 6, style = {} }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: 16, ...style,
    }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
