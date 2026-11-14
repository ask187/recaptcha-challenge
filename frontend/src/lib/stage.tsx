import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { STAGE_H, STAGE_W, type Pt } from '../../../shared/types';
import { tracker } from '../security/InteractionTracker';

interface StageApi {
  scale: number;
  toStage: (clientX: number, clientY: number) => Pt;
}

const StageCtx = createContext<StageApi>({ scale: 1, toStage: (x, y) => ({ x, y }) });
export const useStage = () => useContext(StageCtx);

/**
 * A fixed 1000×700 logical playfield scaled to fit its container. All level
 * geometry (and everything the server validates) is in these logical units.
 */
export function Stage({ children, className = '', label }: { children: ReactNode; className?: string; label?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(STAGE_W);
  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || STAGE_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = width / STAGE_W;
  const api = useMemo<StageApi>(
    () => ({
      scale,
      toStage: (cx, cy) => {
        const el = outer.current;
        if (!el) return { x: cx, y: cy };
        const r = el.getBoundingClientRect();
        return { x: (cx - r.left - el.clientLeft) / scale, y: (cy - r.top - el.clientTop) / scale };
      },
    }),
    [scale],
  );
  useLayoutEffect(() => {
    tracker.setStage(outer.current, scale);
    return () => tracker.setStage(null, 1);
  }, [scale]);

  return (
    <StageCtx.Provider value={api}>
      <div
        ref={outer}
        className={`relative w-full overflow-hidden card-wobbly ${className}`}
        style={{ height: STAGE_H * scale + 8 }}
        role="group"
        aria-label={label}
      >
        <div
          className="stage-surface absolute left-0 top-0 origin-top-left"
          style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </StageCtx.Provider>
  );
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
