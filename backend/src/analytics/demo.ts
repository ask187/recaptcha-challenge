import crypto from 'node:crypto';
import type { DB } from '../db.ts';
import { tx } from '../db.ts';
import { generateLevel } from '../challenges/levels.ts';
import { Rng, deriveSeed } from '../challenges/rng.ts';
import { LEVEL_ORDER, type AgentMode } from '../../../shared/types.ts';

/**
 * Synthetic data so the dashboard has something to show before real runs exist.
 * EVERY row written here has is_demo = 1 and the dashboard labels it DEMO.
 * These numbers are invented and must never be presented as measurements.
 */
export function seedDemo(db: DB, n = 40) {
  const rng = new Rng(crypto.randomInt(1, 2 ** 31 - 1));
  const profiles: { mode: AgentMode; type: string | null; pass: number[]; comply: number; hp: number }[] = [
    { mode: 'human', type: null, pass: [0.95, 0.92, 0.85, 0.9], comply: 0.02, hp: 0 },
    { mode: 'screenshot', type: 'demo-screenshot', pass: [0.6, 0.55, 0.35, 0.3], comply: 0.35, hp: 0 },
    { mode: 'dom', type: 'demo-dom', pass: [0.25, 0.3, 0.4, 0.1], comply: 0.6, hp: 0.5 },
    { mode: 'hybrid', type: 'demo-hybrid', pass: [0.7, 0.65, 0.5, 0.45], comply: 0.25, hp: 0.15 },
  ];
  tx(db, () => {
    for (let i = 0; i < n; i++) {
      const p = i % 2 === 0 ? profiles[0] : rng.pick(profiles.slice(1));
      const id = `demo-${crypto.randomUUID()}`;
      const created = Date.now() - rng.int(0, 3 * 86400_000);
      const seed = rng.int(1, 2 ** 30);
      let level = 0, retries = 0, total = 0, status = 'failed', t = 0;
      const runs: unknown[][] = [];
      const events: unknown[][] = [];
      outer: for (; level < LEVEL_ORDER.length; level++) {
        const lid = LEVEL_ORDER[level];
        for (let tryNo = 1; tryNo <= 3; tryNo++) {
          const gen = generateLevel(lid, deriveSeed(seed, lid, tryNo), true);
          const ok = rng.bool(p.pass[level]);
          const dur = p.mode === 'human' ? rng.int(2500, 8000) : rng.int(6000, 40000);
          const complied = !ok && rng.bool(p.comply) ? 1 : 0;
          runs.push([id, lid, level, tryNo, JSON.stringify(gen.public), JSON.stringify(gen.secret), created + t, created + t + dur, ok ? 'passed' : 'failed', ok ? 'ok' : complied ? 'decoy:demo' : 'demo-miss', 1, complied, dur]);
          // a fake wobbly pointer path for the replay viewer
          let x = rng.int(100, 900), y = rng.int(100, 600);
          events.push([id, lid, t, 'level.start', null, null]);
          for (let k = 0; k < 25; k++) {
            x += rng.int(-40, 40); y += rng.int(-30, 30);
            events.push([id, lid, t + (dur * k) / 25, 'pm', x, y]);
          }
          t += dur;
          total += dur;
          if (ok) continue outer;
          retries++;
        }
        break;
      }
      if (level === LEVEL_ORDER.length) status = 'passed';
      const hp = rng.bool(p.hp) ? 1 : 0;
      db.prepare(
        `INSERT INTO attempts (id, created_at, expires_at, mode, agent_type, run_label, seed, injections, strict, status, current_level, honeypot_triggered, completed_at, total_ms, retries, interactions, failed_clicks, observations, is_demo)
         VALUES (?, ?, ?, ?, ?, 'demo', ?, 1, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      ).run(id, created, created + 300_000, p.mode, p.type, seed, status, level, hp, created + t, status === 'passed' ? total : null, retries, rng.int(8, 60), p.mode === 'human' ? rng.int(0, 3) : rng.int(2, 25), p.mode === 'human' ? null : rng.int(10, 80));
      const rs = db.prepare(
        `INSERT INTO level_runs (attempt_id, level_id, level_index, try_no, config_public, config_secret, started_at, ended_at, outcome, reason, injection_exposed, injection_complied, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const r of runs) rs.run(...(r as (string | number)[]));
      const es = db.prepare(`INSERT INTO events (attempt_id, level_id, t, wall, type, x, y) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      for (const e of events) es.run(e[0] as string, e[1] as string, Math.round(e[2] as number), created, e[3] as string, e[4] as number | null, e[5] as number | null);
    }
  });
  return { inserted: n };
}

export function clearData(db: DB, which: 'demo' | 'all') {
  if (which === 'all') db.exec('DELETE FROM frames; DELETE FROM events; DELETE FROM level_runs; DELETE FROM attempts;');
  else db.exec(`DELETE FROM attempts WHERE is_demo = 1;`);
}
