import type { SoundEvent } from "../sync";
import { ACT } from "./timeline";

// Gentle section cues for the picture edit. No synthesized "click" stands in for a real action.
export default function cues(): SoundEvent[] {
  return Object.entries(ACT).map(([id, chapter], index) => ({
    f: chapter.from + 30,
    kind: "bell",
    weight: id === "close" ? 0.55 : 0.25,
    pitch: ["G5", "B5", "D6"][index % 3],
    pan: 0,
    variant: "soft",
    id: `chapter-${id}`,
  }));
}
