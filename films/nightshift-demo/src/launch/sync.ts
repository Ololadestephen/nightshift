import type { SoundEvent } from "../sync";
import { ACT, MOTION, SHOTS } from "./timeline";

export default function cues(): SoundEvent[] {
  return SHOTS.flatMap(({ id }, index) =>
    MOTION[id].map(
      (at, i) =>
        ({
          f: ACT[id].from + at,
          kind: i === 0 ? "bell" : "tock",
          weight: i === 0 ? 0.45 : 0.25,
          pitch: ["G5", "B5", "D6"][index % 3],
          pan: 0,
          variant: "soft",
          id: `${id}-picture-${i}`,
        }) satisfies SoundEvent,
    ),
  );
}
