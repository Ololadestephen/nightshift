import React from "react";
import { Img, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { C } from "../brand/tokens";
import { E, lmix, prog } from "../lib/anim";
import { FPS } from "./timeline";

export type Crop = { x: number; y: number; w: number; h: number };
type CaptureProps = {
  asset: string;
  crop: Crop;
  source?: { w: number; h: number };
  start?: number;
  width?: number;
  height?: number;
  push?: number;
  duration?: number;
  background?: string;
};

/** Crops source pixels without rebuilding product screens or changing their contents. */
export const Capture: React.FC<CaptureProps> = ({
  asset,
  crop,
  source = { w: 3420, h: 1986 },
  start = 0,
  width = 1728,
  height = 784,
  push = 1.025,
  duration = 8,
  background = C.canvas,
}) => {
  const frame = useCurrentFrame();
  const zoom = lmix(1, push, prog(frame, 0, duration * FPS, E.dolly));
  const scale = Math.min(width / crop.w, height / crop.h);
  const layer: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: source.w,
    height: source.h,
    maxWidth: "none",
    transformOrigin: "0 0",
    transform: `translate(${-crop.x}px, ${-crop.y}px)`,
  };
  return (
    <div style={{ width, height, position: "relative", overflow: "hidden", background }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: crop.w,
          height: crop.h,
          overflow: "hidden",
          transformOrigin: "0 0",
          transform: `translate(${(width - crop.w * scale * zoom) / 2}px, ${(height - crop.h * scale * zoom) / 2}px) scale(${scale * zoom})`,
        }}
      >
        {asset.endsWith(".mov") ? (
          <OffthreadVideo
            src={staticFile(`captures/${asset}`)}
            trimBefore={Math.round(start * FPS)}
            muted
            style={layer}
          />
        ) : (
          <Img src={staticFile(`captures/${asset}`)} style={layer} />
        )}
      </div>
    </div>
  );
};
