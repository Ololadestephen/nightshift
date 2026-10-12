import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { E, prog } from "../lib/anim";
import { P, mono, text } from "./style";

export const Move: React.FC<{
  at?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at = 0, children, style }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, at + 30, E.out);
  return (
    <div style={{ ...style, opacity: p, transform: `translateX(${(1 - p) * 70}px)` }}>
      {children}
    </div>
  );
};

export const Stage: React.FC<{
  title?: React.ReactNode;
  label: string;
  source: string;
  children: React.ReactNode;
}> = ({ title, label, source, children }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: P.stage, color: P.ink, overflow: "hidden" }}>
      <Move
        at={0}
        style={{ position: "absolute", left: 90, top: 50, ...mono(22), color: P.signal }}
      >
        {label}
      </Move>
      {title && (
        <Move
          at={12}
          style={{ position: "absolute", left: 88, top: 117, ...text(87), width: 1740 }}
        >
          {title}
        </Move>
      )}
      {children}
      <div style={{ position: "absolute", left: 90, bottom: 49, ...mono(21), color: P.muted }}>
        {source}
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1920 * prog(f, 0, 30, E.out),
          height: 5,
          background: P.signal,
        }}
      />
    </AbsoluteFill>
  );
};

/** The same checkpoint line carries the job through the explanation. */
export const Rail: React.FC<{ active: number; labels?: readonly string[]; at?: number }> = ({
  active,
  labels = ["Stalled", "Inspected", "Reclaimed", "Resumed", "Verified"],
  at = 60,
}) => {
  const f = useCurrentFrame();
  const p = prog(f, at, at + 45, E.out);
  const end = 80 + active * 340;
  return (
    <div style={{ position: "absolute", left: 150, top: 830, width: 1640, height: 110 }}>
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 23,
          width: 1360,
          height: 3,
          background: P.line,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 23,
          width: (end - 80) * p,
          height: 5,
          background: P.signal,
        }}
      />
      {labels.map((label, i) => (
        <div
          key={label}
          style={{ position: "absolute", left: i * 340, width: 160, textAlign: "center" }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              margin: "10px auto 24px",
              borderRadius: "50%",
              background: i <= active ? P.signal : P.stage,
              border: `3px solid ${i <= active ? P.signal : P.line}`,
            }}
          />
          <div style={{ ...text(27, 500), color: i <= active ? P.ink : P.muted }}>{label}</div>
        </div>
      ))}
    </div>
  );
};
