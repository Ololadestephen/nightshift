import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MARK, Mark, placeMark } from '../brand/Mark';
import { C, SAFE, TYPE, U, typeStyle } from '../brand/tokens';
import { arrive, blurIn, blurOut, depart, E, hitPulse, prog } from '../lib/anim';
import { breath, camera } from '../lib/camera';
import { mixColor } from '../lib/color';
import { baselineOf, measureTracked } from '../lib/measure';
import { settleOf } from '../lib/sync';
import { ACT, copy, CUE, f60, H, W } from '../timeline';

// ACT 1 — statement on landing paper; accent period ticks with each word, then the scene
// dissolves into the workspace (no mark handoff — the moon lockup is Act 5).

const L = (abs: number) => abs - ACT.statement.from;

const LINE = copy('statement');
const WORDS = LINE.text.split(' ');
const BEATS = [CUE.word1, CUE.word2, CUE.word3, CUE.word4].map(L);
if (BEATS.length !== WORDS.length) throw new Error('Act1: one CUE.word* per word of the statement');

const WORD_IN = f60(22);
const POP = settleOf(0, WORD_IN, E.out, 0.5);
const LOCK = L(CUE.lock);
const LOCK_IN = f60(12);
const SPREAD = 0.18;
const OUT = L(LINE.out);
const DOT = { d: 0.18, gap: 0.06 };

/** Dot settles after the pulse — used by sync.ts for a soft tock (no flight to the mark). */
export const DOT_TRAVEL = { from: CUE.pulse, to: CUE.exit, ease: E.smooth };

export const Act1: React.FC = () => {
  const f = useCurrentFrame();
  const disp = TYPE.display;

  const unit = measureTracked(LINE.text, 100, disp.weight, disp.track) / 100 - disp.track;
  const size = Math.min(disp.size * U, (W - 2 * SAFE.x) / (unit + DOT.gap + DOT.d + WORDS.length * SPREAD));
  const xs = WORDS.map((_, i) => (i ? measureTracked(WORDS.slice(0, i).join(' ') + ' ', size, disp.weight, disp.track) : 0));
  const textW = measureTracked(LINE.text, size, disp.weight, disp.track) - disp.track * size;
  const x0 = (W - textW - (DOT.gap + DOT.d) * size) / 2;
  const top = H / 2 - (size * disp.lead) / 2;
  const base = top + baselineOf(size, disp.weight, disp.lead);

  const lock = prog(f, LOCK - LOCK_IN, LOCK, E.contact);
  const spread = (i: number) => (i - WORDS.length / 2) * SPREAD * size * (1 - lock);
  const punch = 1 + 0.025 * hitPulse(f - LOCK);
  const push = breath(prog(f, LOCK, OUT, E.dolly), 0.03);

  const tick = Math.max(...BEATS.map((bt) => hitPulse(f - bt)));
  const pulse = 0.3 * tick + 0.35 * hitPulse(f - LOCK) + 0.2 * hitPulse(f - L(CUE.pulse));
  const fadeAll = prog(f, OUT, L(CUE.handoff), E.in);
  const toDesk = prog(f, OUT, L(CUE.handoff), E.smooth);

  const cam = { ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2, k: punch * push };
  const periodX = x0 + textW + (DOT.gap + DOT.d / 2) * size + spread(WORDS.length);
  const periodY = base - (DOT.d * size) / 2;
  const onScreen = { x: cam.sx + (periodX - cam.ax) * cam.k, y: cam.sy + (periodY - cam.ay) * cam.k };
  const dotSize = DOT.d * size * cam.k;
  const markSize = 100;
  const k = dotSize / ((2 * MARK.D.r) / 100) / markSize;
  const unitPx = (markSize / 100) * k;

  return (
    <AbsoluteFill style={{ background: mixColor(C.paper, C.canvas, toDesk), overflow: 'hidden' }}>
      <div style={{ ...camera(cam), opacity: 1 - fadeAll }}>
        {WORDS.map((w, i) => {
          const s = BEATS[i] - POP;
          const p = prog(f, s, s + WORD_IN, E.out);
          const o = OUT + (WORDS.length - 1 - i) * f60(3);
          const q = prog(f, o, o + f60(14), E.in);
          const fade = prog(f, o, o + f60(14), E.smooth);
          const blur = blurIn(p, 10) + blurOut(q, 8);
          return (
            <span
              key={i}
              data-text={`statement.${i}`}
              style={{
                ...typeStyle('display', size),
                position: 'absolute',
                left: 0,
                top: 0,
                color: mixColor(C.accent, C.ink, prog(f, BEATS[i], BEATS[i] + f60(14), E.smooth)),
                opacity: p * (1 - fade),
                filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
                transform: `translate(${x0 + xs[i] + spread(i)}px, ${top + ((1 - arrive(p)) * 0.32 + depart(q) * 0.2) * size}px)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      <div style={{ opacity: 1 - fadeAll }}>
        <Mark
          size={markSize}
          only={['D']}
          d={{ s: 1 + pulse }}
          style={placeMark(onScreen.x - MARK.D.cx * unitPx, onScreen.y - MARK.D.cy * unitPx, k)}
        />
      </div>
    </AbsoluteFill>
  );
};
