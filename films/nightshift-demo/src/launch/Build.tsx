import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Capture } from "../evidence/Capture";
import { Mark } from "../brand/Mark";
import { E, prog } from "../lib/anim";
import { Move, Stage } from "./Kit";
import { P, text, mono } from "./style";

export const Entire: React.FC = () => (
  <Stage
    label="Entire / BUILD CONTEXT"
    title={
      <>
        The build has
        <br />
        <span style={{ color: P.signal }}>a record, too.</span>
      </>
    }
    source="Owner's actual CLI capture · Entire build checkpoints are separate from runtime recovery checkpoints"
  >
    <Move at={30} style={{ position: "absolute", left: 105, top: 400, width: 1700, height: 210 }}>
      <Capture
        asset="entire.png"
        source={{ w: 2086, h: 1822 }}
        crop={{ x: 0, y: 365, w: 1900, h: 210 }}
        width={1700}
        height={210}
        background={P.stage}
        duration={10}
        push={1}
      />
    </Move>
    <Move at={240} style={{ position: "absolute", left: 105, top: 680 }}>
      <div style={{ ...mono(30), color: P.signal }}>01M4NC4K7WZ998WC30FYRAQ1X3</div>
      <div style={{ ...text(44), marginTop: 32 }}>Checkpoint → commit 7bb0de2</div>
    </Move>
    <div style={{ position: "absolute", left: 1110, top: 670 }}>
      <Capture
        asset="entire.png"
        source={{ w: 2086, h: 1822 }}
        crop={{ x: 0, y: 1450, w: 2030, h: 330 }}
        width={690}
        height={210}
        background={P.stage}
        duration={10}
        push={1}
      />
    </div>
  </Stage>
);

export const Economics: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage
      label="cfo.ai / BUSINESS MODEL"
      title={
        <>
          Price the recovery.
          <br />
          <span style={{ color: P.signal }}>Make assumptions visible.</span>
        </>
      }
      source="Actual cfo.ai model · assumed prices and costs · no actual customers or revenue"
    >
      <div style={{ position: "absolute", left: 95, top: 415, display: "flex", gap: 25 }}>
        {[
          ["$49", "per recovery run"],
          ["$0.15", "model cost / run"],
          ["$25", "infrastructure / month"],
        ].map(([amount, unit], i) => (
          <Move
            key={amount}
            at={30 + i * 45}
            style={{
              width: 550,
              height: 310,
              background: P.surface,
              padding: 35,
              boxSizing: "border-box",
            }}
          >
            <div style={{ ...mono(24), color: P.muted }}>ASSUMPTION</div>
            <div style={{ ...text(93), marginTop: 34, color: P.signal }}>{amount}</div>
            <div style={{ ...text(29, 500), marginTop: 35 }}>{unit}</div>
          </Move>
        ))}
      </div>
      <Move at={180} style={{ position: "absolute", left: 105, top: 798, ...text(33, 500) }}>
        Main scenario + a higher-price scenario at $79 per run.
      </Move>
      <Sequence from={420} durationInFrames={300} layout="none">
        <div style={{ position: "absolute", left: 95, top: 405, background: P.paper }}>
          <Capture
            asset="cfo.mov"
            start={5}
            crop={{ x: 1510, y: 990, w: 1700, h: 520 }}
            width={1730}
            height={440}
            duration={5}
            push={1.015}
            background={P.paper}
          />
        </div>
      </Sequence>
      {f >= 420 && (
        <div style={{ position: "absolute", left: 105, top: 878, ...mono(24), color: P.muted }}>
          A forecast to test. Starting cash: $0; November has no paid runs.
        </div>
      )}
    </Stage>
  );
};

export const Close: React.FC = () => {
  const f = useCurrentFrame();
  const p = prog(f, 30, 75, E.cam);
  return (
    <AbsoluteFill style={{ background: P.signal, color: P.paper }}>
      <div
        style={{
          position: "absolute",
          left: 130,
          top: 180,
          transform: `scale(${0.9 + 0.1 * p})`,
          transformOrigin: "0 0",
        }}
      >
        <Mark size={130} ink={P.paper} dot={P.ink} />
      </div>
      <Move at={30} style={{ position: "absolute", left: 305, top: 198, ...text(99) }}>
        Nightshift
      </Move>
      <Move
        at={150}
        style={{ position: "absolute", left: 128, top: 465, ...text(102), width: 1660 }}
      >
        Pick up where
        <br />
        work <span style={{ color: P.surface }}>stopped.</span>
      </Move>
      <Move
        at={300}
        style={{ position: "absolute", left: 133, top: 780, ...text(31, 500), color: P.paper }}
      >
        For small teams with application-owned report pipelines.
      </Move>
      <Move
        at={330}
        style={{ position: "absolute", left: 133, top: 865, ...mono(31), color: P.paper }}
      >
        github.com/Ololadestephen/nightshift
      </Move>
      <div style={{ position: "absolute", left: 133, bottom: 55, ...mono(21), color: P.paper }}>
        Controlled prototype · inspect / repair / verify
      </div>
    </AbsoluteFill>
  );
};
