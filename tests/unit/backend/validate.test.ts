import { describe, expect, it } from 'vitest';
import { genBurnout, genGaslighting, genKarateCat, genMaze } from '../../../backend/src/challenges/levels';
import { shortestPath } from '../../../backend/src/challenges/maze';
import { center } from '../../../backend/src/challenges/geometry';
import { validateSubmission } from '../../../backend/src/validation/validate';
import type { TracePoint } from '../../../shared/types';

const trace: TracePoint[] = [
  [0, 0, 0],
  [100, 50, 50],
  [300, 100, 100],
];

describe('level 1 validation', () => {
  const g = genKarateCat(7, true);
  const ctx = { levelId: 'karate-cat' as const, config: g.public, secret: g.secret, elapsedMs: 3000 };
  it('passes when the snack lands in the box', () => {
    expect(validateSubmission(ctx, { action: 'drop', at: center(g.public.box), trace }).passed).toBe(true);
  });
  it('fails a drop elsewhere, a teleport, and the decoy', () => {
    expect(validateSubmission(ctx, { action: 'drop', at: { x: -500, y: -500 }, trace }).reason).toBe('missed-box');
    expect(validateSubmission(ctx, { action: 'drop', at: center(g.public.box), trace: [[0, 1, 1]] }).reason).toBe('teleport');
    expect(validateSubmission(ctx, { action: 'drop', at: center(g.public.box), trace: [[0, 1, 1], [5, 2, 2], [10, 3, 3]] }).reason).toBe('too-fast');
    const d = validateSubmission(ctx, { action: 'decoy', control: 'fight-back' });
    expect(d.passed).toBe(false);
    expect(d.decoy).toBe(true);
  });
  it('ignores misleading client claims (e.g. a class name) — only geometry counts', () => {
    // @ts-expect-error extra fields are ignored
    expect(validateSubmission(ctx, { action: 'drop', at: { x: 0, y: 0 }, trace, className: 'captcha-correct-answer' }).passed).toBe(false);
  });
  it('rejects malformed input', () => {
    // @ts-expect-error malformed on purpose
    expect(validateSubmission(ctx, null).passed).toBe(false);
    // @ts-expect-error malformed on purpose
    expect(validateSubmission(ctx, { action: 'drop', at: center(g.public.box), trace: 'nope' }).reason).toBe('bad-trace');
  });
});

describe('level 2 validation', () => {
  const g = genBurnout(11, true);
  const ctx = { levelId: 'corporate-burnout' as const, config: g.public, secret: g.secret, elapsedMs: 3000 };
  const other = g.public.notifications.find((n) => n.id !== g.secret.meetingId)!;
  it('passes only for the meeting invite dropped on the folder', () => {
    expect(validateSubmission(ctx, { action: 'drop', itemId: g.secret.meetingId, at: center(g.public.folder), trace }).passed).toBe(true);
    expect(validateSubmission(ctx, { action: 'drop', itemId: other.id, at: center(g.public.folder), trace }).reason).toBe('wrong-notification');
    expect(validateSubmission(ctx, { action: 'drop', itemId: g.secret.meetingId, at: { x: -400, y: 0 }, trace }).reason).toBe('missed-folder');
  });
});

describe('level 3 validation', () => {
  const g = genGaslighting(99, true);
  const base = { levelId: 'gaslighting' as const, config: g.public, secret: g.secret };
  it('requires the ORIGINAL red slot after the reveal', () => {
    const red = g.secret.initialRedSlot;
    expect(validateSubmission({ ...base, elapsedMs: g.secret.askAtMs + 500 }, { action: 'pick', slot: red }).passed).toBe(true);
    expect(validateSubmission({ ...base, elapsedMs: g.secret.askAtMs + 500 }, { action: 'pick', slot: (1 - red) as 0 | 1 }).reason).toBe('gaslit');
    expect(validateSubmission({ ...base, elapsedMs: 300 }, { action: 'pick', slot: red }).reason).toBe('too-early');
  });
});

describe('level 4 validation', () => {
  const g = genMaze(5, true);
  const ctx = { levelId: 'last-brain-cell' as const, config: g.public, secret: g.secret, elapsedMs: 4000 };
  const path = shortestPath(g.public.walls, g.public.start, g.public.goal)!;
  it('accepts a wall-respecting path from start to the safe space', () => {
    expect(validateSubmission(ctx, { action: 'path', cells: path, durationMs: 2000, samples: 80 }).passed).toBe(true);
  });
  it('rejects wall clipping, wrong endpoints and impossibly fast drags', () => {
    const teleport: [number, number][] = [g.public.start, g.public.goal];
    expect(validateSubmission(ctx, { action: 'path', cells: teleport, durationMs: 2000, samples: 2 }).passed).toBe(false);
    expect(validateSubmission(ctx, { action: 'path', cells: path.slice(0, -1), durationMs: 2000, samples: 9 }).reason).toBe('not-at-goal');
    expect(validateSubmission(ctx, { action: 'path', cells: path, durationMs: 40, samples: 9 }).reason).toBe('too-fast');
    expect(validateSubmission({ ...ctx, elapsedMs: 100 }, { action: 'path', cells: path, durationMs: 40, samples: 9, via: 'keyboard' }).reason).toBe('too-fast');
    expect(validateSubmission(ctx, { action: 'path', cells: path, durationMs: 40, samples: 9, via: 'keyboard' }).passed).toBe(true);
  });
});
