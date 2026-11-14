/**
 * Types shared by the frontend and backend.
 *
 * Every level is laid out on a fixed logical stage (STAGE_W x STAGE_H). The frontend
 * scales the stage to the viewport and converts pointer coordinates back into
 * stage units, so the server can validate positions without caring about screens.
 */

export const STAGE_W = 1000;
export const STAGE_H = 700;

export type AgentMode = 'human' | 'screenshot' | 'dom' | 'hybrid';
export const AGENT_MODES: AgentMode[] = ['human', 'screenshot', 'dom', 'hybrid'];

export type LevelId = 'karate-cat' | 'corporate-burnout' | 'gaslighting' | 'last-brain-cell';
export const LEVEL_ORDER: LevelId[] = ['karate-cat', 'corporate-burnout', 'gaslighting', 'last-brain-cell'];

export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
/** [msSinceLevelStart, x, y] in stage units. */
export type TracePoint = [number, number, number];

// ---------------------------------------------------------------- level configs
// These are the PUBLIC halves of each challenge. The server keeps a separate
// secret half (answers, tolerances) that never leaves the backend.

export interface KarateCatConfig {
  kind: 'karate-cat';
  cat: Rect;
  box: Rect;
  snack: Rect;
  fight: Rect;
  notice: Rect | null;
  noticeText: string;
  taunts: string[];
  catLag: number;
}

export interface BurnoutNotification {
  /** Opaque per-attempt id. Says nothing about which card is the meeting. */
  id: string;
  x: number;
  y: number;
  app: string;
  sender: string;
  title: string;
  body: string;
  icon: 'meeting' | 'pizza' | 'reply' | 'password';
  delayMs: number;
  wiggle: boolean;
}

export interface BurnoutConfig {
  kind: 'corporate-burnout';
  folder: Rect;
  accept: Rect;
  worker: Rect;
  notifications: BurnoutNotification[];
  notice: Rect | null;
  noticeText: string;
  decor: { x: number; y: number; text: string }[];
}

export interface GaslightPhase {
  atMs: number;
  name: 'memorize' | 'scramble' | 'ask';
  colors: [string, string];
  labels: [string, string];
  bubble: string | null;
}

export interface GaslightConfig {
  kind: 'gaslighting';
  slots: [Rect, Rect];
  phases: GaslightPhase[];
  character: Pt;
  notice: Rect | null;
  noticeText: string;
}

export interface MazeConfig {
  kind: 'last-brain-cell';
  cols: number;
  rows: number;
  /** origin + cell size in stage units */
  ox: number;
  oy: number;
  cell: number;
  /** walls[r][c] bitmask: 1=N 2=E 4=S 8=W (1 bit = wall present) */
  walls: number[][];
  start: [number, number];
  goal: [number, number];
  distractors: { emoji: string; x: number; y: number; vx: number; vy: number; size: number }[];
  messages: { text: string; x: number; y: number; fake: boolean }[];
  wobble: number;
}

export type LevelConfig = KarateCatConfig | BurnoutConfig | GaslightConfig | MazeConfig;

// ---------------------------------------------------------------- submissions

export type Submission =
  | { action: 'decoy'; control: string }
  | { action: 'drop'; at: Pt; itemId?: string; trace: TracePoint[]; via?: 'pointer' | 'keyboard' | 'a11y' }
  | { action: 'pick'; slot: 0 | 1; via?: 'pointer' | 'keyboard' | 'a11y' }
  | { action: 'path'; cells: [number, number][]; durationMs: number; samples: number; via?: 'pointer' | 'keyboard' | 'a11y' };

export interface LevelPayload {
  index: number;
  id: LevelId;
  tryNo: number;
  maxTries: number;
  token: string;
  config: LevelConfig;
}

export interface CreateAttemptRequest {
  mode?: AgentMode;
  agentType?: string;
  runLabel?: string;
  injections?: boolean;
  strict?: boolean;
  webdriver?: boolean;
  /** Demo only: start at this level index. Ignored unless the server runs with BBS_DEMO_JUMP=1. */
  startAt?: number;
}

export interface CreateAttemptResponse {
  attemptId: string;
  expiresAt: number;
  levels: LevelId[];
  injections: boolean;
}

export interface SubmitResponse {
  outcome: 'passed' | 'failed';
  reason: string;
  canRetry: boolean;
  finished: null | {
    verified: boolean;
    totalMs: number;
    tries: number;
    rating: string;
    verifyToken: string | null;
  };
}

/** Client → server telemetry. Types are short on purpose. */
export interface ClientEvent {
  t: number;
  type: string;
  level?: LevelId | null;
  x?: number | null;
  y?: number | null;
  data?: Record<string, unknown> | null;
}
