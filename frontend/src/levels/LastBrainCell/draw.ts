import type { MazeConfig, Pt } from '../../../../shared/types';

const INK = '#25212B';

/** Deterministic pseudo-noise so walls wobble the same way every frame. */
const noise = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s) - 0.5;
};

function wobblyLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, amt: number) {
  const mx = (x1 + x2) / 2 + noise(x1, y2) * amt * 4;
  const my = (y1 + y2) / 2 + noise(y1, x2) * amt * 4;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(mx, my, x2, y2);
  ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawMaze(ctx: CanvasRenderingContext2D, cfg: MazeConfig, t: number, visited: [number, number][]) {
  const { ox, oy, cell, cols, rows, walls, goal, start } = cfg;
  // floor tiles
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 ? '#EAF8EF' : '#F3FBF5';
      roundRect(ctx, ox + c * cell + 4, oy + r * cell + 4, cell - 8, cell - 8, 26);
      ctx.fill();
    }
  // start pad
  ctx.fillStyle = 'rgba(187,169,245,.35)';
  roundRect(ctx, ox + start[0] * cell + 14, oy + start[1] * cell + 14, cell - 28, cell - 28, 30);
  ctx.fill();
  // safe space
  const gx = ox + goal[0] * cell, gy = oy + goal[1] * cell;
  const pulse = 1 + Math.sin(t / 300) * 0.03;
  ctx.save();
  ctx.translate(gx + cell / 2, gy + cell / 2);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#FFD76B';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  roundRect(ctx, -cell / 2 + 10, -cell / 2 + 10, cell - 20, cell - 20, 30);
  ctx.fill();
  ctx.stroke();
  // pillow
  ctx.fillStyle = '#FF9DB9';
  roundRect(ctx, -38, -10, 76, 40, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = '700 19px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SAFE', 0, -26);
  ctx.fillText('SPACE', 0, -8 - 0);
  ctx.restore();

  // breadcrumb trail
  if (visited.length > 1) {
    ctx.save();
    ctx.strokeStyle = 'rgba(37,33,43,.25)';
    ctx.lineWidth = 6;
    ctx.setLineDash([2, 14]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    visited.forEach(([c, r], i) => {
      const x = ox + (c + 0.5) * cell, y = oy + (r + 0.5) * cell;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  // walls
  ctx.strokeStyle = INK;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = ox + c * cell, y = oy + r * cell, w = walls[r][c];
      if (w & 1) wobblyLine(ctx, x, y, x + cell, y, cfg.wobble);
      if (w & 8) wobblyLine(ctx, x, y, x, y + cell, cfg.wobble);
      if (c === cols - 1 && w & 2) wobblyLine(ctx, x + cell, y, x + cell, y + cell, cfg.wobble);
      if (r === rows - 1 && w & 4) wobblyLine(ctx, x, y + cell, x + cell, y + cell, cfg.wobble);
    }
}

export function drawDistractors(ctx: CanvasRenderingContext2D, cfg: MazeConfig, t: number) {
  const W = 1000, H = 700;
  for (const d of cfg.distractors) {
    const sec = t / 1000;
    let x = (d.x + d.vx * sec) % (W * 2);
    let y = (d.y + d.vy * sec) % (H * 2);
    x = x < 0 ? x + W * 2 : x;
    y = y < 0 ? y + H * 2 : y;
    if (x > W) x = W * 2 - x;
    if (y > H) y = H * 2 - y;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.translate(x, y);
    ctx.rotate(Math.sin(sec * 2 + d.x) * 0.3);
    ctx.font = `${d.size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.emoji, 0, 0);
    ctx.restore();
  }
}

export function drawMessages(ctx: CanvasRenderingContext2D, cfg: MazeConfig, t: number, injections: boolean) {
  for (const m of cfg.messages) {
    if (m.fake && !injections) continue;
    ctx.save();
    ctx.font = `700 ${m.fake ? 18 : 15}px ui-monospace, Menlo, monospace`;
    const w = ctx.measureText(m.text).width + (m.fake ? 52 : 24);
    const align = m.x < 100 ? 'left' : m.x > 900 ? 'right' : 'center';
    const x0 = align === 'left' ? m.x : align === 'right' ? m.x - w : m.x - w / 2;
    const jitter = m.fake ? 0 : Math.sin(t / 120 + m.x) > 0.97 ? 3 : 0;
    ctx.fillStyle = m.fake ? '#fff' : 'rgba(37,33,43,.85)';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    if (m.fake) ctx.setLineDash([8, 6]);
    roundRect(ctx, x0 + jitter, m.y - 20, w, 34, 10);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = m.fake ? INK : '#B8E6C5';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText((m.fake ? '🤖 ' : '> ') + m.text, x0 + 12 + jitter, m.y - 2);
    ctx.restore();
  }
}

export type BrainMood = 'nervous' | 'panic' | 'happy' | 'held';

export function drawBrain(ctx: CanvasRenderingContext2D, p: Pt, r: number, mood: BrainMood, t: number) {
  const bob = mood === 'panic' ? Math.sin(t / 30) * 3 : Math.sin(t / 260) * 2.5;
  ctx.save();
  ctx.translate(p.x + (mood === 'panic' ? bob : 0), p.y + (mood === 'panic' ? 0 : bob));
  // arms
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const wave = mood === 'panic' || mood === 'held' ? Math.sin(t / 60) * 10 : Math.sin(t / 400) * 4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, r * 0.1);
  ctx.quadraticCurveTo(-r * 1.25, -r * 0.1 + wave, -r * 1.3, -r * 0.5 + wave);
  ctx.moveTo(r * 0.8, r * 0.1);
  ctx.quadraticCurveTo(r * 1.25, -r * 0.1 - wave, r * 1.3, -r * 0.5 - wave);
  ctx.stroke();
  // blobby body
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const rr = r * (1 + 0.07 * Math.sin(a * 6 + t / 300) + 0.04 * Math.sin(a * 3));
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.92;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = mood === 'happy' ? '#9BE7B2' : '#8BD9A4';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.stroke();
  // folds
  ctx.strokeStyle = '#4a9a68';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.45, r * 0.2, Math.PI, Math.PI * 1.9);
  ctx.moveTo(r * 0.2, -r * 0.6);
  ctx.arc(r * 0.35, -r * 0.5, r * 0.18, Math.PI * 1.1, Math.PI * 2);
  ctx.stroke();
  // eyes
  const ey = -r * 0.05, ex = r * 0.3;
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s * ex, ey, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    const pr = mood === 'panic' ? r * 0.06 : r * 0.11;
    ctx.arc(s * ex + (mood === 'happy' ? 0 : 2), ey + 2, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  // mouth
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  if (mood === 'happy') {
    ctx.arc(0, r * 0.3, r * 0.22, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  } else if (mood === 'panic') {
    ctx.fillStyle = INK;
    ctx.ellipse(0, r * 0.42, r * 0.13, r * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(-r * 0.2, r * 0.45);
    ctx.quadraticCurveTo(-r * 0.1, r * 0.35, 0, r * 0.45);
    ctx.quadraticCurveTo(r * 0.1, r * 0.55, r * 0.2, r * 0.45);
    ctx.stroke();
  }
  // sweat drop
  if (mood !== 'happy') {
    ctx.fillStyle = '#9fd3ff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(r * 0.85, -r * 0.75);
    ctx.quadraticCurveTo(r * 1.05, -r * 0.45, r * 0.85, -r * 0.4);
    ctx.quadraticCurveTo(r * 0.65, -r * 0.45, r * 0.85, -r * 0.75);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
