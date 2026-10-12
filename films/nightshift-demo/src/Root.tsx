import React from "react";
import { Composition, Folder, Still } from "remotion";
import { Act1 } from "./acts/Act1";
import { Act2 } from "./acts/Act2";
import { Act3 } from "./acts/Act3";
import { Act4 } from "./acts/Act4";
import { Act5 } from "./acts/Act5";
import { C, U } from "./brand/tokens";
import { Film, FilmProps } from "./Film";
import { FilmSub, subMetadata } from "./FilmSub";
import { Audit } from "./lib/Audit";
import { FontGate } from "./lib/FontGate";
import { BrandAvatar, BrandHeader, BrandLockup, BrandMark, MarkSizes, MarkStill } from "./Stills";
import { ACT, FPS, H, TOTAL, W } from "./timeline";
import { EvidenceFilm } from "./evidence/EvidenceFilm";
import { TOTAL as EVIDENCE_TOTAL } from "./evidence/timeline";
import { LaunchStudy } from "./launch/StyleFrames";
import { LaunchFilm } from "./launch/LaunchFilm";
import { TOTAL as LAUNCH_TOTAL } from "./launch/timeline";

const solo = (Act: React.FC) => {
  const Solo: React.FC<FilmProps> = ({ audit = false, safe }) => (
    <FontGate>
      <div style={{ position: "absolute", inset: 0, background: C.paper }}>
        <Act />
        {audit && <Audit safe={safe} />}
      </div>
    </FontGate>
  );
  return Solo;
};
const Act1Solo = solo(Act1);
const Act2Solo = solo(Act2);
const Act3Solo = solo(Act3);
const Act4Solo = solo(Act4);
const Act5Solo = solo(Act5);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="LaunchFilm"
      component={LaunchFilm}
      durationInFrames={LAUNCH_TOTAL}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="LaunchStudy"
      component={LaunchStudy}
      durationInFrames={1440}
      fps={FPS}
      width={W}
      height={H}
    />
    <Folder name="LaunchDirection">
      <Still
        id="LaunchHook"
        component={LaunchStudy}
        width={W}
        height={H}
        defaultProps={{ scene: "hook" as const }}
      />
      <Still
        id="LaunchDemo"
        component={LaunchStudy}
        width={W}
        height={H}
        defaultProps={{ scene: "demo" as const }}
      />
      <Still
        id="LaunchProof"
        component={LaunchStudy}
        width={W}
        height={H}
        defaultProps={{ scene: "proof" as const }}
      />
    </Folder>
    <Composition
      id="EvidenceFilm"
      component={EvidenceFilm}
      durationInFrames={EVIDENCE_TOTAL}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ music: false }}
    />
    <Composition
      id="Film"
      component={Film}
      durationInFrames={TOTAL}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ audit: false } as FilmProps}
    />
    <Composition
      id="FilmSub"
      component={FilmSub}
      durationInFrames={TOTAL}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ groups: [] as number[] }}
      calculateMetadata={subMetadata}
    />

    <Folder name="Acts">
      <Composition
        id="Act1"
        component={Act1Solo}
        durationInFrames={ACT.statement.dur}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ audit: false } as FilmProps}
      />
      <Composition
        id="Act2"
        component={Act2Solo}
        durationInFrames={ACT.desk.dur}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ audit: false } as FilmProps}
      />
      <Composition
        id="Act3"
        component={Act3Solo}
        durationInFrames={ACT.check.dur}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ audit: false } as FilmProps}
      />
      <Composition
        id="Act4"
        component={Act4Solo}
        durationInFrames={ACT.evidence.dur}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ audit: false } as FilmProps}
      />
      <Composition
        id="Act5"
        component={Act5Solo}
        durationInFrames={ACT.mark.dur}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ audit: false } as FilmProps}
      />
    </Folder>

    <Folder name="Stills">
      <Still
        id="Mark16"
        component={MarkStill}
        width={16}
        height={16}
        defaultProps={{ size: 16, surface: "paper" as const }}
      />
      <Still
        id="MarkLarge"
        component={MarkStill}
        width={W}
        height={H}
        defaultProps={{ size: 640 * U, surface: "paper" as const }}
      />
      <Still id="MarkSizes" component={MarkSizes} width={W} height={H} />
    </Folder>

    <Folder name="Brand">
      <Still
        id="BrandMark"
        component={BrandMark}
        defaultProps={{ size: 1024, ground: "light" as const }}
        calculateMetadata={({ props }) => ({ width: props.size, height: props.size })}
      />
      <Still
        id="BrandLockup"
        component={BrandLockup}
        width={2400}
        height={800}
        defaultProps={{ ground: "light" as const }}
      />
      <Still
        id="BrandAvatar"
        component={BrandAvatar}
        width={400}
        height={400}
        defaultProps={{ ground: "light" as const }}
      />
      <Still
        id="BrandHeader"
        component={BrandHeader}
        width={1500}
        height={500}
        defaultProps={{ ground: "light" as const }}
      />
    </Folder>
  </>
);
