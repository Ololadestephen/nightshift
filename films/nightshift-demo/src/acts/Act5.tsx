import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MARK, Mark, placeMark } from '../brand/Mark';
import { C, SAFE, TYPE, U, typeStyle } from '../brand/tokens';
import { camera } from '../lib/camera';
import { E, hitPulse, lmix, mix, prog, spr, SPR, squash } from '../lib/anim';
import { baselineOf, inkBox, measureTracked } from '../lib/measure';
import { delayTo } from '../lib/sync';
import { ACT, copy, CUE, f60, H, W } from '../timeline';

// ACT 5 — moon mark assembles; Nightshift lockup holds through the tail.

const L = (abs: number) => abs - ACT.mark.from;

export const HERO = { size: 300 * U, x: W / 2 - 150 * U, y: H / 2 - 150 * U };

const LAND = SPR.snap;
const CONTACT = { a: L(CUE.pieceA), b: L(CUE.pieceB) };
const START = { a: CONTACT.a - delayTo(LAND), b: CONTACT.b - delayTo(LAND) };

const NAME = copy('wordmark');
export const LOCKUP_MOVE = { from: NAME.in, to: NAME.resolved, ease: E.inOut };
const DOLLY = { from: L(CUE.lockup) - f60(20), to: ACT.mark.dur, k: 1.15 };

export const Act5: React.FC = () => {
  const f = useCurrentFrame();

  const sa = f >= CONTACT.a ? 1 : spr(f, START.a, LAND);
  const sb = f >= CONTACT.b ? 1 : spr(f, START.b, LAND);
  const qa = squash(f - CONTACT.a);
  const qb = squash(f - CONTACT.b);
  const born = (s: number) => prog(f, s, s + f60(6), E.smooth);
  const a = { y: (1 - sa) * -100, rot: (1 - sa) * 8, sx: qa.across, sy: qa.along, origin: [62, 50] as [number, number], o: born(START.a) };
  const b = { y: (1 - sb) * -80, rot: (1 - sb) * -10, sx: qb.across, sy: qb.along, origin: [70.8, 20.8] as [number, number], o: born(START.b) };

  const disp = TYPE.display;
  const per100 = { w: measureTracked(NAME.text, 100, disp.weight, disp.track) / 100, asc: inkBox(NAME.text, 100, disp.weight).ascent / 100 };
  const nameSize = Math.min(disp.size * 1.35 * U, (W - 2 * SAFE.x) / (per100.w + 1.3 * per100.asc));
  const nameW = per100.w * nameSize;
  const M1 = per100.asc * nameSize;
  const gap = 0.3 * M1;
  const lockW = M1 + gap + nameW;
  const base = H / 2 + M1 / 2;
  const end = { x: (W - lockW) / 2, y: base - M1 };

  const lk = prog(f, L(LOCKUP_MOVE.from), L(LOCKUP_MOVE.to), LOCKUP_MOVE.ease);
  const k = lmix(1, M1 / HERO.size, lk);
  const mx = mix(HERO.x, end.x, lk);
  const my = mix(HERO.y, end.y, lk);
  const markRight = mx + HERO.size * k;
  const nameX = markRight + gap - (1 - lk) * (nameW + gap);
  const maskX = markRight + gap * 0.5;
  const nameTop = base - baselineOf(nameSize, disp.weight, 1);

  const punch = 1 + 0.025 * hitPulse(f - CONTACT.a) + 0.03 * hitPulse(f - CONTACT.b) + 0.015 * hitPulse(f - L(CUE.lockup));
  const dolly = lmix(1, DOLLY.k, prog(f, DOLLY.from, DOLLY.to, E.dolly));
  const cam = camera({ ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2, k: punch * dolly });

  const tick = Math.max(...[CUE.tick1, CUE.tick2, CUE.tick3].map((c) => hitPulse(f - L(c))));
  const d = { s: 1 + 0.06 * tick + 0.05 * (hitPulse(f - CONTACT.a) + hitPulse(f - CONTACT.b)) };

  // Fade from workspace canvas into landing paper for the lockup.
  const toPaper = prog(f, 0, f60(36), E.smooth);

  return (
    <AbsoluteFill style={{ background: toPaper > 0.5 ? C.paper : C.canvas, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: C.paper,
          opacity: toPaper,
        }}
      />
      <div style={cam}>
        <Mark size={HERO.size} ink={C.ink} a={a} b={b} d={d} style={placeMark(mx, my, k)} />
        {lk > 0 && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden', transform: `translateX(${maskX}px)` }}>
            <span
              data-text="wordmark"
              style={{ ...typeStyle('display', nameSize), lineHeight: 1, color: C.ink, position: 'absolute', left: 0, top: 0, transform: `translate(${nameX - maskX}px, ${nameTop}px)` }}
            >
              {NAME.text}
            </span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export const DOT_SLOT = {
  x: HERO.x + (MARK.D.cx / 100) * HERO.size,
  y: HERO.y + (MARK.D.cy / 100) * HERO.size,
  d: ((2 * MARK.D.r) / 100) * HERO.size,
};
