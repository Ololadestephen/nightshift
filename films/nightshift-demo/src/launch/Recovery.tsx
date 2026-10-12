import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Mark } from "../brand/Mark";
import { Capture } from "../evidence/Capture";
import { E, prog, lmix } from "../lib/anim";
import { Move, Rail, Stage } from "./Kit";
import { P, text, mono } from "./style";
import { observed, reclaimed, resumed, report } from "./proof";

export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const shift = prog(f, 240, 285, E.cam);
  return (
    <Stage
      label="WHEN REPORT WORK STOPS"
      source="Controlled fault · animated explanation of a recorded case"
    >
      <div style={{ position: "absolute", left: 90, top: 140, ...text(138), width: 1180 }}>
        <Move at={0}>Work stopped.</Move>
        <Move at={120} style={{ color: P.signal }}>
          Keep its progress.
        </Move>
      </div>
      <div
        style={{
          position: "absolute",
          left: 110,
          top: 575,
          width: 1700,
          height: 260,
          transform: `perspective(2200px) rotateY(${-8 * (1 - shift)}deg)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 83,
            left: 40,
            width: 1490,
            height: 4,
            background: P.line,
          }}
        />
        {["Input accepted", "Parsed", "Interrupted", "Report"].map((label, i) => (
          <Move
            key={label}
            at={30 + i * 8}
            style={{ position: "absolute", left: i * 410, top: 0, width: 290 }}
          >
            <div style={{ ...mono(21), color: P.muted, marginBottom: 21 }}>0{i + 1}</div>
            <div
              style={{
                height: 90,
                display: "flex",
                alignItems: "center",
                paddingLeft: 26,
                ...text(31),
                background: i === 1 ? P.signal : P.surface,
                color: i === 1 ? P.paper : P.ink,
              }}
            >
              {label}
            </div>
            {i === 1 && (
              <div style={{ ...mono(23), color: P.signal, marginTop: 27, opacity: shift }}>
                Saved checkpoint ↑
              </div>
            )}
          </Move>
        ))}
      </div>
    </Stage>
  );
};

export const Reveal: React.FC = () => {
  const f = useCurrentFrame();
  const dock = prog(f, 180, 225, E.cam);
  return (
    <AbsoluteFill style={{ background: P.signal, color: P.paper }}>
      <div
        style={{
          position: "absolute",
          left: 780,
          top: 100,
          transform: `translate(${-dock * 670}px, ${dock * 35}px) scale(${lmix(1.2, 0.65, dock)})`,
          transformOrigin: "0 0",
        }}
      >
        <Mark size={300} ink={P.paper} dot={P.ink} />
      </div>
      <Move
        at={30}
        style={{
          position: "absolute",
          left: 220,
          top: 580,
          ...text(155),
        }}
      >
        <div style={{ transform: `translate(${dock * 120}px, ${-dock * 400}px)` }}>Nightshift</div>
      </Move>
      <Move
        at={240}
        style={{ position: "absolute", left: 220, top: 475, ...text(61), width: 1480 }}
      >
        An AI operations agent
        <br />
        for stalled report jobs.
      </Move>
      <Move
        at={300}
        style={{ position: "absolute", left: 220, top: 780, ...mono(29), color: P.paper }}
      >
        Inspect → Repair → Verify
      </Move>
      <div style={{ position: "absolute", bottom: 55, left: 90, ...mono(22), color: P.paper }}>
        Node.js / TypeScript / SQLite · model-selected tools · policy-enforced execution
      </div>
    </AbsoluteFill>
  );
};

export const Inspect: React.FC = () => (
  <Stage
    label="01 / INSPECT"
    title={
      <>
        Start with <span style={{ color: P.signal }}>evidence.</span>
      </>
    }
    source="Recorded Sonnet run · job_e0dfd0b5… · observations animated, not runtime timing"
  >
    <div style={{ position: "absolute", left: 90, top: 355, display: "flex", gap: 28 }}>
      {[
        { tool: "inspect_job", value: "Stalled", note: "Original input preserved" },
        {
          tool: "inspect_worker",
          value: observed?.lease_state ?? "",
          note: `Observed generation ${observed?.generation}`,
        },
        { tool: "read_checkpoint", value: "Parsed", note: "Completed work remains saved" },
      ].map((item, i) => (
        <Move
          key={item.tool}
          at={30 + i * 150}
          style={{
            width: 550,
            height: 350,
            boxSizing: "border-box",
            padding: 35,
            background: P.surface,
          }}
        >
          <div style={{ ...mono(26), color: P.muted }}>{item.tool}</div>
          <div style={{ ...text(72), marginTop: 50, color: P.signal, textTransform: "capitalize" }}>
            {item.value}
          </div>
          <div style={{ ...text(29, 500), marginTop: 35 }}>{item.note}</div>
        </Move>
      ))}
    </div>
    <Rail active={1} at={380} />
  </Stage>
);

export const Repair: React.FC = () => {
  const f = useCurrentFrame();
  const p = prog(f, 180, 225, E.cam);
  return (
    <Stage
      label="02 / REPAIR"
      title={
        <>
          A legal repair. <span style={{ color: P.signal }}>A new generation.</span>
        </>
      }
      source="Recorded reclaim_expired_lease output · expiry and observed generation checked before mutation"
    >
      <div
        style={{
          position: "absolute",
          left: 130,
          top: 345,
          width: 1550,
          height: 355,
          background: P.surface,
        }}
      >
        <div style={{ position: "absolute", left: 45, top: 32, ...mono(26), color: P.muted }}>
          reclaim_expired_lease
        </div>
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 100,
            ...text(185),
            color: P.signal,
            transform: `translateX(${p * 550}px)`,
          }}
        >
          {p < 0.5 ? observed?.generation : reclaimed?.generation}
        </div>
        <div
          style={{
            position: "absolute",
            left: 610,
            top: 115,
            width: 3,
            height: 175,
            background: P.line,
          }}
        />
        <Move at={210} style={{ position: "absolute", left: 890, top: 100 }}>
          <div style={{ ...mono(27), color: P.muted }}>POLICY PASSED</div>
          <div style={{ ...text(58), marginTop: 35 }}>Lease {reclaimed?.code}</div>
          <div style={{ ...mono(27), marginTop: 20 }}>ok: {String(reclaimed?.ok)}</div>
        </Move>
      </div>
      <Move at={360} style={{ position: "absolute", left: 150, top: 744, ...text(31, 500) }}>
        The model selects the tool. Code validates the state transition.
      </Move>
      <Rail active={2} at={360} />
    </Stage>
  );
};

export const Resume: React.FC = () => (
  <Stage
    label="03 / RESUME"
    title={
      <>
        Continue from <span style={{ color: P.signal }}>parsed.</span>
      </>
    }
    source="Recorded resume_job output · checkpoint restore, then artifact reconciliation"
  >
    <Move
      at={30}
      style={{
        position: "absolute",
        left: 110,
        top: 345,
        width: 510,
        height: 370,
        padding: 35,
        boxSizing: "border-box",
        background: P.signal,
        color: P.paper,
      }}
    >
      <div style={mono(25)}>SAVED CHECKPOINT</div>
      <div style={{ ...text(90), marginTop: 48 }}>parsed</div>
      <div style={{ ...text(29, 500), marginTop: 42 }}>Resume completed work.</div>
    </Move>
    <Move
      at={180}
      style={{ position: "absolute", left: 770, top: 420, ...text(95), color: P.signal }}
    >
      →
    </Move>
    <Move
      at={210}
      style={{
        position: "absolute",
        left: 960,
        top: 345,
        width: 750,
        height: 370,
        background: P.surface,
        padding: 35,
        boxSizing: "border-box",
      }}
    >
      <div style={{ ...mono(26), color: P.muted }}>resume_job</div>
      <div style={{ ...text(75), marginTop: 47 }}>{resumed?.type}</div>
      <div style={{ ...mono(32), marginTop: 45 }}>status: {resumed?.status}</div>
    </Move>
    <Rail active={3} at={300} />
  </Stage>
);

export const Verified: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage
      label="04 / VERIFY"
      title={
        <>
          The deliverable <span style={{ color: P.signal }}>checks out.</span>
        </>
      }
      source="Actual recorded recovery · local verify_artifact output · report totals, not recovery duration"
    >
      <Move at={30} style={{ position: "absolute", left: 105, top: 375 }}>
        <div style={text(170)}>
          {report.row_count}
          <span style={{ ...text(48), color: P.muted, marginLeft: 24 }}>rows</span>
        </div>
        <div style={{ ...text(115), color: P.signal, marginTop: 40 }}>
          {report.total_minutes}
          <span style={{ ...text(43), color: P.muted, marginLeft: 25 }}>minutes</span>
        </div>
      </Move>
      <Move
        at={60}
        style={{
          position: "absolute",
          left: 900,
          top: 360,
          width: 830,
          height: 360,
          background: P.surface,
          padding: 42,
          boxSizing: "border-box",
        }}
      >
        <div style={{ ...mono(25), color: P.signal }}>verify_artifact</div>
        <div style={{ ...mono(33), marginTop: 35 }}>
          ok: true
          <br />
          job_status: completed
          <br />
          mismatches: []
        </div>
      </Move>
      <Sequence from={240} durationInFrames={240} layout="none">
        <div style={{ position: "absolute", left: 900, top: 360, background: P.surface }}>
          <Capture
            asset="recovery.mov"
            start={14}
            crop={{ x: 1130, y: 1470, w: 1350, h: 470 }}
            width={830}
            height={360}
            push={1}
            duration={4}
            background={P.surface}
          />
        </div>
      </Sequence>
      <Move at={180} style={{ position: "absolute", left: 105, top: 744, ...text(31, 500) }}>
        Reconciled against the frozen input.
      </Move>
      <Rail active={4} at={180} />
      {f >= 240 && (
        <div style={{ position: "absolute", left: 915, top: 725, ...mono(20), color: P.muted }}>
          neatlogs capture · resume applied
        </div>
      )}
    </Stage>
  );
};
