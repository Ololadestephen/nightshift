import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Mark } from "../brand/Mark";
import { C, FONT, monoStyle, typeStyle } from "../brand/tokens";
import { E, prog, lmix } from "../lib/anim";

/** A report-shaped visual summary, not a rebuilt application screen. */
const CasePage: React.FC<{ verified?: boolean }> = ({ verified = false }) => {
  const frame = useCurrentFrame();
  const arrival = prog(frame, 0, 70, E.out);
  const stamp = prog(frame, 45, 75, E.contact);
  return (
    <div
      style={{
        width: 600,
        height: 760,
        background: C.paper,
        color: C.ink,
        position: "relative",
        boxSizing: "border-box",
        padding: 48,
        transform: `translateY(${(1 - arrival) * 35}px) rotate(${verified ? -2 : 3}deg)`,
      }}
    >
      <svg width="80" height="80" style={{ position: "absolute", right: 0, top: 0 }}>
        <path d="M0 0 L80 80 L80 0 Z" fill={C.canvas} />
        <path d="M0 0 L0 80 L80 80 Z" fill={C.line} />
      </svg>
      <div style={monoStyle(25)}>job_e0dfd0b5…</div>
      <div style={{ ...typeStyle("secondary", 47), whiteSpace: "normal", marginTop: 48 }}>
        Queue activity
        <br />
        report
      </div>
      <div style={{ marginTop: 55, height: 2, background: C.line }} />
      <div style={{ ...monoStyle(25), marginTop: 40, color: C.mute }}>INPUT SNAPSHOT</div>
      <div style={{ ...typeStyle("secondary", 40), marginTop: 16 }}>Preserved</div>
      <div style={{ ...monoStyle(25), marginTop: 45, color: C.mute }}>
        {verified ? "RECONCILED OUTPUT" : "SAVED CHECKPOINT"}
      </div>
      <div style={{ ...typeStyle("secondary", 40), marginTop: 16 }}>
        {verified ? "5 rows · 120 minutes" : "parsed"}
      </div>
      <div
        style={{
          position: "absolute",
          left: 48,
          bottom: 58,
          border: `3px solid ${verified ? C.recovery : C.accent}`,
          padding: "15px 28px",
          transform: `rotate(-7deg) scale(${verified ? 1.12 - 0.12 * stamp : 1})`,
          ...monoStyle(37),
          color: verified ? C.recovery : C.accent,
        }}
      >
        {verified ? "VERIFIED" : "STALLED"}
      </div>
    </div>
  );
};

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const turn = prog(frame, 330, 380, E.inOut);
  const first = 1 - turn;
  return (
    <AbsoluteFill style={{ background: C.canvas, color: C.text, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 160,
          ...typeStyle("display", 150),
          lineHeight: 1.05,
          opacity: first,
        }}
      >
        Stopped.
        <br />
        <span style={{ color: C.soft }}>Not erased.</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 180,
          ...typeStyle("display", 114),
          lineHeight: 1.08,
          opacity: turn,
        }}
      >
        Resume the work.
        <br />
        Prove the result.
      </div>
      <div
        style={{
          position: "absolute",
          left: 1100,
          top: 130,
          transform: `scale(${lmix(0.94, 1, prog(frame, 0, 720, E.dolly))})`,
        }}
      >
        <CasePage />
      </div>
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 690,
          width: 740,
          ...typeStyle("secondary", 36),
          whiteSpace: "normal",
          color: C.soft,
        }}
      >
        Nightshift recovers stalled reports
        <br />
        inside an application-owned pipeline.
      </div>
      <div
        style={{ position: "absolute", left: 100, bottom: 75, ...monoStyle(24), color: C.verified }}
      >
        Controlled recovery · illustrated recorded state
      </div>
    </AbsoluteFill>
  );
};

