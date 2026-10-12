import React from "react";
import { AbsoluteFill, Freeze, useCurrentFrame } from "remotion";
import { FontGate } from "../lib/FontGate";
import { E, prog } from "../lib/anim";
import { Mark } from "../brand/Mark";
import records from "../evidence/recorded-runs.json";
import { P, text, mono } from "./style";

export type LaunchScene = "hook" | "demo" | "proof";
const recorded = records.find((record) => record.job_id.startsWith("job_e0dfd0b5"));
const result = recorded?.events.find((event) => event.tool === "verify_artifact")?.output;
if (
  !result ||
  result.code !== "verified" ||
  !("report" in result) ||
  !result.report ||
  result.job_status !== "completed"
) {
  throw new Error("Launch proof requires the recorded completed report.");
}
const report = result.report;

const Footnote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      left: 90,
      bottom: 55,
      ...mono(23),
      color: P.muted,
    }}
  >
    {children}
  </div>
);

export const LaunchHook: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = prog(frame, 0, 60, E.out);
  return (
    <AbsoluteFill style={{ background: P.stage, color: P.ink, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 88, top: 105, ...text(122), width: 1030 }}>
        Pick up where
        <br />
        work <span style={{ color: P.signal }}>stopped.</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 92,
          top: 530,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <Mark size={74} ink={P.ink} dot={P.signal} />
        <span style={text(61)}>Nightshift</span>
      </div>
      <div style={{ position: "absolute", left: 92, top: 690, ...text(32, 500), color: P.muted }}>
        Inspect. Repair. Verify.
      </div>
      <div
        style={{
          position: "absolute",
          left: 1250,
          top: 150,
          width: 470,
          height: 690,
          borderLeft: `3px solid ${P.signal}`,
          background: P.surface,
          transform: `perspective(2200px) translateY(${(1 - enter) * 80}px) rotateY(-12deg) rotateX(7deg)`,
          boxSizing: "border-box",
          padding: "44px 34px",
        }}
      >
        <div style={{ ...mono(23), color: P.muted }}>job_e0dfd0b5…</div>
        <div style={{ ...text(43), marginTop: 40 }}>Report interrupted.</div>
        <div style={{ marginTop: 58, ...mono(27) }}>
          {["input accepted", "parsed", "aggregate", "artifact"].map((step, index) => (
            <div
              key={step}
              style={{
                padding: "20px 0",
                borderBottom: `1px solid ${P.line}`,
                color: index < 2 ? P.ink : P.muted,
              }}
            >
              <span style={{ color: index === 1 ? P.signal : P.muted, marginRight: 20 }}>
                {index < 2 ? "✓" : "—"}
              </span>
              {step}
            </div>
          ))}
        </div>
        <div style={{ ...mono(23), color: P.signal, marginTop: 44 }}>checkpoint: parsed</div>
      </div>
      <Footnote>Controlled recorded case · animated explanation</Footnote>
    </AbsoluteFill>
  );
};

export const LaunchDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = prog(frame, 30, 90, E.out);
  const steps = ["Inspect", "Repair", "Verify"];
  return (
    <AbsoluteFill style={{ background: P.stage, color: P.ink }}>
      <div style={{ position: "absolute", left: 90, top: 90, ...text(89) }}>
        An agent that finishes
        <br />
        report work.
      </div>
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 365,
          width: 1740,
          height: 470,
          background: P.surface,
          color: P.ink,
          overflow: "hidden",
          transform: `translateY(${(1 - reveal) * 24}px)`,
        }}
      >
        <div
          style={{
            ...mono(25),
            padding: "28px 38px",
            borderBottom: `1px solid ${P.line}`,
            color: P.muted,
          }}
        >
          Nightshift / recorded recovery
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, margin: "30px 38px 0" }}>
          {steps.map((step, index) => (
            <React.Fragment key={step}>
              <div
                style={{
                  ...text(34),
                  padding: "16px 36px",
                  color: index === 1 ? P.stage : P.ink,
                  background: index === 1 ? P.signal : P.surface,
                }}
              >
                {step}
              </div>
              {index < 2 && <span style={{ ...mono(36), color: P.muted }}>→</span>}
            </React.Fragment>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "410px 610px 380px",
            gap: 60,
            padding: "40px 38px",
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ ...mono(22), color: P.muted }}>OBSERVED</div>
            <div style={{ ...mono(34), marginTop: 12 }}>
              lease: expired
              <br />
              checkpoint: parsed
            </div>
          </div>
          <div>
            <div style={{ ...mono(22), color: P.muted }}>ALLOWLISTED TOOL</div>
            <div style={{ ...mono(34), marginTop: 12 }}>
              reclaim_expired_lease
              <br />
              generation 1 → 2
            </div>
          </div>
          <div>
            <div style={{ ...mono(22), color: P.muted }}>NEXT</div>
            <div style={{ ...mono(34), marginTop: 12 }}>
              resume_job
              <br />
              verify_artifact
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 92, top: 895, ...text(31, 500) }}>
        The model selects tools. Policy validates each action.
      </div>
      <Footnote>Animated view of recorded observations · Node / TypeScript / SQLite</Footnote>
    </AbsoluteFill>
  );
};

export const LaunchProof: React.FC = () => (
  <AbsoluteFill style={{ background: P.stage, color: P.ink }}>
    <div style={{ position: "absolute", left: 90, top: 90, ...text(94) }}>
      Recovery with <span style={{ color: P.signal }}>receipts.</span>
    </div>
    <div style={{ position: "absolute", left: 94, top: 305 }}>
      <div style={{ ...text(30, 500), color: P.muted }}>Verified report</div>
      <div style={{ ...text(245), marginTop: 32 }}>
        {report.row_count}
        <span style={{ ...text(59, 500), marginLeft: 28, color: P.muted }}>rows</span>
      </div>
      <div style={{ ...text(149), marginTop: 44, color: P.signal }}>
        {report.total_minutes}
        <span style={{ ...text(47, 500), marginLeft: 24, color: P.muted }}>minutes</span>
      </div>
      <div style={{ ...mono(24), color: P.muted, marginTop: 18 }}>
        Report total, not recovery duration
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        left: 965,
        top: 330,
        width: 790,
        padding: "38px 42px",
        background: P.surface,
        borderLeft: `3px solid ${P.signal}`,
      }}
    >
      <div style={{ ...mono(26), color: P.signal }}>verify_artifact</div>
      <pre style={{ ...mono(33), margin: "36px 0 0", whiteSpace: "pre-wrap" }}>
        {JSON.stringify(
          {
            ok: result.ok,
            code: result.code,
            job_status: result.job_status,
            mismatches: result.mismatches,
          },
          null,
          2,
        )}
      </pre>
    </div>
    <Footnote>Recorded local verification output · job_e0dfd0b5… · controlled case</Footnote>
  </AbsoluteFill>
);

export const LaunchStudy: React.FC<{ scene?: LaunchScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const current = scene ?? (frame < 480 ? "hook" : frame < 960 ? "demo" : "proof");
  const Scene = current === "hook" ? LaunchHook : current === "demo" ? LaunchDemo : LaunchProof;
  return (
    <FontGate>
      {scene ? (
        <Freeze frame={150}>
          <Scene />
        </Freeze>
      ) : (
        <Scene />
      )}
    </FontGate>
  );
};
