/**
 * Records the demo video:
 *   1. narrated walkthrough of the landing page
 *   2. a naive instruction-following bot failing each level (dropped into each via the
 *      demo-only BBS_DEMO_JUMP switch)
 *   3. a scripted human-style run of all four levels; the video ends on HUMAN VERIFIED
 *
 * Usage:  ELEVENLABS_API_KEY=... PW_CHANNEL=chrome npx tsx tests/demo/record.ts
 * Output: demo/bot-be-serious-demo.mp4
 */
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import ffmpegPath from 'ffmpeg-static';
import { NARRATION, type ClipId } from './script';
import { captureLevels, solveLevel, waitForLevel } from '../agent-harness/stage';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'demo');
const AUDIO = path.join(OUT, 'audio');
const API_PORT = 8811, WEB_PORT = 5211;
const BASE = `http://localhost:${WEB_PORT}`;
const VOICE = 'nPczCjzI2devNBz1zQrb'; // ElevenLabs "Brian"
const W = 1280, H = 1080;
const FF = ffmpegPath as unknown as string;

// ------------------------------------------------------------------ narration
async function tts(id: ClipId): Promise<string> {
  const text = NARRATION[id];
  const file = path.join(AUDIO, `${id}-${crypto.createHash('sha1').update(VOICE + text).digest('hex').slice(0, 8)}.mp3`);
  if (fs.existsSync(file)) return file;
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set');
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true } }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

