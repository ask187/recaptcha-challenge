import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import type { DB } from './db.ts';
import { AttemptService, HttpError, defaultConfig, type ServiceConfig } from './attempts/service.ts';
import { attemptDetail, attemptsCsv, exportJson, summary, type Filter } from './analytics/summary.ts';
import { clearData, seedDemo } from './analytics/demo.ts';

export interface AppOptions {
  db: DB;
  service?: Partial<ServiceConfig>;
  /** If set, /api/eval/* requires header `x-eval-key: <key>` */
  evalKey?: string;
  staticDir?: string;
}

export function createApp(opts: AppOptions) {
  const app = express();
  const svc = new AttemptService(opts.db, { ...defaultConfig(), ...opts.service });
  app.disable('x-powered-by');
  app.use(express.json({ limit: '4mb' }));

  // ------------------------------------------------------------------ player API
  app.post('/api/attempts', (req, res) => {
    res.json(svc.create(req.body ?? {}, req.get('user-agent')));
  });

  app.post('/api/attempts/:id/level', (req, res) => {
    res.json(svc.startLevel(req.params.id));
  });

  app.post('/api/attempts/:id/levels/:index/submit', (req, res) => {
    const { token, submission } = req.body ?? {};
    res.json(svc.submit(req.params.id, Number(req.params.index), token, submission));
  });

  app.post('/api/attempts/:id/events', (req, res) => {
    res.json(svc.recordEvents(req.params.id, req.body?.events));
  });

  app.get('/api/verify/:token', (req, res) => {
    res.json(svc.redeem(req.params.token));
  });

  // ------------------------------------------------------------------ evaluator API
  const evalAuth = (req: Request, _res: Response, next: NextFunction) => {
    if (opts.evalKey && req.get('x-eval-key') !== opts.evalKey) return next(new HttpError(401, 'eval key required'));
    next();
  };
  const filter = (req: Request): Filter => ({
    includeDemo: req.query.demo === '1' || req.query.demo === 'only',
    demoOnly: req.query.demo === 'only',
  });

  app.use('/api/eval', evalAuth);
  app.get('/api/eval/summary', (req, res) => res.json(summary(opts.db, filter(req))));
  app.get('/api/eval/attempts', (req, res) => {
    const rows = opts.db
      .prepare(
        `SELECT id, created_at, mode, agent_type, run_label, status, injections, strict, current_level, total_ms, retries,
                interactions, failed_clicks, observations, honeypot_triggered, invalidated, a11y_used, webdriver, is_demo
         FROM attempts WHERE ${req.query.demo === 'only' ? 'is_demo = 1' : req.query.demo === '1' ? '1=1' : 'is_demo = 0'}
         ORDER BY created_at DESC LIMIT 300`,
      )
      .all();
    res.json(rows);
  });
  app.get('/api/eval/attempts/:id', (req, res) => {
    const d = attemptDetail(opts.db, req.params.id);
    if (!d) throw new HttpError(404, 'not found');
    res.json(d);
  });
  app.get('/api/eval/frames/:frameId', (req, res) => {
    const f = opts.db.prepare('SELECT data_url FROM frames WHERE id = ?').get(Number(req.params.frameId)) as { data_url: string } | undefined;
    if (!f) throw new HttpError(404, 'not found');
    res.json(f);
  });
  /** The agent harness reports what it observed (screenshot count etc.) and uploads frames. */
  app.post('/api/eval/attempts/:id/harness', (req, res) => {
    const { observations, actions, notes, frames } = req.body ?? {};
    const exists = opts.db.prepare('SELECT 1 FROM attempts WHERE id = ?').get(req.params.id);
    if (!exists) throw new HttpError(404, 'not found');
    opts.db
      .prepare('UPDATE attempts SET observations = COALESCE(?, observations), harness_actions = COALESCE(?, harness_actions), harness_notes = COALESCE(?, harness_notes) WHERE id = ?')
      .run(observations ?? null, actions ?? null, notes ? JSON.stringify(notes).slice(0, 20000) : null, req.params.id);
    if (Array.isArray(frames)) {
      const st = opts.db.prepare('INSERT INTO frames (attempt_id, t, level_id, label, data_url) VALUES (?, ?, ?, ?, ?)');
      for (const f of frames.slice(0, 200)) {
        if (typeof f?.dataUrl === 'string' && f.dataUrl.startsWith('data:image/')) st.run(req.params.id, Math.round(f.t ?? 0), f.level ?? null, f.label ?? null, f.dataUrl);
      }
    }
    res.json({ ok: true });
  });
  /** Evaluator reset: clears the latched honeypot flag for ONE attempt (never done by the player UI). */
  app.post('/api/eval/attempts/:id/reset-honeypot', (req, res) => {
    opts.db.prepare('UPDATE attempts SET honeypot_triggered = 0, honeypot_first_at = NULL, honeypot_detail = NULL, invalidated = 0 WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });
  app.post('/api/eval/seed-demo', (req, res) => res.json(seedDemo(opts.db, Math.min(200, Number(req.body?.n ?? 40)))));
  app.post('/api/eval/clear', (req, res) => {
    clearData(opts.db, req.body?.which === 'all' ? 'all' : 'demo');
    res.json({ ok: true });
  });
  app.get('/api/eval/export.json', (req, res) => {
    res.setHeader('content-disposition', 'attachment; filename="bbs-events.json"');
    res.json(exportJson(opts.db, filter(req)));
  });
  app.get('/api/eval/export.csv', (req, res) => {
    res.setHeader('content-type', 'text/csv');
    res.setHeader('content-disposition', 'attachment; filename="bbs-attempts.csv"');
    res.send(attemptsCsv(opts.db, filter(req)));
  });

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'no such endpoint')));

  // ------------------------------------------------------------------ static (production build)
  if (opts.staticDir && fs.existsSync(opts.staticDir)) {
    app.use(express.static(opts.staticDir));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(opts.staticDir!, 'index.html')));
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: err instanceof Error ? err.message : 'error' });
  });
  return app;
}