export const Architecture: React.FC = () => {
  const frame = useCurrentFrame();
  const flow = prog(frame, 160, 250, E.inOut);
  const stages = [
    { x: 105, word: "MODEL", verb: "Choose a tool", detail: "Job · worker · checkpoint · errors" },
    {
      x: 1040,
      word: "POLICY",
      verb: "Authorize the mutation",
      detail: "Expiry · generation · scope · budget",
    },
  ];
  return (
    <AbsoluteFill style={{ background: C.canvas, color: C.text }}>
      <div style={{ position: "absolute", left: 100, top: 70, ...typeStyle("secondary", 50) }}>
        A tool call is not permission.
      </div>
      {stages.map((stage) => (
        <div key={stage.word} style={{ position: "absolute", left: stage.x, top: 250 }}>
          <div style={{ ...monoStyle(29), color: C.soft }}>{stage.word}</div>
          <div style={{ ...typeStyle("display", 66), marginTop: 30 }}>{stage.verb}</div>
          <div style={{ ...typeStyle("ui", 30), marginTop: 35, color: C.soft }}>{stage.detail}</div>
        </div>
      ))}
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <path d="M110 555 H855 M1040 555 H1810" fill="none" stroke={C.rule} strokeWidth="3" />
        <path d={`M110 555 H${110 + 700 * flow}`} fill="none" stroke={C.accent} strokeWidth="5" />
        <path d="M855 510 H990 V600 H855 Z" fill="none" stroke={C.verified} strokeWidth="3" />
        <text x="887" y="565" fill={C.verified} fontFamily={FONT.mono} fontSize="29">
          OK?
        </text>
      </svg>
      <div
        style={{ position: "absolute", left: 105, top: 635, ...monoStyle(33), color: C.verified }}
      >
        reclaim_expired_lease
      </div>
      <div
        style={{ position: "absolute", left: 1040, top: 635, ...monoStyle(33), color: C.verified }}
      >
        expired · observed generation 1
      </div>
      <div style={{ position: "absolute", left: 105, top: 790, ...typeStyle("secondary", 39) }}>
        Execute → resume checkpoint → reconcile artifact
      </div>
      <div style={{ position: "absolute", left: 105, bottom: 75, ...monoStyle(25), color: C.soft }}>
        Node + TypeScript · durable SQLite · recorded recovery path
      </div>
    </AbsoluteFill>
  );
};

export const VerifiedReceipt: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 150, paddingLeft: 45 }}>
    <CasePage verified />
    <div>
      <div style={{ ...typeStyle("display", 82), whiteSpace: "normal", width: 720 }}>
        The result
        <br />
        matches
        <br />
        the input.
      </div>
      <div style={{ ...monoStyle(29), color: C.verified, marginTop: 45 }}>No mismatches.</div>
      <div style={{ ...typeStyle("ui", 26), color: C.soft, marginTop: 35 }}>
        Recorded local artifact verification
      </div>
    </div>
  </div>
);

export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = prog(frame, 0, 45, E.out);
  return (
    <AbsoluteFill style={{ background: C.canvas, color: C.text }}>
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 130,
          ...typeStyle("display", 145),
          opacity: reveal,
        }}
      >
        Recovered.
        <br />
        <span style={{ color: C.verified }}>Verified.</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 1120,
          top: 300,
          transform: `scale(${lmix(0.92, 1, prog(frame, 0, 500, E.dolly))})`,
        }}
      >
        <Mark size={430} ink={C.text} />
      </div>
      <div style={{ position: "absolute", left: 105, top: 600, ...typeStyle("secondary", 70) }}>
        Nightshift
      </div>
      <div style={{ position: "absolute", left: 105, top: 760, ...typeStyle("secondary", 38) }}>
        Bounded agent. Inspectable evidence.
      </div>
      <div style={{ position: "absolute", left: 105, bottom: 95, ...monoStyle(28), color: C.soft }}>
        github.com/Ololadestephen/nightshift
      </div>
    </AbsoluteFill>
  );
};
