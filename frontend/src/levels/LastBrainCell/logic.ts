import type { MazeConfig, Pt, Submission } from '../../../../shared/types';
import type { CaptchaLevel } from '../types';

type Cell = [number, number];
export const DIRS = {
  up: { bit: 1, dc: 0, dr: -1 },
  right: { bit: 2, dc: 1, dr: 0 },
  down: { bit: 4, dc: 0, dr: 1 },
  left: { bit: 8, dc: -1, dr: 0 },
} as const;
export type Dir = keyof typeof DIRS;

export type MazeAction =
  | { type: 'pointer'; pos: Pt } // stage coords of the dragged brain
  | { type: 'step'; dir: Dir }
  | { type: 'grab'; at: number }
  | { type: 'release' };

export interface MazeState {
  cell: Cell;
  path: Cell[];
  bonks: number;
  lastBonkAt: number;
  grabbedAt: number | null;
  firstMoveAt: number | null;
  finishedAt: number | null;
  samples: number;
  via: 'pointer' | 'keyboard';
}

export function openDirs(cfg: MazeConfig, [c, r]: Cell): Dir[] {
  return (Object.keys(DIRS) as Dir[]).filter((d) => {
    const { bit, dc, dr } = DIRS[d];
    const nc = c + dc, nr = r + dr;
    return (cfg.walls[r][c] & bit) === 0 && nc >= 0 && nr >= 0 && nc < cfg.cols && nr < cfg.rows;
  });
}

export function cellAt(cfg: MazeConfig, p: Pt): Cell | null {
  const c = Math.floor((p.x - cfg.ox) / cfg.cell);
  const r = Math.floor((p.y - cfg.oy) / cfg.cell);
  if (c < 0 || r < 0 || c >= cfg.cols || r >= cfg.rows) return null;
  return [c, r];
}

export const cellCenter = (cfg: MazeConfig, [c, r]: Cell): Pt => ({ x: cfg.ox + (c + 0.5) * cfg.cell, y: cfg.oy + (r + 0.5) * cfg.cell });

/** Short BFS so a quick drag that skips a cell still counts — forgiving for humans, still wall-respecting. */
function routeWithin(cfg: MazeConfig, from: Cell, to: Cell, maxSteps: number): Cell[] | null {
  const key = (x: Cell) => `${x[0]},${x[1]}`;
  const prev = new Map<string, Cell | null>([[key(from), null]]);
  let frontier: Cell[] = [from];
  for (let depth = 0; depth < maxSteps && frontier.length; depth++) {
    const next: Cell[] = [];
    for (const cur of frontier) {
      for (const d of openDirs(cfg, cur)) {
        const n: Cell = [cur[0] + DIRS[d].dc, cur[1] + DIRS[d].dr];
        if (prev.has(key(n))) continue;
        prev.set(key(n), cur);
        if (n[0] === to[0] && n[1] === to[1]) {
          const out: Cell[] = [n];
          let p = cur;
          while (p && !(p[0] === from[0] && p[1] === from[1])) {
            out.unshift(p);
            p = prev.get(key(p))!;
          }
          return out;
        }
        next.push(n);
      }
    }
    frontier = next;
  }
  return null;
}

export class MazeLogic implements CaptchaLevel<MazeConfig, MazeAction, MazeState> {
  readonly id = 'last-brain-cell' as const;
  private cfg!: MazeConfig;
  private s!: MazeState;
  now: () => number = () => performance.now();

  constructor(cfg?: MazeConfig) {
    if (cfg) this.initialize(cfg);
  }
  initialize(cfg: MazeConfig) {
    this.cfg = cfg;
    this.reset();
  }
  reset() {
    const start: Cell = [this.cfg.start[0], this.cfg.start[1]];
    this.s = { cell: start, path: [start], bonks: 0, lastBonkAt: -1e9, grabbedAt: null, firstMoveAt: null, finishedAt: null, samples: 0, via: 'pointer' };
  }
  private moveTo(cells: Cell[]) {
    if (!cells.length) return;
    this.s.firstMoveAt ??= this.now();
    this.s.path.push(...cells);
    this.s.cell = cells[cells.length - 1];
    if (this.s.cell[0] === this.cfg.goal[0] && this.s.cell[1] === this.cfg.goal[1]) this.s.finishedAt = this.now();
  }
  private bonk() {
    const t = this.now();
    if (t - this.s.lastBonkAt > 350) this.s.bonks++;
    this.s.lastBonkAt = t;
  }
  handleInteraction(a: MazeAction) {
    if (this.isComplete()) return;
    switch (a.type) {
      case 'grab':
        this.s.grabbedAt = a.at;
        break;
      case 'release':
        this.s.grabbedAt = null;
        break;
      case 'pointer': {
        this.s.samples++;
        const target = cellAt(this.cfg, a.pos);
        if (!target || (target[0] === this.s.cell[0] && target[1] === this.s.cell[1])) break;
        const route = routeWithin(this.cfg, this.s.cell, target, 3);
        if (route) {
          this.s.via = 'pointer';
          this.moveTo(route);
        } else this.bonk();
        break;
      }
      case 'step': {
        this.s.samples++;
        if (!openDirs(this.cfg, this.s.cell).includes(a.dir)) {
          this.bonk();
          break;
        }
        this.s.via = 'keyboard';
        this.moveTo([[this.s.cell[0] + DIRS[a.dir].dc, this.s.cell[1] + DIRS[a.dir].dr]]);
        break;
      }
    }
  }
  getState() {
    return this.s;
  }
  isComplete() {
    return this.s.finishedAt !== null;
  }
  /** Clamp a dragged position so the brain can't visually pass through walls. */
  clampToCell(p: Pt, radius: number): Pt {
    const { ox, oy, cell, walls } = this.cfg;
    const [c, r] = this.s.cell;
    const w = walls[r][c];
    const x0 = ox + c * cell, y0 = oy + r * cell;
    const slack = cell * 0.45;
    const minX = x0 + radius - (w & 8 ? 0 : slack), maxX = x0 + cell - radius + (w & 2 ? 0 : slack);
    const minY = y0 + radius - (w & 1 ? 0 : slack), maxY = y0 + cell - radius + (w & 4 ? 0 : slack);
    return { x: Math.max(minX, Math.min(maxX, p.x)), y: Math.max(minY, Math.min(maxY, p.y)) };
  }
  toSubmission(): Submission | null {
    if (!this.isComplete()) return null;
    const start = this.s.firstMoveAt ?? this.s.finishedAt!;
    return {
      action: 'path',
      cells: this.s.path.map((c) => [c[0], c[1]] as [number, number]),
      durationMs: Math.round(this.s.finishedAt! - start),
      samples: this.s.samples,
      via: this.s.via,
    };
  }
}
