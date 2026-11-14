import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { openDb } from './db.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const db = openDb(process.env.BBS_DB ?? path.resolve(here, '..', 'data', 'bbs.sqlite'));
// BBS_PORT (not PORT) so tools that set PORT for the web dev server don't collide with the API.
const port = Number(process.env.BBS_PORT ?? 8787);

const app = createApp({
  db,
  evalKey: process.env.EVAL_KEY || undefined,
  service: { maxTriesPerLevel: Number(process.env.BBS_MAX_TRIES ?? 3) },
  staticDir: path.resolve(here, '..', '..', 'frontend', 'dist'),
});

app.listen(port, () => {
  console.log(`🧠 Bot, Be Serious! API on http://localhost:${port}`);
});
