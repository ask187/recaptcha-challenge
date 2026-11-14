import type { Pt, Rect } from '../../../shared/types.ts';
import { STAGE_H, STAGE_W } from '../../../shared/types.ts';
import type { Rng } from './rng.ts';

export const center = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export function inflate(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 };
}

export function contains(r: Rect, p: Pt) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

export function overlaps(a: Rect, b: Rect, gap = 0) {
  return !(a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y);
}

export interface PlaceSpec {
  w: number;
  h: number;
  /** allowed region for the top-left corner */
  region?: Rect;
  /** extra predicate, e.g. "far from the box" */
  ok?: (r: Rect, placed: Rect[]) => boolean;
}

/**
 * Rejection-sample non-overlapping rectangles. Falls back to a looser gap if the
 * random layout gets unlucky, so a challenge is always generated (and solvable).
 */
export function placeAll(rng: Rng, specs: PlaceSpec[], gap = 24, margin = 20): Rect[] {
  for (let g = gap; g >= 0; g -= 8) {
    for (let attempt = 0; attempt < 400; attempt++) {
      const placed: Rect[] = [];
      let failed = false;
      for (const s of specs) {
        const region = s.region ?? { x: margin, y: margin, w: STAGE_W - margin * 2, h: STAGE_H - margin * 2 };
        let found: Rect | null = null;
        for (let k = 0; k < 60 && !found; k++) {
          const r: Rect = {
            x: Math.round(rng.float(region.x, Math.max(region.x, region.x + region.w - s.w))),
            y: Math.round(rng.float(region.y, Math.max(region.y, region.y + region.h - s.h))),
            w: s.w,
            h: s.h,
          };
          if (r.x + r.w > STAGE_W - margin || r.y + r.h > STAGE_H - margin) continue;
          if (placed.some((p) => overlaps(p, r, g))) continue;
          if (s.ok && !s.ok(r, placed)) continue;
          found = r;
        }
        if (!found) {
          failed = true;
          break;
        }
        placed.push(found);
      }
      if (!failed) return placed;
    }
  }
  throw new Error('could not place layout');
}
