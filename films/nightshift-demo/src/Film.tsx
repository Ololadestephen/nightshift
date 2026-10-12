import React from 'react';
import { AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile } from 'remotion';
import { Act1 } from './acts/Act1';
import { Act2 } from './acts/Act2';
import { Act3 } from './acts/Act3';
import { Act4 } from './acts/Act4';
import { Act5 } from './acts/Act5';
import { C } from './brand/tokens';
import { Audit } from './lib/Audit';
import { FontGate } from './lib/FontGate';
import type { SafeSpec } from './lib/safe';
import { ACT } from './timeline';

export const SOUNDTRACK = 'audio/soundtrack.wav';

export type FilmProps = { audit?: boolean; safe?: SafeSpec };

export const Film: React.FC<FilmProps> = ({ audit = false, safe }) => {
  const hasScore = getStaticFiles().some((s) => s.name === SOUNDTRACK);
  return (
    <FontGate>
      <AbsoluteFill style={{ background: C.paper }}>
        <Sequence from={ACT.statement.from} durationInFrames={ACT.statement.dur} name="1 Statement">
          <Act1 />
        </Sequence>
        <Sequence from={ACT.desk.from} durationInFrames={ACT.desk.dur} name="2 Desk">
          <Act2 />
        </Sequence>
        <Sequence from={ACT.check.from} durationInFrames={ACT.check.dur} name="3 Check">
          <Act3 />
        </Sequence>
        <Sequence from={ACT.evidence.from} durationInFrames={ACT.evidence.dur} name="4 Evidence">
          <Act4 />
        </Sequence>
        <Sequence from={ACT.mark.from} durationInFrames={ACT.mark.dur} name="5 Mark">
          <Act5 />
        </Sequence>
        {hasScore && <Html5Audio src={staticFile(SOUNDTRACK)} />}
        {audit && <Audit safe={safe} />}
      </AbsoluteFill>
    </FontGate>
  );
};
