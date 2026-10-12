import React from "react";
import { Sequence } from "remotion";
import { Capture, type Crop } from "../evidence/Capture";
import { Move, Stage } from "./Kit";
import { P, mono, text } from "./style";
import { FPS } from "./timeline";

// Source seconds are from the owner's October 12 recording, not runtime latency.
const SHOTS: readonly {
  from: number;
  frames: number;
  start: number;
  crop: Crop;
  label: string;
  heading: string;
  detail: string;
}[] = [
  {
    from: 0,
    frames: 240,
    start: 6,
    crop: { x: 565, y: 145, w: 1870, h: 1260 },
    label: "01 / INCIDENT EVIDENCE",
    heading: "The failure, surfaced.",
    detail: "October 12 incident review of the earlier sequencing defect.",
  },
  {
    from: 240,
    frames: 240,
    start: 22,
    crop: { x: 1080, y: 920, w: 1450, h: 1030 },
    label: "02 / BEFORE",
    heading: "Reclaimed. Then escalated.",
    detail: "The tool catalog did not offer resume after a successful reclaim.",
  },
  {
    from: 480,
    frames: 360,
    start: 39,
    crop: { x: 1080, y: 340, w: 1450, h: 1120 },
    label: "03 / AFTER",
    heading: "Resumed. Then verified.",
    detail: "Catalog corrected. Original report completed with no mismatches.",
  },
];

export const Improvement: React.FC = () => (
  <Stage
    label="neatlogs / INCIDENT + TRACE EVIDENCE"
    title={
      <>
        Find the failure. <span style={{ color: P.signal }}>Verify the fix.</span>
      </>
    }
    source="Retrospective incident review · separate October 10 runs · trace timings measure export"
  >
    {SHOTS.map((shot) => (
      <Sequence key={shot.label} from={shot.from} durationInFrames={shot.frames} layout="none">
        <Move at={shot.from === 0 ? 20 : 0} style={{ position: "absolute", left: 90, top: 310 }}>
          <Capture
            asset="incident-review.mov"
            start={shot.start}
            crop={shot.crop}
            width={1160}
            height={640}
            duration={shot.frames / FPS}
            push={1}
            background={P.stage}
          />
        </Move>
        <Move style={{ position: "absolute", left: 1330, top: 380, width: 480 }}>
          <div style={{ ...mono(22), color: P.signal }}>{shot.label}</div>
          <div style={{ ...text(48), lineHeight: 1.13, marginTop: 35 }}>{shot.heading}</div>
          <div style={{ ...text(29, 500), lineHeight: 1.45, marginTop: 35, color: P.muted }}>
            {shot.detail}
          </div>
        </Move>
      </Sequence>
    ))}
  </Stage>
);
