import React from "react";
import { Sequence } from "remotion";
import { C, typeStyle } from "../brand/tokens";
import { Capture } from "./Capture";
import { Frame } from "./Frame";
import { FPS } from "./timeline";

export const Entire: React.FC = () => (
  <Frame
    title="Entire connects context to commits."
    source="Owner's actual Entire CLI screenshot"
    note="Build checkpoints, separate from runtime checkpoints"
    light
  >
    <Sequence from={0} durationInFrames={7 * FPS} layout="none">
      <Capture
        asset="entire.png"
        source={{ w: 2086, h: 1822 }}
        crop={{ x: 0, y: 365, w: 1900, h: 210 }}
        height={460}
        background={C.paper}
        duration={7}
        push={1.015}
      />
    </Sequence>
    <Sequence from={7 * FPS} durationInFrames={7 * FPS} layout="none">
      <Capture
        asset="entire.png"
        source={{ w: 2086, h: 1822 }}
        crop={{ x: 0, y: 1450, w: 2030, h: 330 }}
        height={460}
        background={C.paper}
        duration={7}
        push={1.015}
      />
    </Sequence>
    <div style={{ position: "absolute", top: 570, ...typeStyle("secondary", 42), color: C.ink }}>
      A saved checkpoint is tied to the change.
    </div>
  </Frame>
);

export const Economics: React.FC = () => (
  <Frame
    title="Price the recovery. State the assumptions."
    source="Owner's actual cfo.ai model recording"
    note="Forecasts · no actual customers or revenue"
    light
  >
    <Sequence from={0} durationInFrames={6 * FPS} layout="none">
      <Capture
        asset="cfo.mov"
        start={0}
        crop={{ x: 1470, y: 140, w: 1930, h: 1150 }}
        duration={6}
        background={C.paper}
      />
    </Sequence>
    <Sequence from={6 * FPS} durationInFrames={6 * FPS} layout="none">
      <Capture
        asset="cfo.mov"
        start={5}
        crop={{ x: 1510, y: 990, w: 1700, h: 520 }}
        duration={6}
        background={C.paper}
      />
    </Sequence>
    <Sequence from={12 * FPS} durationInFrames={6 * FPS} layout="none">
      <Capture
        asset="cfo-result.jpg"
        crop={{ x: 510, y: 1180, w: 920, h: 575 }}
        duration={6}
        background={C.paper}
      />
    </Sequence>
  </Frame>
);
