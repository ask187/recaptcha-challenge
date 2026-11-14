import { describe, expect, it } from 'vitest';
import { genBurnout, genGaslighting, genKarateCat, genMaze } from '../../../backend/src/challenges/levels';
import { shortestPath } from '../../../backend/src/challenges/maze';
import { validateSubmission } from '../../../backend/src/validation/validate';
import { KarateCatLogic } from '../../../frontend/src/levels/KarateCat/logic';
import { BurnoutLogic, CARD_H, CARD_W } from '../../../frontend/src/levels/CorporateBurnout/logic';
import { GaslightLogic } from '../../../frontend/src/levels/Gaslighting/logic';
import { MazeLogic, cellCenter, openDirs, type Dir } from '../../../frontend/src/levels/LastBrainCell/logic';
import type { TracePoint } from '../../../shared/types';

const trace: TracePoint[] = [
  [0, 0, 0],
  [150, 10, 10],
  [300, 20, 20],
];

describe('KarateCatLogic', () => {
  const g = genKarateCat(3, true);
  it('completes when the snack is dropped in the box, and the server agrees', () => {
    const l = new KarateCatLogic(g.public);
    l.handleInteraction({ type: 'drop', pos: { x: g.public.box.x + 40, y: g.public.box.y + 20 }, trace, via: 'pointer' });
    expect(l.isComplete()).toBe(true);
    const sub = l.toSubmission()!;
    expect(validateSubmission({ levelId: 'karate-cat', config: g.public, secret: g.secret, elapsedMs: 2000 }, sub).passed).toBe(true);
  });
  it('a drop outside the box is forgiven (not a failure)', () => {
    const l = new KarateCatLogic(g.public);
    l.handleInteraction({ type: 'drop', pos: { x: g.public.snack.x, y: g.public.snack.y }, trace, via: 'pointer' });
    expect(l.isComplete()).toBe(false);
    expect(l.getState().missedDrops).toBe(1);
    expect(l.toSubmission()).toBeNull();
  });
  it('FIGHT BACK produces a decoy submission', () => {
    const l = new KarateCatLogic(g.public);
    l.handleInteraction({ type: 'fight' });
    expect(l.toSubmission()).toEqual({ action: 'decoy', control: 'fight-back' });
  });
  it('the cat follows the snack while dragging', () => {
    const l = new KarateCatLogic(g.public);
    const before = { ...l.getState().cat };
    l.handleInteraction({ type: 'move', pos: { x: 900, y: 600 } });
    for (let i = 0; i < 20; i++) l.handleInteraction({ type: 'tick', dt: 16 });
    expect(l.getState().cat).not.toEqual(before);
  });
});

describe('BurnoutLogic', () => {
  const g = genBurnout(8, true);
  const folderDrop = { x: g.public.folder.x + g.public.folder.w / 2 - CARD_W / 2, y: g.public.folder.y + g.public.folder.h / 2 - CARD_H / 2 };
  it('submits whichever card is filed; only the meeting passes on the server', () => {
    for (const n of g.public.notifications) {
      const l = new BurnoutLogic(g.public);
      l.handleInteraction({ type: 'drop', id: n.id, pos: folderDrop, trace, via: 'pointer' });
      const ok = validateSubmission({ levelId: 'corporate-burnout', config: g.public, secret: g.secret, elapsedMs: 3000 }, l.toSubmission()!).passed;
      expect(ok).toBe(n.id === g.secret.meetingId);
    }
  });
});

describe('GaslightLogic', () => {
  const g = genGaslighting(21, true);
  it('ignores clicks during memorize and accepts them after the reveal', () => {
    const l = new GaslightLogic(g.public);
    l.handleInteraction({ type: 'tick', elapsedMs: 100 });
    l.handleInteraction({ type: 'pick', slot: 0, via: 'pointer' });
    expect(l.isComplete()).toBe(false);
    expect(l.getState().earlyClicks).toBe(1);
    l.handleInteraction({ type: 'tick', elapsedMs: g.secret.askAtMs + 10 });
    expect(l.getState().phase.name).toBe('ask');
    l.handleInteraction({ type: 'pick', slot: g.secret.initialRedSlot, via: 'pointer' });
    expect(l.toSubmission()).toEqual({ action: 'pick', slot: g.secret.initialRedSlot, via: 'pointer' });
  });
  it('knows which side started red (for the accessible announcement)', () => {
    expect(new GaslightLogic(g.public).initialRedSide()).toBe(g.secret.initialRedSlot);
  });
});

describe('MazeLogic', () => {
  const g = genMaze(13, true);
  const m = g.public;
  const dirOf = (a: [number, number], b: [number, number]): Dir => (b[0] > a[0] ? 'right' : b[0] < a[0] ? 'left' : b[1] > a[1] ? 'down' : 'up');

  it('keyboard steps along the shortest path reach the safe space and pass server validation', () => {
    const l = new MazeLogic(m);
    let t = 0;
    l.now = () => (t += 120);
    const path = shortestPath(m.walls, m.start, m.goal)!;
    for (let i = 1; i < path.length; i++) l.handleInteraction({ type: 'step', dir: dirOf(path[i - 1], path[i]) });
    expect(l.isComplete()).toBe(true);
    expect(validateSubmission({ levelId: 'last-brain-cell', config: m, secret: g.secret, elapsedMs: 5000 }, l.toSubmission()!).passed).toBe(true);
  });

  it('dragging the pointer through cell centres works, even skipping a cell', () => {
    const l = new MazeLogic(m);
    let t = 0;
    l.now = () => (t += 400);
    const path = shortestPath(m.walls, m.start, m.goal)!;
    // only every other cell centre: the forgiving router fills the gaps
    for (let i = 2; i < path.length; i += 2) l.handleInteraction({ type: 'pointer', pos: cellCenter(m, path[i]) });
    l.handleInteraction({ type: 'pointer', pos: cellCenter(m, path[path.length - 1]) });
    expect(l.isComplete()).toBe(true);
    const sub = l.toSubmission()!;
    expect(validateSubmission({ levelId: 'last-brain-cell', config: m, secret: g.secret, elapsedMs: 5000 }, sub).passed).toBe(true);
  });

  it('walls bonk instead of letting the brain through', () => {
    const l = new MazeLogic(m);
    const open = openDirs(m, m.start);
    const blocked = (['up', 'down', 'left', 'right'] as Dir[]).find((d) => !open.includes(d))!;
    l.handleInteraction({ type: 'step', dir: blocked });
    expect(l.getState().bonks).toBe(1);
    expect(l.getState().cell).toEqual(m.start);
  });
});
