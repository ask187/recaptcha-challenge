import type { GaslightConfig, GaslightPhase, Submission } from '../../../../shared/types';
import type { CaptchaLevel } from '../types';

export type GaslightAction = { type: 'tick'; elapsedMs: number } | { type: 'pick'; slot: 0 | 1; via: 'pointer' | 'keyboard' | 'a11y' };

export interface GaslightState {
  elapsedMs: number;
  phaseIndex: number;
  phase: GaslightPhase;
  picked: 0 | 1 | null;
  via: 'pointer' | 'keyboard' | 'a11y' | null;
  earlyClicks: number;
}

export class GaslightLogic implements CaptchaLevel<GaslightConfig, GaslightAction, GaslightState> {
  readonly id = 'gaslighting' as const;
  private cfg!: GaslightConfig;
  private s!: GaslightState;

  constructor(cfg?: GaslightConfig) {
    if (cfg) this.initialize(cfg);
  }
  initialize(cfg: GaslightConfig) {
    this.cfg = cfg;
    this.reset();
  }
  reset() {
    this.s = { elapsedMs: 0, phaseIndex: 0, phase: this.cfg.phases[0], picked: null, via: null, earlyClicks: 0 };
  }
  private phaseAt(ms: number) {
    let idx = 0;
    this.cfg.phases.forEach((p, i) => {
      if (ms >= p.atMs) idx = i;
    });
    return idx;
  }
  get askAt() {
    return this.cfg.phases.find((p) => p.name === 'ask')?.atMs ?? 0;
  }
  handleInteraction(a: GaslightAction) {
    if (this.isComplete()) return;
    if (a.type === 'tick') {
      this.s.elapsedMs = a.elapsedMs;
      this.s.phaseIndex = this.phaseAt(a.elapsedMs);
      this.s.phase = this.cfg.phases[this.s.phaseIndex];
      return;
    }
    if (this.s.phase.name !== 'ask') {
      this.s.earlyClicks++;
      return;
    }
    this.s.picked = a.slot;
    this.s.via = a.via;
  }
  getState() {
    return this.s;
  }
  isComplete() {
    return this.s.picked !== null;
  }
  toSubmission(): Submission | null {
    return this.s.picked === null ? null : { action: 'pick', slot: this.s.picked, via: this.s.via ?? 'pointer' };
  }
  /** Which side was red at the start — used only for the accessible announcement. */
  initialRedSide(): 0 | 1 {
    return this.cfg.phases[0].labels[0] === 'RED' ? 0 : 1;
  }
}
