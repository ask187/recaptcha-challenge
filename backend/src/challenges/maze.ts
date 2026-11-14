import type { Rng } from './rng.ts';

export const N = 1, E = 2, S = 4, W = 8;
export const DIRS: { bit: number; dc: number; dr: number; opp: number }[] = [
  { bit: N, dc: 0, dr: -1, opp: S },
  { bit: E, dc: 1, dr: 0, opp: W },
  { bit: S, dc: 0, dr: 1, opp: N },
  { bit: W, dc: -1, dr: 0, opp: E },
];

/** walls[r][c] bitmask, 1 = wall present. Randomised DFS + a few extra openings (forgiving loops). */
export function generateMaze(rng: Rng, cols: number, rows: number, extraOpenings = 3): number[][] {
  const walls = Array.from({ length: rows }, () => Array.from({ length: cols }, () => N | E | S | W));
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stack: [number, number][] = [[rng.int(0, cols - 1), rng.int(0, rows - 1)]];
  seen[stack[0][1]][stack[0][0]] = true;
  while (stack.length) {
    const [c, r] = stack[stack.length - 1];
    const options = DIRS.filter((d) => {
      const nc = c + d.dc, nr = r + d.dr;
      return nc >= 0 && nr >= 0 && nc < cols && nr < rows && !seen[nr][nc];
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const d = rng.pick(options);
    const nc = c + d.dc, nr = r + d.dr;
    walls[r][c] &= ~d.bit;
    walls[nr][nc] &= ~d.opp;
    seen[nr][nc] = true;
    stack.push([nc, nr]);
  }
  for (let i = 0; i < extraOpenings; i++) {
    const c = rng.int(0, cols - 1), r = rng.int(0, rows - 1);
    const d = rng.pick(DIRS);
    const nc = c + d.dc, nr = r + d.dr;
    if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
    walls[r][c] &= ~d.bit;
    walls[nr][nc] &= ~d.opp;
  }
  return walls;
}

export function canMove(walls: number[][], from: [number, number], to: [number, number]): boolean {
  const [c, r] = from;
  const dc = to[0] - c, dr = to[1] - r;
  const d = DIRS.find((x) => x.dc === dc && x.dr === dr);
  if (!d) return false;
  if (to[1] < 0 || to[1] >= walls.length || to[0] < 0 || to[0] >= walls[0].length) return false;
  return (walls[r][c] & d.bit) === 0;
}

/** BFS distances from a cell. */
export function distances(walls: number[][], from: [number, number]): number[][] {
  const rows = walls.length, cols = walls[0].length;
  const dist = Array.from({ length: rows }, () => Array(cols).fill(-1));
  const q: [number, number][] = [from];
  dist[from[1]][from[0]] = 0;
  while (q.length) {
    const cur = q.shift()!;
    for (const d of DIRS) {
      const nxt: [number, number] = [cur[0] + d.dc, cur[1] + d.dr];
      if (canMove(walls, cur, nxt) && dist[nxt[1]][nxt[0]] < 0) {
        dist[nxt[1]][nxt[0]] = dist[cur[1]][cur[0]] + 1;
        q.push(nxt);
      }
    }
  }
  return dist;
}

/** Shortest path from a to b (inclusive), or null. */
export function shortestPath(walls: number[][], a: [number, number], b: [number, number]): [number, number][] | null {
  const dist = distances(walls, b);
  if (dist[a[1]][a[0]] < 0) return null;
  const path: [number, number][] = [a];
  let cur = a;
  while (cur[0] !== b[0] || cur[1] !== b[1]) {
    const here = dist[cur[1]][cur[0]];
    const next = DIRS.map((d) => [cur[0] + d.dc, cur[1] + d.dr] as [number, number]).find(
      (n) => canMove(walls, cur, n) && dist[n[1]][n[0]] === here - 1,
    );
    if (!next) return null;
    path.push(next);
    cur = next;
  }
  return path;
}
