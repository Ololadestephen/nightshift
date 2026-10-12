import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, SAFE, U, monoStyle, typeStyle } from '../brand/tokens';
import { E, hitPulse, prog } from '../lib/anim';
import { camera } from '../lib/camera';
import { ACT, copy, CUE, f60, H, W } from '../timeline';

// ACT 3 — Start Nightshift → Checking → Verified, with measured usage from the full-week run.

const L = (abs: number) => abs - ACT.check.from;

export const Act3: React.FC = () => {
  const f = useCurrentFrame();

  const startIn = prog(f, L(CUE.start), L(CUE.start) + f60(18), E.out);
  const checking = prog(f, L(CUE.checking), L(CUE.checking) + f60(16), E.out);
  const vIn = prog(f, L(CUE.verified), L(CUE.verified) + f60(18), E.out);
  const receiptIn = prog(f, L(CUE.receipt), L(CUE.receipt) + f60(22), E.out);
  const out = prog(f, L(CUE.checkOut) - f60(28), L(CUE.checkOut), E.in);

  const call1 = hitPulse(f - L(CUE.call1));
  const call2 = hitPulse(f - L(CUE.call2));
  const verifyHit = hitPulse(f - L(CUE.verified));

  const phase = f < L(CUE.checking) ? 'ready' : f < L(CUE.verified) ? 'checking' : 'verified';
  const stamp = phase === 'ready' ? 'Awaiting' : phase === 'checking' ? 'Checking' : 'Verified';
  const stampColor = phase === 'verified' ? C.verified : phase === 'checking' ? C.checking : C.waiting;

  const punch = 1 + 0.02 * verifyHit + 0.01 * call1 + 0.01 * call2;
  const cam = camera({ ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2, k: punch });

  const panelW = Math.min(980 * U, W - 2 * SAFE.x);
  const panelH = 520 * U;
  const px = (W - panelW) / 2;
  const py = (H - panelH) / 2;

  const modelCalls = f < L(CUE.call1) ? 0 : f < L(CUE.call2) ? 1 : 2;
  const usageLine =
    phase === 'checking' && modelCalls < 2
      ? 'Token counts appear when the model responds'
      : phase === 'verified'
        ? 'Run completed: verified. Model calls: 2. Tokens: 2165 in / 321 out.'
        : 'Live model ready.';

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
            transform: `translate(${px}px, ${py}px)`,
            opacity: startIn,
          }}
        >
          <span
            style={{
              ...typeStyle('ui', 20 * U),
              position: 'absolute',
              left: 0,
              top: 0,
              color: stampColor,
              transform: `translate(${40 * U}px, ${36 * U}px) scale(${1 + 0.06 * verifyHit})`,
              transformOrigin: '0 50%',
            }}
          >
            {stamp}
          </span>
          <span
            data-text="checking"
            style={{
              ...typeStyle('secondary', 32 * U),
              position: 'absolute',
              left: 0,
              top: 0,
              color: C.text,
              transform: `translate(${40 * U}px, ${88 * U}px)`,
            }}
          >
            {phase === 'checking' ? copy('checking').text : phase === 'verified' ? copy('verified').text : 'Live model ready.'}
          </span>
          <span
            style={{
              ...monoStyle(20 * U),
              position: 'absolute',
              left: 0,
              top: 0,
              color: C.soft,
              transform: `translate(${40 * U}px, ${170 * U}px)`,
            }}
          >
            {usageLine}
          </span>
          <span
            style={{
              ...typeStyle('ui', 20 * U),
              position: 'absolute',
              left: 0,
              top: 0,
              color: C.faint,
              transform: `translate(${40 * U}px, ${220 * U}px)`,
            }}
          >
            Tools: {modelCalls === 0 ? '—' : modelCalls === 1 ? 'inspect_job' : 'inspect_job → verify_artifact'}
          </span>

          {phase !== 'verified' && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 240 * U,
                height: 52 * U,
                background: C.accent,
                opacity: phase === 'checking' ? 0.45 : 1,
                transform: `translate(${40 * U}px, ${290 * U}px)`,
              }}
            />
          )}
          {phase !== 'verified' && (
            <span
              data-text="startBtn"
              style={{
                ...typeStyle('ui', 18 * U),
                position: 'absolute',
                left: 0,
                top: 0,
                color: C.white,
                transform: `translate(${64 * U}px, ${304 * U}px)`,
              }}
            >
              {copy('startBtn').text}
            </span>
          )}

          <span
            data-text="receipt"
            style={{
              ...monoStyle(22 * U),
              position: 'absolute',
              left: 0,
              top: 0,
              color: C.verified,
              opacity: receiptIn,
              transform: `translate(${40 * U}px, ${360 * U}px)`,
            }}
          >
            {copy('receipt').text}
          </span>
          <span
            style={{
              ...typeStyle('ui', 16 * U),
              position: 'absolute',
              left: 0,
              top: 0,
              color: C.faint,
              opacity: checking * (1 - vIn) + receiptIn,
              transform: `translate(${40 * U}px, ${460 * U}px)`,
            }}
          >
            Artifact reconciled to the submitted dataset. Evidence preserved.
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
