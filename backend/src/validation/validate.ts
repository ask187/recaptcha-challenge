import type { LevelConfig, LevelId, MazeConfig, Submission, TracePoint } from '../../../shared/types.ts';
import type { BurnoutSecret, GaslightSecret, KarateSecret, MazeSecret } from '../challenges/levels.ts';
import { contains, inflate } from '../challenges/geometry.ts';
import { canMove } from '../challenges/maze.ts';

export interface ValidationContext {
  levelId: LevelId;
  config: LevelConfig;
  secret: unknown;
  /** server-measured ms between the level being issued and this submission */
  elapsedMs: number;
}

export interface ValidationResult {
  passed: boolean;
  /** short machine-readable reason, shown on the dashboard, never to players */
  reason: string;
  decoy: boolean;
}

const fail = (reason: string, decoy = false): ValidationResult => ({ passed: false, reason, decoy });
const pass = (reason = 'ok'): ValidationResult => ({ passed: true, reason, decoy: false });

function traceSpan(trace: TracePoint[] | undefined) {
  if (!Array.isArray(trace) || trace.length < 2) return 0;
  return trace[trace.length - 1][0] - trace[0][0];
}

function validTrace(trace: unknown): trace is TracePoint[] {
  return (
    Array.isArray(trace) &&
    trace.length <= 5000 &&
    trace.every((p) => Array.isArray(p) && p.length === 3 && p.every((n) => typeof n === 'number' && Number.isFinite(n)))
  );
}

export function validateSubmission(ctx: ValidationContext, sub: Submission): ValidationResult {
  if (!sub || typeof sub !== 'object' || typeof (sub as { action?: unknown }).action !== 'string') return fail('malformed');
  if (sub.action === 'decoy') return fail(`decoy:${String(sub.control).slice(0, 40)}`, true);

  switch (ctx.levelId) {
    case 'karate-cat': {
      if (sub.action !== 'drop') return fail('wrong-action');
      const secret = ctx.secret as KarateSecret;
      if (!validTrace(sub.trace)) return fail('bad-trace');
      if (sub.via !== 'a11y') {
        if (sub.trace.length < 3) return fail('teleport');
        if (traceSpan(sub.trace) < secret.minTraceMs) return fail('too-fast');
      }
      return contains(inflate(secret.box, 30), sub.at) ? pass() : fail('missed-box');
    }
    case 'corporate-burnout': {
      if (sub.action !== 'drop') return fail('wrong-action');
      const secret = ctx.secret as BurnoutSecret;
      if (!validTrace(sub.trace)) return fail('bad-trace');
      if (sub.via !== 'a11y' && sub.trace.length < 3) return fail('teleport');
      if (!contains(inflate(secret.folder, 30), sub.at)) return fail('missed-folder');
      return sub.itemId === secret.meetingId ? pass() : fail('wrong-notification');
    }
    case 'gaslighting': {
      if (sub.action !== 'pick') return fail('wrong-action');
      const secret = ctx.secret as GaslightSecret;
      // the buttons are inert until the ask phase; allow a little network slack
      if (ctx.elapsedMs < secret.askAtMs - 250) return fail('too-early');
      return sub.slot === secret.initialRedSlot ? pass() : fail('gaslit');
    }
    case 'last-brain-cell': {
      if (sub.action !== 'path') return fail('wrong-action');
      const cfg = ctx.config as MazeConfig;
      const secret = ctx.secret as MazeSecret;
      const cells = sub.cells;
      if (!Array.isArray(cells) || cells.length < 2 || cells.length > 400) return fail('bad-path');
      const same = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];
      if (!same(cells[0], cfg.start)) return fail('wrong-start');
      if (!same(cells[cells.length - 1], cfg.goal)) return fail('not-at-goal');
      for (let i = 1; i < cells.length; i++) {
        const c = cells[i];
        if (!Array.isArray(c) || c.length !== 2 || !c.every(Number.isInteger)) return fail('bad-path');
        if (!canMove(cfg.walls, cells[i - 1], c)) return fail(`wall-clip@${i}`);
      }
      if (cells.length - 1 < secret.shortest) return fail('impossible-path');
      if (ctx.elapsedMs < secret.minDurationMs) return fail('too-fast');
      // a dragged path shorter than this is a teleport; keyboard steps can legitimately be quick
      if (sub.via !== 'keyboard' && sub.via !== 'a11y' && (sub.durationMs ?? 0) < secret.minDurationMs) return fail('too-fast');
      return pass();
    }
  }
}
