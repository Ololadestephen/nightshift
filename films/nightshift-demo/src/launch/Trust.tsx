import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { Capture } from "../evidence/Capture";
import { E, prog } from "../lib/anim";
import { Move, Stage } from "./Kit";
import { P, mono, text } from "./style";
export { Improvement } from "./IncidentReview";

export const Live: React.FC = () => (
  <Stage
    label="IN THE APP"
    title={
      <>
        A checked report.
        <br />
        <span style={{ color: P.signal }}>Ready to download.</span>
      </>
    }
    source="Separate healthy report check · actual app capture · job_bb20c9a8… · October 11"
  >
    <Move at={30} style={{ position: "absolute", left: 95, top: 410 }}>
      <div style={text(140)}>
        4<span style={{ ...text(43), color: P.muted, marginLeft: 24 }}>rows</span>
      </div>
      <div style={{ ...text(110), marginTop: 32, color: P.signal }}>
        44<span style={{ ...text(42), color: P.muted, marginLeft: 24 }}>minutes</span>
      </div>
      <div style={{ ...mono(27), color: P.muted, marginTop: 48 }}>2 model calls</div>
    </Move>
    <Move at={60} style={{ position: "absolute", left: 720, top: 370, width: 1080, height: 510 }}>
      <Capture
        asset="live-result.jpg"
        crop={{ x: 1940, y: 1330, w: 1370, h: 650 }}
        width={1080}
        height={510}
        duration={10}
        push={1.02}
        background={P.stage}
      />
    </Move>
    <Sequence from={240} durationInFrames={240} layout="none">
      <div style={{ position: "absolute", left: 720, top: 370 }}>
        <Capture
          asset="live.mov"
          start={36}
          crop={{ x: 1940, y: 1330, w: 1370, h: 650 }}
          width={1080}
          height={510}
          duration={4}
          push={1.02}
          background={P.stage}
        />
      </div>
    </Sequence>
    <Move
      at={240}
      style={{ position: "absolute", left: 735, top: 899, ...mono(23), color: P.muted }}
    >
      Input, identity, totals and artifact checks passed.
    </Move>
  </Stage>
);

export const Safety: React.FC = () => {
  const f = useCurrentFrame();
  const p = prog(f, 90, 135, E.cam);
  return (
    <Stage
      label="POLICY / ACTIVE LEASE"
      title={
        <>
          An active worker
          <br />
          <span style={{ color: P.signal }}>stays protected.</span>
        </>
      }
      source="Labelled controlled safety lab · deterministic checker · 0 model calls"
    >
      <div
        style={{
          position: "absolute",
          left: 110,
          top: 450,
          width: 610,
          height: 320,
          background: P.surface,
          padding: 35,
          boxSizing: "border-box",
        }}
      >
        <div style={{ ...mono(26), color: P.muted }}>ATTEMPTED PATH</div>
        <div style={{ ...text(43), marginTop: 38 }}>Reclaim lease</div>
        <div
          style={{
            ...text(40),
            marginTop: 40,
            color: P.signal,
            transform: `translateX(${p * 95}px)`,
          }}
        >
          → │ Escalate
        </div>
      </div>
      <Move at={210} style={{ position: "absolute", left: 850, top: 430 }}>
        <Capture
          asset="safety-result.jpg"
          crop={{ x: 1935, y: 600, w: 1380, h: 475 }}
          width={910}
          height={370}
          duration={10}
          push={1}
          background={P.stage}
        />
      </Move>
      <Move
        at={240}
        style={{ position: "absolute", left: 870, top: 841, ...mono(32), color: P.signal }}
      >
        escalated: active_lease
      </Move>
    </Stage>
  );
};
