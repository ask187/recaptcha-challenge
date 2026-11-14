import type { BurnoutConfig, Pt, Submission, TracePoint } from '../../../../shared/types';
import type { CaptchaLevel } from '../types';

export const CARD_W = 300;
export const CARD_H = 110;

export type BurnoutAction =
  | { type: 'drop'; id: string; pos: Pt; trace: TracePoint[]; via: 'pointer' | 'keyboard' | 'a11y' }
  | { type: 'accept' };

export interface BurnoutState {
  cards: Record<string, Pt>;
  filed: { id: string; at: Pt; trace: TracePoint[]; via: 'pointer' | 'keyboard' | 'a11y' } | null;
  accepted: boolean;
}

/** True if the card's centre lands on the folder. The client doesn't know which card is "right" — the server does. */
export function cardOnFolder(pos: Pt, cfg: BurnoutConfig) {
  const c = { x: pos.x + CARD_W / 2, y: pos.y + CARD_H / 2 };
  const f = cfg.folder, pad = 20;
  return c.x >= f.x - pad && c.x <= f.x + f.w + pad && c.y >= f.y - pad && c.y <= f.y + f.h + pad;
}

export class BurnoutLogic implements CaptchaLevel<BurnoutConfig, BurnoutAction, BurnoutState> {
  readonly id = 'corporate-burnout' as const;
  private cfg!: BurnoutConfig;
  private s!: BurnoutState;

  constructor(cfg?: BurnoutConfig) {
    if (cfg) this.initialize(cfg);
  }
  initialize(cfg: BurnoutConfig) {
    this.cfg = cfg;
    this.reset();
  }
  reset() {
    this.s = { cards: Object.fromEntries(this.cfg.notifications.map((n) => [n.id, { x: n.x, y: n.y }])), filed: null, accepted: false };
  }
  handleInteraction(a: BurnoutAction) {
    if (this.isComplete()) return;
    if (a.type === 'accept') {
      this.s.accepted = true;
      return;
    }
    this.s.cards[a.id] = a.pos;
    if (cardOnFolder(a.pos, this.cfg)) {
      this.s.filed = { id: a.id, at: { x: a.pos.x + CARD_W / 2, y: a.pos.y + CARD_H / 2 }, trace: a.trace, via: a.via };
    }
  }
  getState() {
    return this.s;
  }
  isComplete() {
    return !!this.s.filed || this.s.accepted;
  }
  toSubmission(): Submission | null {
    if (this.s.accepted) return { action: 'decoy', control: 'accept-call' };
    if (!this.s.filed) return null;
    return { action: 'drop', itemId: this.s.filed.id, at: this.s.filed.at, trace: this.s.filed.trace, via: this.s.filed.via };
  }
}
