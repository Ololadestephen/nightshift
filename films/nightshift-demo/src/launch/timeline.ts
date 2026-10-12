export { FPS, BPM, BAR, W, H } from "../timeline";
import { FPS } from "../timeline";

export const SHOTS = [
  { id: "hook", seconds: 8 },
  { id: "reveal", seconds: 8 },
  { id: "inspect", seconds: 12 },
  { id: "repair", seconds: 10 },
  { id: "resume", seconds: 8 },
  { id: "verified", seconds: 8 },
  { id: "live", seconds: 10 },
  { id: "safety", seconds: 10 },
  { id: "improvement", seconds: 14 },
  { id: "entire", seconds: 10 },
  { id: "economics", seconds: 12 },
  { id: "close", seconds: 10 },
] as const;
export type ShotId = (typeof SHOTS)[number]["id"];
let cursor = 0;
export const ACT = Object.fromEntries(
  SHOTS.map(({ id, seconds }) => {
    const from = cursor;
    cursor += seconds * FPS;
    return [id, { from, dur: seconds * FPS }];
  }),
) as Record<ShotId, { from: number; dur: number }>;
export const TOTAL = cursor;
export const CUE = Object.fromEntries(SHOTS.map(({ id }) => [id, ACT[id].from + 30]));

// Picture events only: these are edit timings, not measured agent latencies.
export const MOTION = {
  hook: [30, 120, 240],
  reveal: [30, 180, 240],
  inspect: [30, 180, 360],
  repair: [30, 180, 360],
  resume: [30, 180, 300],
  verified: [30, 180],
  live: [30, 240],
  safety: [30, 210],
  improvement: [30, 210, 480],
  entire: [30, 240],
  economics: [30, 180, 420],
  close: [30, 150, 300],
} satisfies Record<ShotId, number[]>;
