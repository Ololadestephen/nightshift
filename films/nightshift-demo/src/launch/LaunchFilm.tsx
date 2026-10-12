import React from "react";
import { Sequence } from "remotion";
import { FontGate } from "../lib/FontGate";
import { Hook, Reveal, Inspect, Repair, Resume, Verified } from "./Recovery";
import { Live, Safety, Improvement } from "./Trust";
import { Entire, Economics, Close } from "./Build";
import { ACT, SHOTS, ShotId } from "./timeline";

const scenes: Record<ShotId, React.FC> = {
  hook: Hook,
  reveal: Reveal,
  inspect: Inspect,
  repair: Repair,
  resume: Resume,
  verified: Verified,
  live: Live,
  safety: Safety,
  improvement: Improvement,
  entire: Entire,
  economics: Economics,
  close: Close,
};
export const LaunchFilm: React.FC = () => (
  <FontGate>
    {SHOTS.map(({ id }) => {
      const Scene = scenes[id];
      return (
        <Sequence key={id} from={ACT[id].from} durationInFrames={ACT[id].dur}>
          <Scene />
        </Sequence>
      );
    })}
  </FontGate>
);
