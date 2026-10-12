import React from 'react';
import { C } from './tokens';

// Nightshift moon mark: crescent + star spark (from public/ui.js moon path), plus the accent
// checkpoint dot as the film device. Geometry on a 100-unit box; gaps stay open at 16 px.
export const MARK = {
  // Crescent moon (scaled from 24→100 viewBox path)
  A: {
    d: 'M85.4 54.2A35.4 35.4 0 0 1 45.8 14.6 35.4 35.4 0 1 0 85.4 54.2Z',
    cx: 62,
    cy: 50,
    w: 70,
    h: 70,
  },
  // Star spark near the sickle
  B: {
    // small four-point spark approximated as a diamond stacked on a cross via path
    d: 'M70.8 12.5 L72.9 18.75 L79.2 20.8 L72.9 22.9 L70.8 29.2 L68.75 22.9 L62.5 20.8 L68.75 18.75 Z',
    cx: 70.8,
    cy: 20.8,
    w: 16.7,
    h: 16.7,
  },
  // Checkpoint / period dot — story device
  D: { cx: 78, cy: 78, r: 14 },
};

export type Piece = 'A' | 'B' | 'D';

export type PieceXf = { x?: number; y?: number; rot?: number; s?: number; sx?: number; sy?: number; o?: number; origin?: [number, number] };

const xf = (p: PieceXf | undefined, cx: number, cy: number) => {
  if (!p) return undefined;
  const [ox, oy] = p.origin ?? [cx, cy];
  const sx = Math.max(0, (p.s ?? 1) * (p.sx ?? 1));
  const sy = Math.max(0, (p.s ?? 1) * (p.sy ?? 1));
  return `translate(${p.x ?? 0} ${p.y ?? 0}) rotate(${p.rot ?? 0} ${ox} ${oy}) translate(${ox} ${oy}) scale(${sx} ${sy}) translate(${-ox} ${-oy})`;
};

export const Mark: React.FC<{
  size: number;
  ink?: string;
  dot?: string;
  a?: PieceXf;
  b?: PieceXf;
  d?: PieceXf;
  only?: Piece[];
  style?: React.CSSProperties;
}> = ({ size, ink = C.ink, dot = C.accent, a, b, d, only, style }) => {
  const { A, B, D } = MARK;
  const show = (p: Piece) => !only || only.includes(p);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible', display: 'block', ...style }}>
      {show('A') && <path d={A.d} fill={ink} transform={xf(a, A.cx, A.cy)} opacity={a?.o ?? 1} />}
      {show('B') && <path d={B.d} fill={ink} transform={xf(b, B.cx, B.cy)} opacity={b?.o ?? 1} />}
      {show('D') && <circle cx={D.cx} cy={D.cy} r={D.r} fill={dot} transform={xf(d, D.cx, D.cy)} opacity={d?.o ?? 1} />}
    </svg>
  );
};

export const placeMark = (x: number, y: number, k = 1): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  transformOrigin: '0 0',
  transform: `translate(${x}px, ${y}px) scale(${Math.max(1e-4, k)})`,
});
