import type React from "react";
import { LAUNCH_C } from "../brand/tokens";

// The owner explicitly freed the film from the current application's palette.
// The owner selected white/cool blue. Steel blue marks a legal next action;
// source proof clips retain their real colors.
export const P = LAUNCH_C;
export const FACE = {
  text: '"Inter Variable", sans-serif',
  mono: '"Geist Mono Variable", monospace',
};
export const text = (size: number, weight = 600): React.CSSProperties => ({
  fontFamily: FACE.text,
  fontSize: size,
  fontWeight: weight,
  letterSpacing: "-0.045em",
  lineHeight: 1.04,
  fontVariantNumeric: "tabular-nums",
});
export const mono = (size: number): React.CSSProperties => ({
  fontFamily: FACE.mono,
  fontSize: size,
  fontWeight: 400,
  lineHeight: 1.35,
  fontVariantNumeric: "tabular-nums",
});
