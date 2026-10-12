// Nightshift brand tokens from docs/DESIGN.md and public/workspace.css / app.css.
// cinetic:brand-supplied primary #ce461e (action/signal), waiting #e6bc7c (workspace stamp),
// landing paper #f7f8f2 (product paper from DESIGN.md).
import type React from "react";
import { safeInsets } from "../lib/safe";
import { H, W } from "../timeline";

export const C = {
  // Landing (daylight)
  paper: "#f7f8f2",
  ink: "#152724",
  recovery: "#172e29",
  // Workspace (night shift)
  canvas: "#141b1b",
  panel: "#1a2222",
  inset: "#121a1a",
  text: "#eff0e8",
  soft: "#b1bbb4",
  faint: "#96a59b",
  rule: "#2a3532",
  // Status
  verified: "#9bcba1",
  checking: "#afd2d2",
  waiting: "#e6bc7c",
  accent: "#ce461e",
  white: "#FFFFFF",
  // Aliases used by stills / kit
  ink2: "#1a2222",
  mist: "#e8ebe3",
  line: "#c5ccc4",
  mute: "#5a6b64",
};

export const FONT = {
  text: '"Inter Variable", system-ui, sans-serif',
  mono: '"Geist Mono Variable", "Geist Mono", ui-monospace, monospace',
};

export const FACES = [
  '400 16px "Inter Variable"',
  '500 16px "Inter Variable"',
  '600 16px "Inter Variable"',
  '400 16px "Geist Mono Variable"',
];

export const U = Math.min(W, H) / 1080;

export const TYPE = {
  display: { size: 96, weight: 600, track: -0.04, lead: 1.02 },
  secondary: { size: 36, weight: 500, track: -0.015, lead: 1.2 },
  ui: { size: 22, weight: 500, track: -0.01, lead: 1.35 },
};

export const typeStyle = (
  role: keyof typeof TYPE,
  size = TYPE[role].size * U,
): React.CSSProperties => ({
  fontFamily: FONT.text,
  fontSize: size,
  fontWeight: TYPE[role].weight,
  letterSpacing: `${TYPE[role].track}em`,
  lineHeight: TYPE[role].lead,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "pre",
});

export const monoStyle = (size = TYPE.ui.size * U): React.CSSProperties => ({
  fontFamily: FONT.mono,
  fontSize: size,
  fontWeight: 400,
  letterSpacing: "0",
  lineHeight: 1.4,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "pre",
});

export const safeArea = (w: number, h: number) => {
  const i = safeInsets(undefined, w, h);
  return { x: Math.max(i.left, i.right), y: Math.max(i.top, i.bottom) };
};
export const SAFE = safeArea(W, H);

// Launch-film palette, independently approved in scope by the owner.
// It changes the motion-design stage, not the captured application screens.
export const LAUNCH_C = {
  stage: "#F4F8FC",
  surface: "#E2EEF7",
  line: "#B3CBDE",
  ink: "#16334A",
  muted: "#536F85",
  signal: "#2F789F",
  paper: "#FFFFFF",
};
