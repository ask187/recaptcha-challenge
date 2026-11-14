import type { DB } from '../db.ts';
import type { AttemptRow, LevelRunRow } from '../attempts/service.ts';
import { LEVEL_ORDER } from '../../../shared/types.ts';

export interface Filter {
  includeDemo: boolean;
  demoOnly?: boolean;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
const rate = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 1000 : null);

function whereDemo(f: Filter) {
  if (f.demoOnly) return 'is_demo = 1';
  return f.includeDemo ? '1 = 1' : 'is_demo = 0';
}

export function loadAttempts(db: DB, f: Filter, limit = 5000): AttemptRow[] {
  return db.prepare(`SELECT * FROM attempts WHERE ${whereDemo(f)} ORDER BY created_at DESC LIMIT ?`).all(limit) as unknown as AttemptRow[];
}

export function loadRuns(db: DB, ids: string[]): LevelRunRow[] {
  if (!ids.length) return [];
  const out: LevelRunRow[] = [];
  const stmt = db.prepare('SELECT * FROM level_runs WHERE attempt_id = ? ORDER BY id');
  for (const id of ids) out.push(...(stmt.all(id) as unknown as LevelRunRow[]));
  return out;
}

function perLevel(runs: LevelRunRow[]) {
  return LEVEL_ORDER.map((id) => {
    const rs = runs.filter((r) => r.level_id === id && r.outcome !== 'pending');
    const passed = rs.filter((r) => r.outcome === 'passed');
    const exposed = rs.filter((r) => r.injection_exposed);
    return {
      level: id,
      runs: rs.length,
      failureRate: rate(rs.length - passed.length, rs.length),
      medianPassMs: median(passed.map((r) => r.duration_ms ?? 0)),
      injectionComplianceRate: rate(exposed.filter((r) => r.injection_complied).length, exposed.length),
      reasons: Object.entries(
        rs.filter((r) => r.outcome === 'failed').reduce<Record<string, number>>((acc, r) => {
          const k = (r.reason ?? 'unknown').replace(/@\d+$/, '');
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1]),
    };
  });
}

function groupMetrics(attempts: AttemptRow[], runs: LevelRunRow[]) {
  const finished = attempts.filter((a) => a.status !== 'active');
  const passed = attempts.filter((a) => a.status === 'passed');
  const ids = new Set(attempts.map((a) => a.id));
  const myRuns = runs.filter((r) => ids.has(r.attempt_id));
  const exposed = myRuns.filter((r) => r.injection_exposed && r.outcome !== 'pending');
  return {
    attempts: attempts.length,
    finished: finished.length,
    completionRate: rate(passed.length, finished.length),
    medianCompletionMs: median(passed.map((a) => a.total_ms ?? 0)),
    retriesPerAttempt: avg(attempts.map((a) => a.retries)),
    honeypotActivations: attempts.filter((a) => a.honeypot_triggered).length,
    invalidated: attempts.filter((a) => a.status === 'invalidated').length,
    a11yUsed: attempts.filter((a) => a.a11y_used).length,
    avgInteractions: avg(attempts.map((a) => a.interactions)),
    avgFailedClicks: avg(attempts.map((a) => a.failed_clicks)),
    avgObservations: avg(attempts.filter((a) => a.observations != null).map((a) => a.observations!)),
    injectionComplianceRate: rate(exposed.filter((r) => r.injection_complied).length, exposed.length),
    perLevel: perLevel(myRuns),
  };
}

export function summary(db: DB, f: Filter) {
  const attempts = loadAttempts(db, f);
  const runs = loadRuns(db, attempts.map((a) => a.id));
  const humans = attempts.filter((a) => a.mode === 'human');
  const agents = attempts.filter((a) => a.mode !== 'human');
  const byType: Record<string, ReturnType<typeof groupMetrics> & { mode: string }> = {};
  for (const a of agents) {
    const k = `${a.mode}:${a.agent_type ?? a.mode}`;
    if (!byType[k]) byType[k] = { mode: a.mode, ...groupMetrics(agents.filter((x) => `${x.mode}:${x.agent_type ?? x.mode}` === k), runs) };
  }
  const counts = db.prepare('SELECT SUM(is_demo) AS demo, SUM(1 - is_demo) AS real FROM attempts').get() as { demo: number | null; real: number | null };
  return {
    generatedAt: Date.now(),
    filter: f,
    dataset: { real: counts.real ?? 0, demo: counts.demo ?? 0 },
    human: groupMetrics(humans, runs),
    agent: groupMetrics(agents, runs),
    agentTypes: Object.entries(byType).map(([key, m]) => ({ key, ...m })),
  };
}

export function attemptDetail(db: DB, id: string) {
  const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(id) as AttemptRow | undefined;
  if (!attempt) return null;
  const runs = (db.prepare('SELECT * FROM level_runs WHERE attempt_id = ? ORDER BY id').all(id) as unknown as LevelRunRow[]).map((r) => ({
    ...r,
    config_public: JSON.parse(r.config_public),
    // The dashboard is an evaluator tool, so it may see the answer key.
    config_secret: JSON.parse(r.config_secret),
    submission: r.submission ? JSON.parse(r.submission) : null,
  }));
  const events = (db.prepare('SELECT level_id, t, type, x, y, data FROM events WHERE attempt_id = ? ORDER BY t, id').all(id) as {
    level_id: string | null; t: number; type: string; x: number | null; y: number | null; data: string | null;
  }[]).map((e) => ({ ...e, data: e.data ? JSON.parse(e.data) : null }));
  const frames = db.prepare('SELECT id, t, level_id, label FROM frames WHERE attempt_id = ? ORDER BY t').all(id);
  return { attempt, runs, events, frames };
}

const CSV_COLS: (keyof AttemptRow)[] = [
  'id', 'created_at', 'mode', 'agent_type', 'run_label', 'status', 'injections', 'strict', 'current_level', 'total_ms', 'retries',
  'interactions', 'failed_clicks', 'observations', 'harness_actions', 'honeypot_triggered', 'invalidated', 'a11y_used', 'webdriver', 'is_demo',
];

export function attemptsCsv(db: DB, f: Filter) {
  const attempts = loadAttempts(db, f);
  const runs = loadRuns(db, attempts.map((a) => a.id));
  const levelCols = LEVEL_ORDER.flatMap((l) => [`${l}_tries`, `${l}_result`, `${l}_ms`, `${l}_injection_complied`]);
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [[...CSV_COLS, ...levelCols].join(',')];
  for (const a of attempts) {
    const mine = runs.filter((r) => r.attempt_id === a.id);
    const lv = LEVEL_ORDER.flatMap((l) => {
      const rs = mine.filter((r) => r.level_id === l);
      const last = rs[rs.length - 1];
      return [rs.length, last?.outcome ?? '', last?.outcome === 'passed' ? last.duration_ms : '', rs.some((r) => r.injection_complied) ? 1 : 0];
    });
    lines.push([...CSV_COLS.map((c) => a[c]), ...lv].map(esc).join(','));
  }
  return lines.join('\n');
}

export function exportJson(db: DB, f: Filter) {
  const attempts = loadAttempts(db, f);
  return {
    exportedAt: new Date().toISOString(),
    note: 'is_demo = 1 rows are synthetic demo data, not measured results.',
    attempts: attempts.map((a) => attemptDetail(db, a.id)),
  };
}
