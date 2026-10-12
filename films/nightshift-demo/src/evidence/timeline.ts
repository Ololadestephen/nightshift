import { FPS, BPM, BEAT, BAR, W, H } from "../timeline";

export { FPS, BPM, BEAT, BAR, W, H };
export const TAIL = FPS;

export const CHAPTERS = [
  { id: "problem", title: "Stopped. Not erased.", seconds: 12 },
  { id: "architecture", title: "Choice, inside policy.", seconds: 16 },
  { id: "recovery", title: "Resume. Reconcile.", seconds: 42 },
  { id: "safety", title: "Protect active workers.", seconds: 18 },
  { id: "improvement", title: "Failure becomes evidence.", seconds: 24 },
  { id: "live", title: "Check the deliverable.", seconds: 22 },
  { id: "entire", title: "Entire connects context to commits.", seconds: 14 },
  { id: "cfo", title: "Price the recovery. State the assumptions.", seconds: 18 },
  { id: "close", title: "Unfinished reports. Verified outcomes.", seconds: 9 },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];
let cursor = 0;
export const ACT = Object.fromEntries(
  CHAPTERS.map((chapter) => {
    const from = cursor;
    cursor += chapter.seconds * FPS;
    return [chapter.id, { from, dur: chapter.seconds * FPS }];
  }),
) as Record<ChapterId, { from: number; dur: number }>;
export const TOTAL = cursor;

// This longer evidence walkthrough leaves time to read source screens and record narration.
export const CUE = Object.fromEntries(
  Array.from({ length: (TOTAL - TAIL) / BAR }, (_, index) => [`bar${index + 1}`, index * BAR]),
);
export const COPY = CHAPTERS.map((chapter) => ({
  id: chapter.id,
  text: chapter.title,
  in: ACT[chapter.id].from,
  resolved: ACT[chapter.id].from + 30,
  out: ACT[chapter.id].from + ACT[chapter.id].dur,
  kind: "ui" as const,
}));
