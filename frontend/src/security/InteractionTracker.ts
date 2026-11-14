import type { ClientEvent, LevelId } from '../../../shared/types';

type Sender = (events: ClientEvent[]) => Promise<unknown>;

/** Elements that count as "something you meant to hit". Clicks elsewhere on the stage count as misses. */
export const HIT_CLASS = 'bbs-i';

/**
 * Collects pointer / keyboard telemetry for the active attempt and ships it in
 * batches. Coordinates are converted to stage units when the pointer is over
 * the playfield so the replay viewer can draw trajectories on the level layout.
 *
 * Only key *names* for navigation keys are recorded — never typed text.
 */
export class InteractionTracker {
  private queue: ClientEvent[] = [];
  private t0 = 0;
  private level: LevelId | null = null;
  private stage: HTMLElement | null = null;
  private scale = 1;
  private send: Sender | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastMove = 0;
  private bound = false;

  begin(send: Sender) {
    this.send = send;
    this.t0 = performance.now();
    this.queue = [];
    this.bind();
    this.timer ??= setInterval(() => void this.flush(), 2000);
  }

  end() {
    void this.flush();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.send = null;
  }

  setLevel(level: LevelId | null) {
    this.level = level;
  }

  setStage(el: HTMLElement | null, scale: number) {
    this.stage = el;
    this.scale = scale;
  }

  now() {
    return Math.round(performance.now() - this.t0);
  }

  log(type: string, data?: Record<string, unknown> | null, pt?: { x: number; y: number } | null, urgent = false) {
    if (!this.send) return;
    this.queue.push({ t: this.now(), type, level: this.level, x: pt?.x ?? null, y: pt?.y ?? null, data: data ?? null });
    if (urgent || this.queue.length > 400) void this.flush();
  }

  async flush() {
    if (!this.send || !this.queue.length) return;
    const batch = this.queue;
    this.queue = [];
    try {
      await this.send(batch);
    } catch {
      // put them back once; telemetry must never break the game
      if (this.queue.length < 2000) this.queue.unshift(...batch);
    }
  }

  private toStage(e: PointerEvent | MouseEvent) {
    if (!this.stage) return null;
    const r = this.stage.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null;
    return {
      x: Math.round(((e.clientX - r.left - this.stage.clientLeft) / this.scale) * 10) / 10,
      y: Math.round(((e.clientY - r.top - this.stage.clientTop) / this.scale) * 10) / 10,
    };
  }

  private bind() {
    if (this.bound || typeof window === 'undefined') return;
    this.bound = true;
    window.addEventListener(
      'pointermove',
      (e) => {
        const now = performance.now();
        if (now - this.lastMove < 40) return;
        this.lastMove = now;
        const p = this.toStage(e);
        if (p) this.log('pm', e.pointerType !== 'mouse' ? { pt: e.pointerType } : null, p);
      },
      { passive: true, capture: true },
    );
    window.addEventListener(
      'pointerdown',
      (e) => {
        const p = this.toStage(e);
        const target = e.target as HTMLElement | null;
        const hit = !!target?.closest?.(`.${HIT_CLASS}, button, canvas, input, a`);
        this.log('pd', { pt: e.pointerType, trusted: e.isTrusted }, p);
        if (p && !hit) this.log('miss', null, p);
      },
      { capture: true },
    );
    window.addEventListener('pointerup', (e) => this.log('pu', null, this.toStage(e)), { capture: true });
    window.addEventListener('click', (e) => this.log('click', { trusted: e.isTrusted }, this.toStage(e)), { capture: true });
    window.addEventListener(
      'keydown',
      (e) => {
        const nav = ['Tab', 'Enter', ' ', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        this.log('key', { k: nav.includes(e.key) ? e.key : 'other', trusted: e.isTrusted });
      },
      { capture: true },
    );
    document.addEventListener('visibilitychange', () => this.log('vis', { state: document.visibilityState }));
    window.addEventListener('pagehide', () => void this.flush());
  }
}

export const tracker = new InteractionTracker();
