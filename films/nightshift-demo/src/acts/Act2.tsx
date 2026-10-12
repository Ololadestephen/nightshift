import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, SAFE, TYPE, U, monoStyle, typeStyle } from '../brand/tokens';
import { E, hitPulse, prog } from '../lib/anim';
import { camera } from '../lib/camera';
import { ACT, copy, CUE, f60, H, W } from '../timeline';

// ACT 2 — dark workspace desk: a report awaits verification; active lease blocks reclaim.

const L = (abs: number) => abs - ACT.desk.from;

export const Act2: React.FC = () => {
  const f = useCurrentFrame();
  const title = copy('deskTitle');
  const lease = copy('leaseLine');

  const panelIn = prog(f, L(CUE.deskIn), L(CUE.deskIn) + f60(28), E.out);
  const leaseIn = prog(f, L(CUE.lease), L(CUE.lease) + f60(20), E.out);
  const refusePulse = hitPulse(f - L(CUE.refuse));
  const out = prog(f, L(CUE.deskOut) - f60(30), L(CUE.deskOut), E.in);

  const punch = 1 + 0.012 * refusePulse;
  const cam = camera({ ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2, k: punch });

  const panelW = Math.min(920 * U, W - 2 * SAFE.x);
  const panelH = 420 * U;
  const px = (W - panelW) / 2;
  const py = (H - panelH) / 2;

  return (
    <AbsoluteFill style={{ background: C.canvas, overflow: 'hidden', opacity: 1 - out }}>
      <div style={cam}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: panelW,
            height: panelH,
            background: C.panel,
            border: `1.5px solid ${C.rule}`,
            transform: `translate(${px}px, ${py + (1 - panelIn) * 40}px)`,
            opacity: panelIn,
          }}
        >
          <span
            style={{
              ...typeStyle('ui', 18 * U),
              position: 'absolute',
              left: 0,
              top: 0,
              color: C.waiting,
              transform: `translate(${36 * U}px, ${32 * U}px)`,
            }}
          >
            Awaiting verification
          </span>
          <span
            data-text="deskTitle"
            style={{
              ...typeStyle('secondary', TYPE.secondary.size * U),
              position: 'absolute',
              left: 0,
              top: 0,
              color: C.text,
              transform: `translate(${36 * U}px, ${72 * U}px)`,
            }}
          >
            {title.text}
          </span>
          <span
            style={{
              ...monoStyle(18 * U),
              position: 'absolute',
              left: 0,
              top: 0,
              color: C.faint,
              transform: `translate(${36 * U}px, ${140 * U}px)`,
            }}
          >
            job_e8039ddb · full-week · 28 rows
          </span>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: panelW - 72 * U,
              height: 1.5,
              background: C.rule,
              transform: `translate(${36 * U}px, ${200 * U}px)`,
            }}
          />
          <span
            data-text="leaseLine"
            style={{
              ...typeStyle('ui', 22 * U),
              position: 'absolute',
              left: 0,
              top: 0,
              color: leaseIn > 0 ? C.checking : C.faint,
              opacity: Math.max(0.35, leaseIn),
              transform: `translate(${36 * U}px, ${232 * U}px)`,
            }}
          >
            {lease.text}
          </span>
          <span
            style={{
              ...typeStyle('ui', 18 * U),
              position: 'absolute',
              left: 0,
              top: 0,
              color: C.soft,
              opacity: leaseIn,
              transform: `translate(${36 * U}px, ${280 * U}px)`,
            }}
          >
            Policy holds the active worker. Evidence stays.
          </span>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 220 * U,
              height: 48 * U,
              background: C.accent,
              opacity: 0.35 + 0.65 * panelIn,
              transform: `translate(${36 * U}px, ${340 * U}px) scale(${1 + 0.04 * refusePulse})`,
              transformOrigin: '0 50%',
            }}
          />
          <span
            style={{
              ...typeStyle('ui', 18 * U),
              position: 'absolute',
              left: 0,
              top: 0,
              color: C.white,
              transform: `translate(${56 * U}px, ${352 * U}px)`,
              opacity: panelIn,
            }}
          >
            Start Nightshift
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
