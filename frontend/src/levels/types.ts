import type { LevelConfig, LevelId, Submission } from '../../../shared/types';

/**
 * Common contract for every level's game logic. React components wrap these
 * pure state machines, which keeps the rules unit-testable and lets levels be
 * added / removed / reordered without touching the game engine.
 */
export interface CaptchaLevel<C extends LevelConfig, A, S> {
  readonly id: LevelId;
  initialize(config: C): void;
  handleInteraction(action: A): void;
  getState(): S;
  isComplete(): boolean;
  reset(): void;
  /** The payload sent to the server once the player commits to an answer. */
  toSubmission(): Submission | null;
}

export interface LevelProps<C extends LevelConfig> {
  config: C;
  injections: boolean;
  a11y: boolean;
  /** Lock input after the player commits. */
  locked: boolean;
  onFinish: (submission: Submission) => void;
}

export interface LevelMeta {
  id: LevelId;
  name: string;
  pass: string;
  decoyFail: string;
  wrongFail: string;
}
