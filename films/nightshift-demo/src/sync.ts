import { DOT_TRAVEL } from './acts/Act1';
import { HERO, LOCKUP_MOVE } from './acts/Act5';
import { MARK } from './brand/Mark';
import { peak, settleOf } from './lib/sync';
import { ACT, CUE, FPS, TOTAL, W } from './timeline';

export type Kind =
  | 'tick' | 'tock' | 'hit' | 'land' | 'pop' | 'whoosh' | 'riser'
  | 'drop' | 'key' | 'click' | 'snap' | 'swell' | 'bell' | 'suck';

export type SoundEvent = {
  f: number;
  kind: Kind;
  weight?: number;
  pan?: number;
  pitch?: number | string;
  apexFrac?: number;
  dur?: number;
  variant?: string;
  id?: string;
};

const sec = (s: number) => Math.round(s * FPS);
const panX = (x: number) => Math.max(-0.8, Math.min(0.8, ((x - W / 2) / (W / 2)) * 0.8));
const panMark = (cx: number) => panX(HERO.x + (cx / 100) * HERO.size);
const actOf = (f: number) => Object.entries(ACT).find(([, a]) => f >= a.from && f < a.from + a.dur)?.[0] ?? 'tail';

const move = (m: { from: number; to: number; ease: (t: number) => number }, weight: number, pan: number, id: string): SoundEvent => {
  const apex = peak(m.from, m.to, m.ease);
  const dur = Math.max(sec(0.3), m.to - m.from);
  return { f: apex, kind: 'whoosh', weight, pan, dur, apexFrac: (apex - m.from) / (m.to - m.from), id };
};

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];

  [CUE.word1, CUE.word2, CUE.word3, CUE.word4].forEach((f, i) => {
    ev.push({ f, kind: 'pop', weight: 0.9, pan: -0.35 + 0.2 * i, id: `word${i + 1}` });
    ev.push({ f, kind: 'tick', weight: 0.8, pan: 0.4, id: `dot-tick${i + 1}` });
  });
  ev.push({ f: CUE.lock, kind: 'snap', weight: 1.2, pan: 0.1, id: 'lock' });
  ev.push({ f: CUE.pulse, kind: 'tock', weight: 0.8, pan: 0.4, id: 'pulse' });
  ev.push(move(DOT_TRAVEL, 0.6, -0.2, 'statement-out'));
  ev.push({ f: settleOf(DOT_TRAVEL.from, DOT_TRAVEL.to, DOT_TRAVEL.ease), kind: 'tock', weight: 0.5, pan: 0.2, id: 'statement-settle' });

  ev.push({ f: CUE.deskIn, kind: 'whoosh', weight: 0.7, pan: 0, dur: sec(0.4), id: 'desk-in' });
  ev.push({ f: CUE.lease, kind: 'click', weight: 0.9, pan: -0.2, id: 'lease' });
  ev.push({ f: CUE.refuse, kind: 'hit', weight: 1, pan: 0.1, id: 'refuse' });

  ev.push({ f: CUE.start, kind: 'click', weight: 1, variant: 'confirm', pan: -0.1, id: 'start' });
  ev.push({ f: CUE.checking, kind: 'riser', weight: 0.8, dur: sec(1.2), id: 'checking' });
  ev.push({ f: CUE.call1, kind: 'tick', weight: 0.9, pan: -0.3, id: 'call1' });
  ev.push({ f: CUE.call2, kind: 'tick', weight: 1, pan: 0.3, id: 'call2' });
  ev.push({ f: CUE.verified, kind: 'drop', weight: 1.2, id: 'verified' });
  ev.push({ f: CUE.verified, kind: 'snap', weight: 0.9, pan: 0.15, id: 'verified-snap' });
  ev.push({ f: CUE.receipt, kind: 'bell', weight: 0.8, variant: 'motif', id: 'receipt' });

  ev.push({ f: CUE.neatlogs, kind: 'land', weight: 0.9, pan: -0.4, variant: 'light', id: 'neatlogs' });
  ev.push({ f: CUE.entire, kind: 'land', weight: 0.9, pan: 0, variant: 'light', id: 'entire' });
  ev.push({ f: CUE.cfo, kind: 'land', weight: 1, pan: 0.4, id: 'cfo' });

  ev.push({ f: CUE.pieceA, kind: 'land', weight: 1, pan: panMark(MARK.A.cx), id: 'moon' });
  ev.push({ f: CUE.pieceB, kind: 'land', weight: 1, pan: panMark(MARK.B.cx), id: 'spark' });
  ev.push(move(LOCKUP_MOVE, 0.7, 0.3, 'lockup-slide'));
  ev.push({ f: CUE.lockup, kind: 'drop', weight: 1, id: 'lockup' });
  ev.push({ f: CUE.lockup, kind: 'snap', weight: 0.8, pan: 0.2, id: 'name-locks' });
  ev.push({ f: CUE.tick1, kind: 'tick', weight: 1, pan: -0.15, id: 'hold-tick1' });
  ev.push({ f: CUE.tick2, kind: 'tock', weight: 1.2, pan: -0.15, id: 'hold-tock' });
  ev.push({ f: CUE.tick3, kind: 'tick', weight: 1, pan: -0.15, id: 'hold-tick2' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  return ev;
}
