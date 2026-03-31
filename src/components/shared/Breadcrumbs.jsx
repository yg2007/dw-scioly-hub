import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { C } from '../../ui';

/**
 * Breadcrumbs component
 * @param {Array} items - [{ label, path? }] — last item has no path (current page)
 */
export default function Breadcrumbs({ items }) {
  const navigate = useNavigate();
  if (!items || items.length <= 1) return null;

  return (
    <nav style={{
      display: "flex", alignItems: "center", gap: 4,
      marginBottom: 16, fontSize: 13, flexWrap: "wrap",
    }}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {i > 0 && <ChevronRight size={12} color={C.gray400} />}
            {isLast ? (
              <span style={{ fontWeight: 600, color: C.navy }}>{item.label}</span>
            ) : (
              <button onClick={() => navigate(item.path)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: C.gray400, fontWeight: 500, fontFamily: "inherit",
                fontSize: 13, padding: 0,
              }}>
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
