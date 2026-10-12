import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, SAFE, U, monoStyle, typeStyle } from '../brand/tokens';
import { E, hitPulse, prog, stagger } from '../lib/anim';
import { camera } from '../lib/camera';
import { ACT, copy, CUE, f60, H, W } from '../timeline';

// ACT 4 — sponsor evidence: neatlogs export, Entire build checkpoints, cfo.ai assumption forecast.

const L = (abs: number) => abs - ACT.evidence.from;

const CARDS = [
  { cue: CUE.neatlogs, id: 'neatlogs' as const, sub: 'No fabricated public dashboard URL' },
  { cue: CUE.entire, id: 'entire' as const, sub: 'Build context ≠ Nightshift job checkpoints' },
  { cue: CUE.cfo, id: 'cfo' as const, sub: 'Assumption model only' },
];

export const Act4: React.FC = () => {
  const f = useCurrentFrame();
  const out = prog(f, L(CUE.evidenceOut) - f60(28), L(CUE.evidenceOut), E.in);
  const nums = copy('cfoNums');
  const numsIn = prog(f, L(nums.in), L(nums.resolved), E.out);

  const punch =
    1 +
    0.015 * hitPulse(f - L(CUE.neatlogs)) +
    0.015 * hitPulse(f - L(CUE.entire)) +
    0.02 * hitPulse(f - L(CUE.cfo));
  const cam = camera({ ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2, k: punch });

  const cardW = 480 * U;
  const cardH = 200 * U;
  const gap = 28 * U;
  const totalW = cardW * 3 + gap * 2;
  const x0 = (W - totalW) / 2;
  const y0 = H / 2 - cardH / 2 - 60 * U;

  return (
    <AbsoluteFill style={{ background: C.canvas, overflow: 'hidden', opacity: 1 - out }}>
      <div style={cam}>
        <span
          style={{
            ...typeStyle('ui', 18 * U),
            position: 'absolute',
            left: 0,
            top: 0,
            color: C.faint,
            transform: `translate(${SAFE.x}px, ${SAFE.y}px)`,
          }}
        >
          Evidence required by neatHack
        </span>
        {CARDS.map((card, i) => {
          const local = L(card.cue);
          const p = prog(f, local, local + f60(22), E.out);
          const x = x0 + i * (cardW + gap);
          const y = y0 + (1 - p) * 36 + stagger(i, 3, 8);
          return (
            <div
              key={card.id}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: cardW,
                height: cardH,
                background: C.panel,
                border: `1.5px solid ${C.rule}`,
                opacity: p,
                transform: `translate(${x}px, ${y}px)`,
              }}
            >
              <span
                data-text={card.id}
                style={{
                  ...typeStyle('secondary', 28 * U),
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  color: C.text,
                  transform: `translate(${28 * U}px, ${36 * U}px)`,
                  whiteSpace: 'pre-wrap',
                  width: cardW - 56 * U,
                }}
              >
                {copy(card.id).text}
              </span>
              <span
                style={{
                  ...typeStyle('ui', 16 * U),
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  color: C.soft,
                  transform: `translate(${28 * U}px, ${120 * U}px)`,
                  whiteSpace: 'pre-wrap',
                  width: cardW - 56 * U,
                }}
              >
                {card.sub}
              </span>
            </div>
          );
        })}
        <span
          data-text="cfoNums"
          style={{
            ...monoStyle(22 * U),
            position: 'absolute',
            left: 0,
            top: 0,
            color: C.verified,
            opacity: numsIn,
            textAlign: 'center',
            width: W - 2 * SAFE.x,
            transform: `translate(${SAFE.x}px, ${y0 + cardH + 48 * U}px)`,
          }}
        >
          {nums.text}
        </span>
      </div>
    </AbsoluteFill>
  );
};
