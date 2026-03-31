import { Shield, Microscope, GraduationCap } from "lucide-react";
import { C } from "../../ui";

// ─── Role badge config ───────────────────────────────────────
export const ROLE_CONFIG = {
  admin:   { label: "Head Coach", icon: Shield,         color: C.coral,   bg: "#F5E2DC" },
  coach:   { label: "Coach",      icon: Microscope,     color: C.gold,    bg: C.goldLight },
  student: { label: "Student",    icon: GraduationCap,  color: C.tealDark, bg: "#E2F0E6" },
};

export const TYPE_COLORS = {
  study: { bg: C.goldLight, text: "#A0522D" },
  lab:   { bg: "#E2F0E6", text: C.tealDark },
  build: { bg: "#F5E2DC", text: C.coral },
};
