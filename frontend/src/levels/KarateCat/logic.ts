import type { KarateCatConfig, Pt, Rect, Submission, TracePoint } from '../../../../shared/types';
import type { CaptchaLevel } from '../types';

export type KarateAction =
  | { type: 'move'; pos: Pt }
  | { type: 'drop'; pos: Pt; trace: TracePoint[]; via: 'pointer' | 'keyboard' | 'a11y' }
  | { type: 'fight' }
  | { type: 'tick'; dt: number };

export interface KarateState {
  snack: Pt;
  cat: Pt;
  dragging: boolean;
  inBox: boolean;
  fought: boolean;
  missedDrops: number;
  lastDrop: { pos: Pt; trace: TracePoint[]; via: 'pointer' | 'keyboard' | 'a11y' } | null;
}

export const centerOf = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Client-side mirror of the rule; the server re-checks with its own copy of the box. */
export function snackInBox(snackTopLeft: Pt, cfg: KarateCatConfig) {
  const c = { x: snackTopLeft.x + cfg.snack.w / 2, y: snackTopLeft.y + cfg.snack.h / 2 };
  const b = cfg.box;
  const pad = 20;
  return c.x >= b.x - pad && c.x <= b.x + b.w + pad && c.y >= b.y - pad && c.y <= b.y + b.h + pad;
}

export class KarateCatLogic implements CaptchaLevel<KarateCatConfig, KarateAction, KarateState> {
  readonly id = 'karate-cat' as const;
  private cfg!: KarateCatConfig;
  private s!: KarateState;

  constructor(cfg?: KarateCatConfig) {
    if (cfg) this.initialize(cfg);
  }

  initialize(cfg: KarateCatConfig) {
    this.cfg = cfg;
    this.reset();
  }

  reset() {
    this.s = {
      snack: { x: this.cfg.snack.x, y: this.cfg.snack.y },
      cat: { x: this.cfg.cat.x, y: this.cfg.cat.y },
      dragging: false,
      inBox: false,
      fought: false,
      missedDrops: 0,
      lastDrop: null,
    };
  }

  handleInteraction(a: KarateAction) {
    if (this.isComplete()) return;
    switch (a.type) {
      case 'move':
        this.s.snack = a.pos;
        this.s.dragging = true;
        break;
      case 'drop':
        this.s.snack = a.pos;
        this.s.dragging = false;
        if (snackInBox(a.pos, this.cfg)) {
          this.s.inBox = true;
          this.s.lastDrop = { pos: a.pos, trace: a.trace, via: a.via };
        } else this.s.missedDrops++;
        break;
      case 'fight':
        this.s.fought = true;
        break;
      case 'tick': {
        // the cat lazily follows the snack (only while it's being waved around)
        if (!this.s.dragging) break;
        const target = { x: this.s.snack.x + this.cfg.snack.w / 2 - this.cfg.cat.w / 2, y: this.s.snack.y + this.cfg.snack.h / 2 - this.cfg.cat.h * 0.55 };
        const k = Math.min(1, this.cfg.catLag * (a.dt / 16));
        this.s.cat = { x: this.s.cat.x + (target.x - this.s.cat.x) * k, y: this.s.cat.y + (target.y - this.s.cat.y) * k };
        break;
      }
    }
  }

  getState() {
    return this.s;
  }

  isComplete() {
    return this.s.inBox || this.s.fought;
  }

  toSubmission(): Submission | null {
    if (this.s.fought) return { action: 'decoy', control: 'fight-back' };
    if (!this.s.inBox || !this.s.lastDrop) return null;
    const { pos, trace, via } = this.s.lastDrop;
    return { action: 'drop', at: { x: pos.x + this.cfg.snack.w / 2, y: pos.y + this.cfg.snack.h / 2 }, trace, via };
  }
}