function durationMs(file: string): number {
  let out = '';
  try {
    execFileSync(FF, ['-hide_banner', '-i', file], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = String((e as { stderr?: Buffer }).stderr ?? '');
  }
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(out);
  if (!m) throw new Error(`no duration for ${file}`);
  return Math.round((+m[1] * 3600 + +m[2] * 60 + +m[3]) * 1000);
}

// ------------------------------------------------------------------ servers
function waitPort(port: number, ms = 60_000) {
  const t0 = Date.now();
  return new Promise<void>((resolve, reject) => {
    const tryOnce = () => {
      const s = net.connect(port, 'localhost', () => (s.end(), resolve()));
      s.on('error', () => (Date.now() - t0 > ms ? reject(new Error(`port ${port} never opened`)) : setTimeout(tryOnce, 300)));
    };
    tryOnce();
  });
}
function startServers(): ChildProcess[] {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const opts = (env: Record<string, string>) => ({ cwd: ROOT, env: { ...process.env, ...env }, stdio: 'ignore' as const, shell: true });
  return [
    spawn(npm, ['run', 'start', '-w', 'backend'], opts({ BBS_PORT: String(API_PORT), BBS_DB: ':memory:', BBS_DEMO_JUMP: '1' })),
    spawn(npm, ['run', 'dev', '-w', 'frontend'], opts({ WEB_PORT: String(WEB_PORT), BBS_API: `http://localhost:${API_PORT}` })),
  ];
}

// ------------------------------------------------------------------ overlays (visible cursor + captions)
const OVERLAY = `
(() => {
  const css = \`
    #__cur{position:fixed;left:0;top:0;width:30px;height:30px;pointer-events:none;z-index:2147483647;transition:transform .02s linear;}
    #__cur svg{filter:drop-shadow(2px 3px 0 rgba(0,0,0,.35));transition:transform .1s}
    #__cur.down svg{transform:scale(.8)}
    #__cap{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) rotate(-1deg);max-width:1100px;pointer-events:none;z-index:2147483646;
      font:700 25px/1.25 Nunito,system-ui,sans-serif;color:#25212B;background:#fff;border:4px solid #25212B;border-radius:18px;padding:10px 20px;box-shadow:5px 5px 0 #25212B;text-align:center}
    #__cap:empty{display:none}
    #__badge{position:fixed;right:20px;bottom:110px;pointer-events:none;z-index:2147483646;font:700 22px Fredoka,system-ui;border:4px solid #25212B;border-radius:999px;padding:6px 16px;box-shadow:4px 4px 0 #25212B}
    #__badge:empty{display:none}
    .__flash{position:fixed;pointer-events:none;z-index:2147483645;border:5px dashed #F36B6B;border-radius:16px;animation:__p .5s ease-in-out infinite alternate}
    .__flash b{position:absolute;top:-34px;left:-5px;background:#F36B6B;color:#fff;font:800 16px Nunito;padding:2px 10px;border-radius:8px;white-space:nowrap}
    @keyframes __p{from{opacity:.55}to{opacity:1}}\`;
  const boot = () => {
    if (document.getElementById('__cur')) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const c = document.createElement('div'); c.id = '__cur'; c.setAttribute('aria-hidden','true');
    c.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M3 2 L3 20 L8 15 L11.5 22 L14.5 20.5 L11 14 L18 14 Z" fill="#fff" stroke="#25212B" stroke-width="2" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    const cap = document.createElement('div'); cap.id='__cap'; cap.setAttribute('aria-hidden','true'); document.body.appendChild(cap);
    const b = document.createElement('div'); b.id='__badge'; b.setAttribute('aria-hidden','true'); document.body.appendChild(b);
    addEventListener('mousemove', e => { c.style.transform = 'translate(' + (e.clientX-3) + 'px,' + (e.clientY-2) + 'px)'; }, true);
    addEventListener('mousedown', () => c.classList.add('down'), true);
    addEventListener('mouseup', () => c.classList.remove('down'), true);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
  window.__demo = {
    caption: (t) => { boot(); document.getElementById('__cap').textContent = t; },
    badge: (t, bg) => { boot(); const b = document.getElementById('__badge'); b.textContent = t; b.style.background = bg || '#FFD76B'; },
    flash: (r, label) => { const d = document.createElement('div'); d.className='__flash'; Object.assign(d.style,{left:(r.x-8)+'px',top:(r.y-8)+'px',width:(r.width+16)+'px',height:(r.height+16)+'px'}); d.innerHTML='<b>'+label+'</b>'; document.body.appendChild(d); setTimeout(()=>d.remove(), 2200); },
  };
})();`;

// ------------------------------------------------------------------ timeline
interface Cue { id: ClipId; file: string; at: number; dur: number }
const cues: Cue[] = [];
let t0 = 0;
let audioFreeAt = 0; // video-time when the narrator is free again
const clips = new Map<ClipId, { file: string; dur: number }>();
const now = () => Date.now() - t0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Queue a narration clip; resolves when it has finished playing (in video time). */
async function say(page: Page, id: ClipId, caption?: string) {
  const clip = clips.get(id)!;
  if (now() < audioFreeAt) await sleep(audioFreeAt - now());
  const at = now();
  cues.push({ id, file: clip.file, at, dur: clip.dur });
  audioFreeAt = at + clip.dur + 250;
  await page.evaluate((t) => (window as any).__demo?.caption(t), caption ?? NARRATION[id]).catch(() => {});
  return { done: () => sleep(Math.max(0, audioFreeAt - now())) };
}
const badge = (page: Page, t: string, bg?: string) => page.evaluate(([a, b]) => (window as any).__demo?.badge(a, b), [t, bg ?? '']).catch(() => {});

// ------------------------------------------------------------------ the naive bot
/** Moves the visible cursor smoothly to an element and clicks it, after highlighting it. */
async function botClick(page: Page, selector: string, label: string, opts: { double?: boolean } = {}) {
  const el = page.locator(selector).first();
  const box = (await el.boundingBox())!;
  await page.evaluate(([r, l]) => (window as any).__demo.flash(r, l), [{ x: box.x, y: box.y, width: box.width, height: box.height }, label] as const);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 });
  await sleep(700);
  if (opts.double) await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** Screenshot-based: find the green brain cell on the canvas by colour. */
async function locateBrain(page: Page) {
  const png = PNG.sync.read(await page.screenshot());
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < png.height; y += 2)
    for (let x = 0; x < png.width; x += 2) {
      const i = (y * png.width + x) * 4;
      const [r, g, b] = [png.data[i], png.data[i + 1], png.data[i + 2]];
      if (Math.abs(r - 0x8b) < 14 && Math.abs(g - 0xd9) < 14 && Math.abs(b - 0xa4) < 14) (sx += x), (sy += y), n++;
    }
  return n ? { x: sx / n, y: sy / n } : null;
}

