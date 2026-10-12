import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { C, typeStyle } from "../brand/tokens";
import { Capture } from "./Capture";
import { Frame } from "./Frame";
import { FPS } from "./timeline";

export const LiveReport: React.FC = () => (
  <Frame
    title="Check the deliverable."
    source="Actual app recording · selected excerpts"
    note="Healthy report verification · October 11"
  >
    <Sequence from={0} durationInFrames={6 * FPS} layout="none">
      <Capture
        asset="live.mov"
        start={9}
        crop={{ x: 460, y: 120, w: 2850, h: 1500 }}
        duration={6}
      />
    </Sequence>
    <Sequence from={6 * FPS} durationInFrames={6 * FPS} layout="none">
      <Capture
        asset="live.mov"
        start={15}
        crop={{ x: 1930, y: 520, w: 1430, h: 580 }}
        duration={6}
      />
    </Sequence>
    <Sequence from={12 * FPS} durationInFrames={6 * FPS} layout="none">
      <Capture
        asset="live.mov"
        start={21}
        crop={{ x: 460, y: 300, w: 2850, h: 1080 }}
        duration={6}
      />
    </Sequence>
    <Sequence from={18 * FPS} durationInFrames={4 * FPS} layout="none">
      <Capture asset="live-result.jpg" crop={{ x: 1940, y: 390, w: 1370, h: 950 }} duration={6} />
    </Sequence>
  </Frame>
);

export const Safety: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Frame
      title="Protect active workers."
      source="Controlled safety test · deterministic checker"
      note="No model calls"
    >
      <Sequence from={0} durationInFrames={8 * FPS} layout="none">
        <Capture
          asset="safety.mov"
          start={2}
          crop={{ x: 460, y: 280, w: 2950, h: 1180 }}
          push={1}
          duration={8}
        />
      </Sequence>
      <Sequence from={8 * FPS} durationInFrames={10 * FPS} layout="none">
        <Capture
          asset="safety-result.jpg"
          crop={{ x: 510, y: 250, w: 2890, h: 1200 }}
          push={1}
          duration={8}
        />
      </Sequence>
      {frame > 10 * FPS && (
        <div
          style={{
            position: "absolute",
            right: 70,
            bottom: 15,
            background: C.canvas,
            padding: "14px 24px",
            color: C.text,
            ...typeStyle("ui", 30),
          }}
        >
          Escalated: active_lease
        </div>
      )}
    </Frame>
  );
};
