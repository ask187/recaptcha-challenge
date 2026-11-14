import { describe, expect, it } from 'vitest';
import { genBurnout, genGaslighting, genKarateCat, genMaze } from '../../../backend/src/challenges/levels';
import { Rng, deriveSeed } from '../../../backend/src/challenges/rng';
import { overlaps, center, dist } from '../../../backend/src/challenges/geometry';
import { distances, shortestPath } from '../../../backend/src/challenges/maze';
import { STAGE_H, STAGE_W, type Rect } from '../../../shared/types';

const SEEDS = Array.from({ length: 300 }, (_, i) => deriveSeed(1234, i));
const inStage = (r: Rect) => r.x >= 0 && r.y >= 0 && r.x + r.w <= STAGE_W && r.y + r.h <= STAGE_H;

describe('rng', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const a = new Rng(42), b = new Rng(42), c = new Rng(43);
    const sa = Array.from({ length: 5 }, () => a.float());
    expect(Array.from({ length: 5 }, () => b.float())).toEqual(sa);
    expect(Array.from({ length: 5 }, () => c.float())).not.toEqual(sa);
  });
});

describe('karate cat generator', () => {
  it('produces non-overlapping, on-stage layouts with the snack far from the box', () => {
    for (const s of SEEDS) {
      const { public: p } = genKarateCat(s, true);
      const rects = [p.cat, p.box, p.snack, p.fight, p.notice!];
      rects.forEach((r) => expect(inStage(r)).toBe(true));
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) expect(overlaps(rects[i], rects[j])).toBe(false);
      expect(dist(center(p.snack), center(p.box))).toBeGreaterThan(360);
    }
  });
  it('randomizes positions across attempts', () => {
    const xs = new Set(SEEDS.slice(0, 30).map((s) => genKarateCat(s, true).public.box.x));
    expect(xs.size).toBeGreaterThan(10);
  });
  it('omits the visual injection when injections are off', () => {
    expect(genKarateCat(SEEDS[0], false).public.notice).toBeNull();
  });
});

describe('corporate burnout generator', () => {
  it('has exactly one meeting, opaque ids, and the answer only in the secret', () => {
    for (const s of SEEDS.slice(0, 100)) {
      const g = genBurnout(s, true);
      const meeting = g.public.notifications.find((n) => n.icon === 'meeting')!;
      expect(g.secret.meetingId).toBe(meeting.id);
      expect(g.public.notifications).toHaveLength(2);
      g.public.notifications.forEach((n) => expect(n.id).toMatch(/^[a-z0-9]{6}$/));
      expect(JSON.stringify(g.public)).not.toContain('meetingId');
      // distractor appears after the meeting
      const other = g.public.notifications.find((n) => n !== meeting)!;
      expect(other.delayMs).toBeGreaterThan(meeting.delayMs);
    }
  });
});

describe('gaslighting generator', () => {
  it('swaps colours after the memorize phase and labels the wrong button RED', () => {
    for (const s of SEEDS.slice(0, 100)) {
      const g = genGaslighting(s, true);
      const [mem, , ask] = g.public.phases;
      const red = g.secret.initialRedSlot;
      expect(mem.colors[red]).toBe('#F36B6B');
      expect(ask.colors[red]).not.toBe('#F36B6B');
      expect(ask.labels[red]).toBe('BLUE');
      expect(ask.labels[1 - red]).toBe('RED');
      expect(mem.atMs).toBe(0);
      expect(ask.atMs).toBe(g.secret.askAtMs);
      // humans get at least ~1.9s to look
      expect(g.public.phases[1].atMs).toBeGreaterThanOrEqual(1900);
    }
  });
  it('randomizes which side starts red', () => {
    const sides = new Set(SEEDS.slice(0, 40).map((s) => genGaslighting(s, true).secret.initialRedSlot));
    expect(sides.size).toBe(2);
  });
});

describe('maze generator', () => {
  it('is always solvable with a comfortable shortest path', () => {
    for (const s of SEEDS) {
      const { public: m, secret } = genMaze(s, true);
      const path = shortestPath(m.walls, m.start, m.goal);
      expect(path).not.toBeNull();
      expect(path!.length - 1).toBe(secret.shortest);
      expect(secret.shortest).toBeGreaterThanOrEqual(6);
      expect(secret.shortest).toBeLessThanOrEqual(11);
      // every cell reachable (perfect maze + openings)
      expect(distances(m.walls, m.start).flat().every((d) => d >= 0)).toBe(true);
      // outer boundary is closed
      for (let c = 0; c < m.cols; c++) expect(m.walls[0][c] & 1).toBe(1);
      for (let r = 0; r < m.rows; r++) expect(m.walls[r][0] & 8).toBe(8);
      // fits on the stage
      expect(m.oy + m.rows * m.cell).toBeLessThan(STAGE_H - 50);
    }
  });
  it('adds a fake system message only when injections are on', () => {
    expect(genMaze(SEEDS[1], true).public.messages.some((x) => x.fake)).toBe(true);
    expect(genMaze(SEEDS[1], false).public.messages.some((x) => x.fake)).toBe(false);
  });
});
