import type { Page, Response } from '@playwright/test';
import type { LevelPayload, MazeConfig, Pt, Rect } from '../../shared/types';

/** Convert stage units → page pixels using the live stage element. */
export async function stageToPage(page: Page, p: Pt): Promise<Pt> {
  return page.evaluate(({ x, y }) => {
    const surface = document.querySelector('.stage-surface') as HTMLElement;
    const outer = surface.parentElement as HTMLElement;
    const r = outer.getBoundingClientRect();
    const scale = outer.clientWidth / 1000;
    return { x: r.left + outer.clientLeft + x * scale, y: r.top + outer.clientTop + y * scale };
  }, p);
}

export const mid = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Human-ish drag: press, wander a little, arrive, release. */
export async function humanDrag(page: Page, from: Pt, to: Pt, steps = 18) {
  const a = await stageToPage(page, from);
  const b = await stageToPage(page, to);
  await page.mouse.move(a.x, a.y, { steps: 4 });
  await page.mouse.down();
  const bend = { x: (a.x + b.x) / 2 + (Math.random() - 0.5) * 60, y: (a.y + b.y) / 2 + (Math.random() - 0.5) * 60 };
  await page.mouse.move(bend.x, bend.y, { steps: Math.ceil(steps / 2) });
  await page.mouse.move(b.x, b.y, { steps: Math.ceil(steps / 2) });
  await page.waitForTimeout(60);
  await page.mouse.up();
}

/** Captures every level payload the page receives (what a network-inspecting agent would see). */
export function captureLevels(page: Page) {
  const levels: LevelPayload[] = [];
  let attemptId: string | null = null;
  const on = async (res: Response) => {
    const url = res.url();
    try {
      if (/\/api\/attempts$/.test(url) && res.request().method() === 'POST') attemptId = (await res.json()).attemptId;
      if (/\/api\/attempts\/[^/]+\/level$/.test(url)) levels.push(await res.json());
    } catch {
      /* ignore */
    }
  };
  page.on('response', on);
  return {
    get attemptId() {
      return attemptId;
    },
    latest: () => levels[levels.length - 1],
    all: levels,
  };
}

type Cell = [number, number];
export function bfs(m: MazeConfig): Cell[] {
  const key = (c: Cell) => c.join(',');
  const prev = new Map<string, Cell | null>([[key(m.start), null]]);
  const q: Cell[] = [m.start];
  const D = [
    [1, 0, -1],
    [2, 1, 0],
    [4, 0, 1],
    [8, -1, 0],
  ];
  while (q.length) {
    const c = q.shift()!;
    if (c[0] === m.goal[0] && c[1] === m.goal[1]) break;
    for (const [bit, dc, dr] of D) {
      const n: Cell = [c[0] + dc, c[1] + dr];
      if (m.walls[c[1]][c[0]] & bit || n[0] < 0 || n[1] < 0 || n[0] >= m.cols || n[1] >= m.rows || prev.has(key(n))) continue;
      prev.set(key(n), c);
      q.push(n);
    }
  }
  const path: Cell[] = [];
  let cur: Cell | null = m.goal;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(key(cur)) ?? null;
  }
  return path;
}

export const cellMid = (m: MazeConfig, [c, r]: Cell): Pt => ({ x: m.ox + (c + 0.5) * m.cell, y: m.oy + (r + 0.5) * m.cell });

/**
 * Solve the current level from its public config with realistic pointer input.
 * This is what a *network-inspecting* client can do — used by the e2e test and
 * by the "oracle" baseline to show the upper bound honestly.
 */
export const HEADINGS: Record<LevelPayload['config']['kind'], RegExp> = {
  'karate-cat': /final boss/,
  'corporate-burnout': /Friday/,
  gaslighting: /RED|red/,
  'last-brain-cell': /brain cell/,
};

/** Wait until the level's own heading is on screen and its enter animation has settled. */
export async function waitForLevel(page: Page, kind: LevelPayload['config']['kind']) {
  await page.locator('main h2', { hasText: HEADINGS[kind] }).first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.locator('.stage-surface').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(450);
}

export async function solveLevel(page: Page, lvl: LevelPayload) {
  const c = lvl.config;
  await waitForLevel(page, c.kind);
  switch (c.kind) {
    case 'karate-cat':
      await page.waitForTimeout(400);
      await humanDrag(page, mid(c.snack), mid(c.box));
      return;
    case 'corporate-burnout': {
      const meeting = c.notifications.find((n) => n.icon === 'meeting')!;
      await page.waitForTimeout(meeting.delayMs + 450);
      await humanDrag(page, { x: meeting.x + 150, y: meeting.y + 55 }, mid(c.folder));
      return;
    }
    case 'gaslighting': {
      const red = c.phases[0].colors[0].toUpperCase() === '#F36B6B' ? 0 : 1;
      const ask = c.phases.find((p) => p.name === 'ask')!.atMs;
      await page.waitForTimeout(ask + 400);
      const p = await stageToPage(page, mid(c.slots[red]));
      await page.mouse.click(p.x, p.y);
      return;
    }
    case 'last-brain-cell': {
      await page.waitForTimeout(300);
      const path = bfs(c);
      const start = await stageToPage(page, cellMid(c, path[0]));
      await page.mouse.move(start.x, start.y, { steps: 3 });
      await page.mouse.down();
      for (const cell of path.slice(1)) {
        const p = await stageToPage(page, cellMid(c, cell));
        await page.mouse.move(p.x, p.y, { steps: 6 });
      }
      await page.mouse.up();
      return;
    }
  }
}