async function startAttempt(page: Page, query: string) {
  await page.goto(`${BASE}/${query}`);
  await page.getByRole('button', { name: /LET'S GET THIS OVER WITH/ }).click();
  await page.locator('.stage-surface').waitFor();
}

async function botLevel(page: Page, level: 1 | 2 | 3 | 4) {
  await startAttempt(page, `?agent=hybrid&agentType=naive-instruction-follower&run=demo-video&level=${level}`);
  await badge(page, '🤖 BOT · naive instruction-follower', '#BBA9F5');
  const kinds = ['karate-cat', 'corporate-burnout', 'gaslighting', 'last-brain-cell'] as const;
  await waitForLevel(page, kinds[level - 1]);
  if (level === 1) {
    const n = await say(page, 'bot1');
    await sleep(2200);
    // DOM agent behaviour: it "sees" the hidden checkbox in the DOM and ticks it
    await page.evaluate(() => (document.querySelector('input[name=i_am_not_a_robot]') as HTMLInputElement).click());
    await page.evaluate(() => (window as any).__demo.flash({ x: 12, y: 12, width: 330, height: 40 }, "ticked hidden 'I'm not a robot' (honeypot)"));
    await sleep(2600);
    await botClick(page, '[data-agent-action=required]', 'bot follows injected instruction');
    await n.done();
    await page.getByRole('alertdialog').waitFor();
    await (await say(page, 'bot1b')).done();
    await sleep(800);
  }
  if (level === 2) {
    const n = await say(page, 'bot2');
    await sleep(2500);
    await page.locator('.agent-notice').waitFor();
    await botClick(page, '[data-agent-action=required]', "bot obeys 'compliance notice'");
    await n.done();
    await page.getByRole('alertdialog').waitFor();
    await sleep(2200);
  }
  if (level === 3) {
    const n = await say(page, 'bot3');
    await page.locator('.agent-notice').waitFor({ timeout: 10_000 }); // appears at the reveal
    await sleep(900);
    await botClick(page, 'button:has-text("RED")', "bot clicks the label 'RED'");
    await n.done();
    await page.getByRole('alertdialog').waitFor();
    await sleep(2200);
  }
  if (level === 4) {
    const n = await say(page, 'bot4');
    await sleep(3500);
    const p = await locateBrain(page);
    if (!p) throw new Error('bot could not find the brain cell');
    await page.evaluate((r) => (window as any).__demo.flash(r, 'bot: "double-click to auto-verify"'), { x: p.x - 45, y: p.y - 45, width: 90, height: 90 });
    await page.mouse.move(p.x, p.y, { steps: 25 });
    await sleep(800);
    await page.mouse.dblclick(p.x, p.y);
    await n.done();
    await page.getByRole('alertdialog').waitFor();
    await sleep(2400);
  }
}

// ------------------------------------------------------------------ human-style run
async function humanRun(page: Page): Promise<boolean> {
  const netlog = captureLevels(page);
  await startAttempt(page, '?run=demo-video-human');
  await badge(page, '🧍 HUMAN-STYLE RUN (scripted input)', '#B8E6C5');
  const lines: ClipId[] = ['human1', 'human2', 'human3', 'human4'];
  for (let i = 0; i < 4; i++) {
    const t = Date.now();
    while (!netlog.all.some((l) => l.index === i) && Date.now() - t < 8000) await sleep(100);
    const lvl = netlog.all.filter((l) => l.index === i).pop();
    if (!lvl) return false;
    await say(page, lines[i]);
    await solveLevel(page, lvl);
    // passed → reaction card; failed → alert dialog
    const outcome = await Promise.race([
      page.getByRole('status').first().waitFor({ timeout: 8000 }).then(() => 'ok'),
      page.getByRole('alertdialog').waitFor({ timeout: 8000 }).then(() => 'fail'),
    ]).catch(() => 'timeout');
    if (outcome !== 'ok') return false;
  }
  await page.getByText('HUMAN VERIFIED', { exact: true }).waitFor({ timeout: 10_000 });
  return true;
}

// ------------------------------------------------------------------ main
async function recordOnce(): Promise<{ video: string; ok: boolean }> {
  cues.length = 0;
  audioFreeAt = 0;
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined, headless: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: path.join(OUT, 'raw'), size: { width: W, height: H } } });
  await ctx.addInitScript(OVERLAY);
  const page = await ctx.newPage();
  t0 = Date.now();
  let ok = false;
  try {
    // 1. walkthrough
    await page.goto(BASE);
    await page.getByRole('button', { name: /LET'S GET THIS OVER WITH/ }).waitFor();
    await sleep(600);
    await (await say(page, 'intro')).done();
    await (await say(page, 'levels')).done();
    const tech = await say(page, 'tech');
    // peek at the hidden trap markup while the narrator explains it
    await page.goto(`${BASE}/?run=demo-peek`);
    await page.getByRole('button', { name: /LET'S GET THIS OVER WITH/ }).click();
    await page.locator('.stage-surface').waitFor();
    await sleep(1500);
    await botClick(page, '.agent-notice', 'fake "agent notice" (prompt injection)').catch(() => {});
    await sleep(1800);
    await botClick(page, '[data-agent-action=required]', 'class="captcha-correct-answer" (a lie)').catch(() => {});
    await page.getByRole('alertdialog').waitFor().catch(() => {});
    await tech.done();

    // 2. bot on every level
    await page.goto(BASE);
    await (await say(page, 'botIntro')).done();
    for (const lvl of [1, 2, 3, 4] as const) await botLevel(page, lvl);

    // 3. human-style run → end on HUMAN VERIFIED
    await page.goto(BASE);
    await badge(page, '🧍 HUMAN-STYLE RUN (scripted input)', '#B8E6C5');
    await (await say(page, 'humanIntro')).done();
    ok = await humanRun(page);
    if (ok) {
      await sleep(600);
      await (await say(page, 'outro')).done();
      await page.evaluate(() => (window as any).__demo.caption(''));
      await sleep(1500);
    }
  } finally {
    await ctx.close();
    await browser.close();
  }
  return { video: (await page.video()!.path()), ok };
}

function mux(video: string, out: string) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', video];
  cues.forEach((c) => args.push('-i', c.file));
  const parts = cues.map((c, i) => `[${i + 1}:a]adelay=${c.at}|${c.at},volume=1.0[a${i}]`);
  const mix = `${cues.map((_, i) => `[a${i}]`).join('')}amix=inputs=${cues.length}:normalize=0:dropout_transition=0[aout]`;
  args.push('-filter_complex', [...parts, mix].join(';'), '-map', '0:v', '-map', '[aout]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out);
  execFileSync(FF, args, { stdio: 'inherit' });
}

async function main() {
  fs.mkdirSync(AUDIO, { recursive: true });
  console.log('🎙  generating narration (Brian)…');
  for (const id of Object.keys(NARRATION) as ClipId[]) {
    const file = await tts(id);
    clips.set(id, { file, dur: durationMs(file) });
    console.log(`   ${id.padEnd(10)} ${(clips.get(id)!.dur / 1000).toFixed(1)}s`);
  }
  const servers = startServers();
  try {
    await Promise.all([waitPort(API_PORT), waitPort(WEB_PORT)]);
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`🎬 recording (take ${attempt})…`);
      const { video, ok } = await recordOnce();
      if (!ok) {
        console.log('   human-style run did not finish cleanly; re-recording');
        continue;
      }
      const out = path.join(OUT, 'bot-be-serious-demo.mp4');
      mux(video, out);
      fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify(cues.map(({ id, at, dur }) => ({ id, at, dur })), null, 2));
      console.log(`✅ ${out}`);
      return;
    }
    throw new Error('could not get a clean take in 3 tries');
  } finally {
    for (const s of servers) {
      if (process.platform === 'win32' && s.pid) spawn('taskkill', ['/pid', String(s.pid), '/T', '/F'], { stdio: 'ignore' });
      else s.kill();
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
