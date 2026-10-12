// Nightshift demo timeline. ~100 s walkthrough: event needs architecture + neatlogs/Entire/cfo
// evidence within ≤3 min; cinetic walkthrough default is shorter — length is intentional (BRIEF.md).

export const FPS = 60;
export const BPM = 120;
export const W = 1920;
export const H = 1080;

export const BEAT = (60 / BPM) * FPS; // 30
export const BAR = BEAT * 4; // 120
export const b = (bar: number, beat = 0, sub = 0) => Math.round(((bar - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));
export const f60 = (frames: number) => Math.round((frames * FPS) / 60);

export const TAIL = FPS; // 1 s decay

// Contiguous acts, bar-aligned. Body = 50 bars = 100 s.
export const ACT = {
  statement: { from: b(1), dur: b(5) - b(1) }, // bars 1-4
  desk: { from: b(5), dur: b(13) - b(5) }, // bars 5-12
  check: { from: b(13), dur: b(27) - b(13) }, // bars 13-26
  evidence: { from: b(27), dur: b(41) - b(27) }, // bars 27-40
  mark: { from: b(41), dur: b(51) + TAIL - b(41) }, // bars 41-50 + tail
};

export const TOTAL = b(51) + TAIL;

// One breath per bar keeps UI holds inside the event-gap budget (max-gap 120 = 1 bar).
const BREATH: Record<string, number> = Object.fromEntries(
  Array.from({ length: 50 }, (_, i) => [`breath${i + 1}`, b(i + 1)]),
);

export const CUE = {
  ...BREATH,

  // Act 1 — statement
  word1: b(1, 0),
  word2: b(1, 1),
  word3: b(1, 2),
  word4: b(1, 3),
  lock: b(2),
  pulse: b(2, 1),
  exit: b(3),
  fly: b(3, 2),
  handoff: b(5),

  // Act 2 — desk
  deskIn: b(5),
  lease: b(7),
  refuse: b(9),
  deskOut: b(12),

  // Act 3 — check
  start: b(13),
  checking: b(15),
  call1: b(17),
  call2: b(19),
  verified: b(21),
  receipt: b(23),
  checkOut: b(26),

  // Act 4 — evidence
  neatlogs: b(27),
  entire: b(31),
  cfo: b(35),
  evidenceOut: b(40),

  // Act 5 — mark lockup
  pieceA: b(41, 1),
  pieceB: b(41, 2),
  lockup: b(43),
  tick1: b(44),
  tick2: b(45),
  tick3: b(46),
  end: b(51),
};

export type Copy = {
  id: string;
  text: string;
  in: number;
  resolved: number;
  out: number;
  kind?: 'copy' | 'ui';
};

export const COPY: Copy[] = [
  { id: 'statement', text: 'Unfinished work gets checked', in: 0, resolved: CUE.lock, out: CUE.exit },
  { id: 'deskTitle', text: 'Report awaiting check', in: CUE.deskIn, resolved: CUE.deskIn + f60(24), out: CUE.deskOut, kind: 'ui' },
  { id: 'leaseLine', text: 'Lease active — reclaim refused', in: CUE.lease, resolved: CUE.lease + f60(18), out: CUE.deskOut, kind: 'ui' },
  { id: 'startBtn', text: 'Start Nightshift', in: CUE.start, resolved: CUE.start + f60(12), out: CUE.checking, kind: 'ui' },
  { id: 'checking', text: 'Nightshift is checking this report.', in: CUE.checking, resolved: CUE.checking + f60(18), out: CUE.verified, kind: 'ui' },
  { id: 'verified', text: 'Verified against the submitted dataset', in: CUE.verified, resolved: CUE.verified + f60(18), out: CUE.checkOut, kind: 'ui' },
  { id: 'receipt', text: '28 rows · 259 min · 2 calls\n2165 in / 321 out', in: CUE.receipt, resolved: CUE.receipt + f60(24), out: CUE.checkOut, kind: 'ui' },
  { id: 'neatlogs', text: 'neatlogs — trace exported', in: CUE.neatlogs, resolved: CUE.neatlogs + f60(24), out: CUE.entire, kind: 'ui' },
  { id: 'entire', text: 'Entire — build checkpoints', in: CUE.entire, resolved: CUE.entire + f60(24), out: CUE.cfo, kind: 'ui' },
  { id: 'cfo', text: 'cfo.ai — assumption forecast', in: CUE.cfo, resolved: CUE.cfo + f60(24), out: CUE.evidenceOut, kind: 'ui' },
  { id: 'cfoNums', text: '$49 plan · labelled assumption\n12-mo revenue 10,780 (model)', in: CUE.cfo + f60(30), resolved: CUE.cfo + f60(48), out: CUE.evidenceOut, kind: 'ui' },
  { id: 'wordmark', text: 'Nightshift', in: CUE.lockup - f60(34), resolved: CUE.lockup, out: TOTAL },
];

export const copy = (id: string): Copy => {
  const c = COPY.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no COPY entry "${id}"`);
  return c;
};
