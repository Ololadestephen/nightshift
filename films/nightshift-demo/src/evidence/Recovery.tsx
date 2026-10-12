import React from "react";
import { Sequence } from "remotion";
import records from "./recorded-runs.json";
import { C, monoStyle, typeStyle } from "../brand/tokens";
import { Capture } from "./Capture";
import { Frame, Label } from "./Frame";
import { FPS } from "./timeline";
import { VerifiedReceipt } from "./Graphics";

const success = records.find((run) => run.job_id.startsWith("job_e0dfd0b5"));
const failure = records.find((run) => run.job_id.startsWith("job_89165069"));
const verified = success?.events.find((event) => event.tool === "verify_artifact")?.output;
if (
  !success ||
  !failure ||
  !verified ||
  verified.job_status !== "completed" ||
  verified.ok !== true
) {
  throw new Error("The selected journal must contain a successful artifact verification.");
}

const excerptStyle: React.CSSProperties = {
  ...monoStyle(36),
  whiteSpace: "pre-wrap",
  margin: 0,
  padding: 44,
  boxSizing: "border-box",
  background: C.panel,
  borderLeft: `4px solid ${C.verified}`,
};

const Result: React.FC = () => (
  <div>
    <div style={{ ...typeStyle("secondary", 44), margin: "24px 0 44px" }}>
      The original artifact passed reconciliation.
    </div>
    <pre style={excerptStyle}>{JSON.stringify(verified, null, 2)}</pre>
    <Label>Source: recorded local verify_artifact output · job_e0dfd0b5…</Label>
  </div>
);

export const Recovery: React.FC = () => (
  <Frame
    title="Resume. Reconcile."
    source="Recorded Sonnet recovery · controlled fault"
    note="Older neatlogs timings describe export, not runtime"
  >
    <Sequence from={0} durationInFrames={4 * FPS} layout="none">
      <Capture
        asset="recovery.mov"
        start={3}
        crop={{ x: 1130, y: 245, w: 1350, h: 790 }}
        duration={4}
      />
    </Sequence>
    <Sequence from={4 * FPS} durationInFrames={4 * FPS} layout="none">
      <Capture
        asset="recovery.mov"
        start={7}
        crop={{ x: 1130, y: 840, w: 1350, h: 730 }}
        duration={4}
      />
    </Sequence>
    <Sequence from={8 * FPS} durationInFrames={4 * FPS} layout="none">
      <Capture
        asset="recovery-inspection.jpg"
        crop={{ x: 1130, y: 580, w: 1350, h: 470 }}
        duration={4}
      />
    </Sequence>
    <Sequence from={12 * FPS} durationInFrames={8 * FPS} layout="none">
      <Capture
        asset="recovery-reclaim.jpg"
        crop={{ x: 1130, y: 1490, w: 1350, h: 475 }}
        duration={8}
      />
    </Sequence>
    <Sequence from={20 * FPS} durationInFrames={8 * FPS} layout="none">
      <div style={{ ...typeStyle("secondary", 44), marginBottom: 36 }}>
        Reclaim, then resume completed work.
      </div>
      <div style={{ display: "flex", gap: 32 }}>
        {["reclaim_expired_lease", "resume_job"].map((name) => {
          const event = success.events.find((entry) => entry.tool === name);
          return (
            <div key={name} style={{ width: 840 }}>
              <Label>{name}</Label>
              <pre style={excerptStyle}>{JSON.stringify(event?.output, null, 2)}</pre>
            </div>
          );
        })}
      </div>
      <Label>Recorded local tool outputs · generation 1 → 2</Label>
    </Sequence>
    <Sequence from={28 * FPS} durationInFrames={8 * FPS} layout="none">
      <Result />
    </Sequence>
    <Sequence from={36 * FPS} durationInFrames={6 * FPS} layout="none">
      <VerifiedReceipt />
    </Sequence>
  </Frame>
);

export const Improvement: React.FC = () => (
  <Frame
    title="Failure becomes evidence."
    source="neatlogs before/after evidence + recorded local outputs"
    note="Separate controlled runs"
  >
    <Sequence from={0} durationInFrames={6 * FPS} layout="none">
      <Capture
        asset="failure.mov"
        start={5}
        crop={{ x: 1130, y: 245, w: 1350, h: 830 }}
        duration={6}
      />
    </Sequence>
    <Sequence from={6 * FPS} durationInFrames={6 * FPS} layout="none">
      <Capture
        asset="recovery.mov"
        start={9}
        crop={{ x: 1130, y: 580, w: 1350, h: 950 }}
        duration={6}
      />
    </Sequence>
    <Sequence from={12 * FPS} durationInFrames={12 * FPS} layout="none">
      <div style={{ ...typeStyle("secondary", 38), marginTop: 15, marginBottom: 35 }}>
        Fix: successful reclaim must offer resume.
      </div>
      <div style={{ display: "flex", gap: 32 }}>
        <div style={{ width: 840 }}>
          <Label color={C.waiting}>Before · job_89165069…</Label>
          <pre style={{ ...excerptStyle, fontSize: 29, borderColor: C.waiting }}>
            {JSON.stringify(
              failure.events.find((event) => event.tool === "escalate_incident")?.output,
              null,
              2,
            )}
          </pre>
        </div>
        <div style={{ width: 840 }}>
          <Label>After · job_e0dfd0b5…</Label>
          <pre style={{ ...excerptStyle, fontSize: 29 }}>
            {JSON.stringify(
              { resume: "applied", verification: verified.code, job_status: verified.job_status },
              null,
              2,
            )}
          </pre>
        </div>
      </div>
      <Label>Source: the two jobs' saved tool journals</Label>
    </Sequence>
  </Frame>
);
