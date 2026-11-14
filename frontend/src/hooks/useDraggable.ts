import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { STAGE_H, STAGE_W, type Pt, type TracePoint } from '../../../shared/types';
import { clamp, useStage } from '../lib/stage';

export type DropVia = 'pointer' | 'keyboard';

interface Opts {
  start: Pt;
  size: { w: number; h: number };
  disabled?: boolean;
  onMove?: (pos: Pt) => void;
  onDrop: (pos: Pt, trace: TracePoint[], via: DropVia) => void;
  onGrab?: () => void;
}

/**
 * Pointer-capture drag that works for mouse, pen and touch, plus arrow keys for
 * keyboard users. Positions are top-left corners in stage units.
 */
export function useDraggable({ start, size, disabled, onMove, onDrop, onGrab }: Opts) {
  const { toStage } = useStage();
  const [pos, setPosState] = useState<Pt>(start);
  const [dragging, setDragging] = useState(false);
  const posRef = useRef(pos);
  const offset = useRef<Pt>({ x: 0, y: 0 });
  const trace = useRef<TracePoint[]>([]);
  const t0 = useRef(0);
  const active = useRef(false);

  const setPos = useCallback(
    (p: Pt) => {
      const np = { x: clamp(p.x, 0, STAGE_W - size.w), y: clamp(p.y, 0, STAGE_H - size.h) };
      posRef.current = np;
      setPosState(np);
      onMove?.(np);
    },
    [size.w, size.h, onMove],
  );

  const record = (p: Pt) => {
    if (!trace.current.length) t0.current = performance.now();
    if (trace.current.length < 4000) trace.current.push([Math.round(performance.now() - t0.current), Math.round(p.x), Math.round(p.y)]);
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events may not support capture */
    }
    const p = toStage(e.clientX, e.clientY);
    offset.current = { x: p.x - posRef.current.x, y: p.y - posRef.current.y };
    trace.current = [];
    record(posRef.current);
    active.current = true;
    setDragging(true);
    onGrab?.();
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!active.current) return;
    const p = toStage(e.clientX, e.clientY);
    setPos({ x: p.x - offset.current.x, y: p.y - offset.current.y });
    record(posRef.current);
  };

  const end = () => {
    if (!active.current) return;
    active.current = false;
    setDragging(false);
    record(posRef.current);
    onDrop(posRef.current, trace.current.slice(), 'pointer');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    const step = e.shiftKey ? 70 : 28;
    const moves: Record<string, Pt> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    if (moves[e.key]) {
      e.preventDefault();
      if (!trace.current.length) record(posRef.current);
      setPos({ x: posRef.current.x + moves[e.key].x, y: posRef.current.y + moves[e.key].y });
      record(posRef.current);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      record(posRef.current);
      onDrop(posRef.current, trace.current.slice(), 'keyboard');
      trace.current = [];
    }
  };

  return {
    pos,
    setPos,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onKeyDown },
  };
}
