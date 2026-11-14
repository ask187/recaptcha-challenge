/** Tiny synthesized sound effects — no audio files, works offline. */
let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem('bbs.muted') === '1';
  } catch {
    return false;
  }
})();
const listeners = new Set<(m: boolean) => void>();

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem('bbs.muted', m ? '1' : '0');
  } catch {
    /* storage may be blocked */
  }
  listeners.forEach((l) => l(m));
}
export function onMuteChange(fn: (m: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', when = 0, vol = 0.06, slide?: number) {
  if (muted || typeof window === 'undefined' || !('AudioContext' in window)) return;
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* audio is optional */
  }
}

export const sfx = {
  pop: () => tone(660, 0.08, 'triangle', 0, 0.08, 990),
  grab: () => tone(420, 0.06, 'triangle', 0, 0.06, 520),
  bonk: () => tone(160, 0.15, 'sawtooth', 0, 0.05, 90),
  success: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', i * 0.08, 0.07)),
  fail: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.18, 'sawtooth', i * 0.12, 0.04)),
  tick: () => tone(1200, 0.03, 'square', 0, 0.02),
};
