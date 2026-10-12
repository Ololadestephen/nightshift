import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, monoStyle, typeStyle } from "../brand/tokens";
import { Mark } from "../brand/Mark";
import { E, prog } from "../lib/anim";
import { TOTAL, W, FPS } from "./timeline";

export const Frame: React.FC<{
  title: string;
  source: string;
  note?: string;
  light?: boolean;
  children: React.ReactNode;
}> = ({ title, source, note, light = false, children }) => {
  const frame = useCurrentFrame();
  const entry = prog(frame, 0, 36, E.out);
  const intro = 1 - prog(frame, 36, 84, E.inOut);
  const ink = light ? C.ink : C.text;
  return (
    <AbsoluteFill style={{ background: light ? C.paper : C.canvas, color: ink }}>
      <div style={{ position: "absolute", left: 0, top: 0, transform: "translate(96px, 112px)" }}>
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "translate(96px, 948px)",
          ...typeStyle("secondary", 36),
          color: ink,
        }}
      >
        {title}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "translate(96px, 1006px)",
          ...typeStyle("ui", 21),
          color: light ? C.mute : C.soft,
        }}
      >
        {source}
        {note ? ` · ${note}` : ""}
      </div>
      {intro > 0 && (
        <AbsoluteFill
          style={{
            background: light ? C.paper : C.canvas,
            opacity: intro,
            justifyContent: "center",
            padding: 96,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              ...typeStyle("display", 98),
              whiteSpace: "normal",
              maxWidth: 1700,
              opacity: entry,
              transform: `translateY(${(1 - entry) * 24}px)`,
            }}
          >
            {title}
          </div>
        </AbsoluteFill>
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: `translate(${W - 150}px, 974px)`,
        }}
      >
        <Mark size={40} ink={ink} />
      </div>
    </AbsoluteFill>
  );
};

export const Label: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = C.verified,
}) => <div style={{ ...monoStyle(28), color, padding: "20px 0" }}>{children}</div>;

export const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        height: 3,
        width: W * Math.min(1, frame / (TOTAL - FPS)),
        background: C.accent,
      }}
    />
  );
};
