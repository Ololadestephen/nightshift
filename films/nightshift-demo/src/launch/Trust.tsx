import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { Capture } from "../evidence/Capture";
import { E, prog } from "../lib/anim";
import { Move, Stage } from "./Kit";
import { P, mono, text } from "./style";
import { failure, verified } from "./proof";

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

export const Improvement: React.FC = () => {
  const f = useCurrentFrame();
  const failed = failure?.events.find((event) => event.tool === "escalate_incident")?.output;
  return (
    <Stage
      label="neatlogs / DEVELOPMENT EVIDENCE"
      title={
        <>
          See the failure.
          <br />
          <span style={{ color: P.signal }}>Fix the sequence.</span>
        </>
      }
      source="Separate recorded runs · older neatlogs timings measure export, not recovery latency"
    >
      {f < 240 ? (
        <Move at={30} style={{ position: "absolute", left: 105, top: 385 }}>
          <Capture
            asset="failure.mov"
            start={3}
            crop={{ x: 1130, y: 245, w: 1350, h: 790 }}
            width={1030}
            height={535}
            duration={4}
            push={1.01}
            background={P.stage}
          />
        </Move>
      ) : (
        <Move
          at={240}
          style={{
            position: "absolute",
            left: 105,
            top: 420,
            width: 760,
            height: 360,
            padding: 32,
            background: P.surface,
            boxSizing: "border-box",
          }}
        >
          <div style={{ ...mono(24), color: P.muted }}>BEFORE / job_89165069…</div>
          <div style={{ ...text(57), marginTop: 35 }}>{failed?.job_status}</div>
          <div style={{ ...mono(25), marginTop: 28 }}>
            Reclaimed → escalated
            <br />
            Resume was not offered next.
          </div>
        </Move>
      )}
      <Move at={60} style={{ position: "absolute", left: 1230, top: 430, width: 535 }}>
        <div style={{ ...text(40), color: P.signal }}>Tool catalog corrected.</div>
        <div style={{ ...text(29, 500), lineHeight: 1.4, marginTop: 40 }}>
          A successful reclaim now exposes resume as the next repair.
        </div>
      </Move>
      <Sequence from={480} durationInFrames={360} layout="none">
        <div
          style={{
            position: "absolute",
            left: 940,
            top: 420,
            width: 800,
            height: 360,
            background: P.signal,
            color: P.paper,
            boxSizing: "border-box",
            padding: 32,
          }}
        >
          <div style={mono(24)}>AFTER / job_e0dfd0b5…</div>
          <div style={{ ...text(57), marginTop: 35 }}>{verified?.job_status}</div>
          <div style={{ ...mono(25), marginTop: 28 }}>
            Reclaim → resume → verify
            <br />
            mismatches: []
          </div>
        </div>
      </Sequence>
      <Move
        at={480}
        style={{ position: "absolute", left: 110, top: 870, ...text(30, 500), color: P.muted }}
      >
        A green trace alone does not prove a recovered report.
      </Move>
    </Stage>
  );
};
