import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile } from "remotion";
import { FontGate } from "../lib/FontGate";
import { C } from "../brand/tokens";
import { Problem, Architecture, Close } from "./Graphics";
import { LiveReport, Safety } from "./Reports";
import { Recovery, Improvement } from "./Recovery";
import { Entire, Economics } from "./Sponsors";
import { ACT, type ChapterId } from "./timeline";
import { Progress } from "./Frame";

const scenes: Record<ChapterId, React.FC> = {
  problem: Problem,
  architecture: Architecture,
  live: LiveReport,
  recovery: Recovery,
  safety: Safety,
  improvement: Improvement,
  entire: Entire,
  cfo: Economics,
  close: Close,
};

export const EvidenceFilm: React.FC<{ music?: boolean }> = ({ music = false }) => (
  <FontGate>
    <AbsoluteFill style={{ background: C.canvas }}>
      {Object.entries(ACT).map(([id, timing]) => {
        const Scene = scenes[id as ChapterId];
        return (
          <Sequence key={id} name={id} from={timing.from} durationInFrames={timing.dur}>
            <Scene />
          </Sequence>
        );
      })}
      {music && <Html5Audio src={staticFile("audio/evidence-bed.wav")} volume={0.35} />}
      <Progress />
    </AbsoluteFill>
  </FontGate>
);
