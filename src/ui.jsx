// ═══════════════════════════════════════════════════════════════
//  Shared UI constants — extracted from prototype
//  Import these in both prototype (App.jsx) and production mode
//  (Constants and components co-located intentionally)
// ═══════════════════════════════════════════════════════════════
/* eslint-disable react-refresh/only-export-components */

// DW Trojan Branding
export const C = {
  navy: "#1B3A2D", navyMid: "#234A38", navyLight: "#2D5A45",
  gold: "#C0652A", goldLight: "#FCEEE4",
  teal: "#2E8B57", tealDark: "#1E6B42",
  coral: "#B84233",
  white: "#FFFFFF", offWhite: "#F7F8F6",
  gray100: "#F0F2EE", gray200: "#DDE1D9", gray400: "#8E9688", gray600: "#5E6658",
  slate: "#6B7D94", slateBg: "#E8ECF1",
};

// DW Trojan SVG helmet icon
export const TROJAN_SVG = (size = 28) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 8C35 8 22 18 18 32L15 45C14 50 16 55 20 58L25 62V78C25 85 30 92 40 95L50 98L60 95C70 92 75 85 75 78V62L80 58C84 55 86 50 85 45L82 32C78 18 65 8 50 8Z" fill={C.navy} />
    <path d="M35 35L30 55L40 50L50 65L60 50L70 55L65 35L55 42L50 30L45 42L35 35Z" fill={C.gold} />
    <path d="M38 70V82C38 86 42 90 50 92C58 90 62 86 62 82V70L50 78L38 70Z" fill={C.tealDark} />
  </svg>
);

// Event type color mapping
export const TYPE_COLORS = {
  study: { bg: C.goldLight, text: "#A0522D", label: "Study" },
  lab: { bg: "#E2F0E6", text: C.tealDark, label: "Lab / Process" },
  build: { bg: "#F5E2DC", text: C.coral, label: "Build" },
};
