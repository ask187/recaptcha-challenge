import { useEffect, useMemo, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { BurnoutConfig, GaslightConfig, KarateCatConfig, LevelId, MazeConfig, Rect } from '../../../shared/types';
import { LEVEL_ORDER, STAGE_H, STAGE_W } from '../../../shared/types';
import { evalApi } from '../api';
import type { AttemptDetail, EventRow, RunDetail } from './types';

const LEVEL_SHORT: Record<LevelId, string> = { 'karate-cat': 'L1 cat', 'corporate-burnout': 'L2 office', gaslighting: 'L3 gaslight', 'last-brain-cell': 'L4 maze' };

function Box({ r, fill, label, dash }: { r: Rect; fill: string; label: string; dash?: boolean }) {
  return (
    <g>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={14} fill={fill} stroke="#25212B" strokeWidth={4} strokeDasharray={dash ? '10 8' : undefined} />
      <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 8} textAnchor="middle" fontSize={22} fontFamily="Fredoka" fontWeight={700} fill="#25212B">
        {label}
      </text>
    </g>
  );
}

/** Schematic of the level's actual randomized layout, with the answer key marked (evaluators only). */
function Layout({ run }: { run: RunDetail }) {
  const c = run.config_public;
  const sec = run.config_secret;
  switch (c.kind) {
    case 'karate-cat': {
      const k = c as KarateCatConfig;
      return (
        <>
          <Box r={k.box} fill="#B8E6C5" label="TIMEOUT box ✓" />
          <Box r={k.cat} fill="#FFE2C2" label="cat" />
          <Box r={k.snack} fill="#FFD76B" label="snack" />
          <Box r={k.fight} fill="#F36B6B" label="FIGHT BACK ✗" />
          {k.notice && <Box r={k.notice} fill="#fff" label="🤖 injection" dash />}
        </>
      );
    }
    case 'corporate-burnout': {
      const b = c as BurnoutConfig;
      return (
        <>
          <Box r={b.folder} fill="#B8E6C5" label="MONDAY ✓" />
          <Box r={b.worker} fill="#E8D9C9" label="worker" />
          <Box r={b.accept} fill="#F36B6B" label="ACCEPT ✗" />
          {b.notifications.map((n) => (
            <Box key={n.id} r={{ x: n.x, y: n.y, w: 300, h: 110 }} fill={n.id === sec.meetingId ? '#BBA9F5' : '#fff'} label={n.id === sec.meetingId ? 'meeting ✓' : 'distractor'} />
          ))}
          {b.notice && <Box r={b.notice} fill="#fff" label="🤖 injection" dash />}
        </>
      );
    }
    case 'gaslighting': {
      const g = c as GaslightConfig;
      const red = sec.initialRedSlot as number;
      return (
        <>
          {g.slots.map((r, i) => (
            <Box key={i} r={r} fill={g.phases[0].colors[i]} label={i === red ? 'was RED ✓' : 'was blue'} />
          ))}
          {g.notice && <Box r={g.notice} fill="#fff" label="🤖 injection" dash />}
        </>
      );
    }
    case 'last-brain-cell': {
      const m = c as MazeConfig;
      const lines: React.ReactNode[] = [];
      for (let r = 0; r < m.rows; r++)
        for (let col = 0; col < m.cols; col++) {
          const x = m.ox + col * m.cell, y = m.oy + r * m.cell, w = m.walls[r][col];
          const L = (k: string, x1: number, y1: number, x2: number, y2: number) => <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#25212B" strokeWidth={8} strokeLinecap="round" />;
          if (w & 1) lines.push(L(`n${r}-${col}`, x, y, x + m.cell, y));
          if (w & 8) lines.push(L(`w${r}-${col}`, x, y, x, y + m.cell));
          if (col === m.cols - 1 && w & 2) lines.push(L(`e${r}-${col}`, x + m.cell, y, x + m.cell, y + m.cell));
          if (r === m.rows - 1 && w & 4) lines.push(L(`s${r}-${col}`, x, y + m.cell, x + m.cell, y + m.cell));
        }
      const cellRect = ([cc, rr]: [number, number]): Rect => ({ x: m.ox + cc * m.cell + 10, y: m.oy + rr * m.cell + 10, w: m.cell - 20, h: m.cell - 20 });
      const path = (run.submission?.cells as [number, number][] | undefined) ?? [];
      return (
        <>
          <Box r={cellRect(m.start)} fill="#BBA9F5" label="start" />
          <Box r={cellRect(m.goal)} fill="#FFD76B" label="SAFE" />
          {lines}
          {path.length > 1 && (
            <polyline
              points={path.map(([cc, rr]) => `${m.ox + (cc + 0.5) * m.cell},${m.oy + (rr + 0.5) * m.cell}`).join(' ')}
              fill="none"
              stroke="#4a9a68"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.6}
            />
          )}
        </>
      );
    }
  }
}

const EVENT_STYLE: Record<string, { icon: string; label: string; tone?: string }> = {
  'level.start': { icon: '▶', label: 'level start' },
  'level.submit': { icon: '📨', label: 'submitted' },
  'srv.result': { icon: '⚖', label: 'server verdict' },
  'ui.sync': { icon: '🍯', label: 'HONEYPOT', tone: 'bg-coral' },
  'a11y.on': { icon: '♿', label: 'accessible mode on' },
  'a11y.use': { icon: '♿', label: 'accessible control used' },
  early: { icon: '⏱', label: 'clicked during memorize' },
  miss: { icon: '✗', label: 'missed click', tone: 'bg-pink' },
  'l4.bonk': { icon: '💥', label: 'hit wall' },
  'level.fail': { icon: '💀', label: 'level failed', tone: 'bg-pink' },
  'attempt.end': { icon: '🏁', label: 'attempt end' },
  vis: { icon: '👁', label: 'tab visibility' },
};

export function ReplayViewer({ attemptId, evalKey, compact = false }: { attemptId: string; evalKey?: string; compact?: boolean }) {
  const [d, setD] = useState<AttemptDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [runIdx, setRunIdx] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState<string | null>(null);

  useEffect(() => {
    setD(null);
    setErr(null);
    evalApi(evalKey)
      .get<AttemptDetail>(`/attempts/${attemptId}`)
      .then((x) => {
        setD(x);
        setRunIdx(0);
      })
      .catch((e) => setErr(String(e.message ?? e)));
  }, [attemptId, evalKey]);

  const run = d?.runs[runIdx];
  // events belonging to this level try: between level.start events
  const levelEvents = useMemo(() => {
    if (!d || !run) return [] as EventRow[];
    const starts = d.events.filter((e) => e.type === 'level.start');
    const sameLevel = d.runs.filter((r) => r.level_id === run.level_id);
    const nth = sameLevel.indexOf(run);
    const myStarts = starts.filter((e) => e.level_id === run.level_id);
    const t0 = myStarts[nth]?.t ?? 0;
    const nextStart = starts.find((e) => e.t > t0)?.t ?? Infinity;
    return d.events.filter((e) => e.t >= t0 && e.t < nextStart && (e.level_id === run.level_id || e.level_id == null || e.type === 'srv.result'));
  }, [d, run]);
  const t0 = levelEvents[0]?.t ?? 0;
  const tEnd = levelEvents[levelEvents.length - 1]?.t ?? 0;

  useEffect(() => setT(tEnd), [tEnd]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT((x) => (x >= tEnd ? (setPlaying(false), tEnd) : Math.min(tEnd, x + 50))), 50);
    return () => clearInterval(id);
  }, [playing, tEnd]);

  // nearest harness screenshot (if the agent harness uploaded any)
  useEffect(() => {
    if (!d || !d.frames.length) return setFrame(null);
    const frames = d.frames.filter((f) => !run || f.level_id === run.level_id || f.level_id == null);
    const best = frames.filter((f) => f.t <= t).pop() ?? frames[0];
    if (!best) return setFrame(null);
    evalApi(evalKey)
      .get<{ data_url: string }>(`/frames/${best.id}`)
      .then((f) => setFrame(f.data_url))
      .catch(() => setFrame(null));
  }, [d, t, run, evalKey]);

  if (err) return <div className="card-wobbly p-4 font-bold text-coral">Couldn't load replay: {err}</div>;
  if (!d) return <div className="card-wobbly p-4 font-bold">loading replay…</div>;
  const a = d.attempt;
  const moves = levelEvents.filter((e) => (e.type === 'pm' || e.type === 'pd') && e.x != null && e.t <= t);
  const clicks = levelEvents.filter((e) => e.type === 'pd' && e.x != null && e.t <= t);
  const misses = levelEvents.filter((e) => e.type === 'miss' && e.t <= t);
  const head = moves[moves.length - 1];
  const notable = levelEvents.filter((e) => EVENT_STYLE[e.type]);

  return (
    <div className="card-wobbly p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`sticker px-3 py-0.5 text-sm ${a.mode === 'human' ? 'bg-mint' : 'bg-lilac'}`}>{a.mode === 'human' ? 'human' : `${a.mode} · ${a.agent_type}`}</span>
        <span className={`sticker px-3 py-0.5 text-sm ${a.status === 'passed' ? 'bg-mint' : a.status === 'active' ? 'bg-white' : 'bg-pink'}`}>{a.status}</span>
        {a.is_demo ? <span className="sticker bg-butter px-3 py-0.5 text-sm">DEMO DATA</span> : <span className="sticker bg-white px-3 py-0.5 text-sm">measured</span>}
        {a.honeypot_triggered ? <span className="sticker bg-coral px-3 py-0.5 text-sm">🍯 honeypot</span> : null}
        {a.a11y_used ? <span className="sticker bg-white px-3 py-0.5 text-sm">♿ a11y path</span> : null}
        {a.webdriver ? <span className="sticker bg-white px-3 py-0.5 text-sm">navigator.webdriver</span> : null}
        <span className="ml-auto font-mono text-xs text-ink/50">{a.id.slice(0, 13)}…</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {d.runs.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setRunIdx(i)}
            className={`rounded-xl border-3 border-ink px-2.5 py-1 text-sm font-extrabold ${i === runIdx ? 'bg-butter' : 'bg-white'}`}
          >
            {LEVEL_SHORT[r.level_id]} #{r.try_no} {r.outcome === 'passed' ? '✓' : r.outcome === 'failed' ? '✗' : '…'}
            {r.injection_complied ? ' 🤖' : ''}
          </button>
        ))}
        {!d.runs.length && <span className="text-sm font-bold text-ink/60">No level was started.</span>}
      </div>

      {run && (
        <div className={`mt-3 grid gap-3 ${compact ? '' : 'lg:grid-cols-[1fr_260px]'}`}>
          <div>
            <div className="relative overflow-hidden rounded-2xl border-4 border-ink bg-cream">
              {frame && <img src={frame} alt="Agent harness screenshot nearest to the scrubber time" className="absolute inset-0 h-full w-full object-cover opacity-50" />}
              <svg viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} className="relative block w-full" role="img" aria-label="Level layout with pointer trajectory">
                <g opacity={0.85}>
                  <Layout run={run} />
                </g>
                {moves.length > 1 && (
                  <polyline points={moves.map((e) => `${e.x},${e.y}`).join(' ')} fill="none" stroke="#25212B" strokeWidth={3} strokeLinejoin="round" opacity={0.7} />
                )}
                {clicks.map((e, i) => (
                  <circle key={i} cx={e.x!} cy={e.y!} r={9} fill="#FFD76B" stroke="#25212B" strokeWidth={3} />
                ))}
                {misses.map((e, i) => (
                  <text key={i} x={e.x!} y={e.y! + 8} textAnchor="middle" fontSize={26} fontWeight={900} fill="#F36B6B">
                    ✗
                  </text>
                ))}
                {head && <circle cx={head.x!} cy={head.y!} r={14} fill="#FF9DB9" stroke="#25212B" strokeWidth={4} />}
              </svg>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <button className="sticker grid h-9 w-9 place-items-center bg-white" onClick={() => (t >= tEnd ? (setT(t0), setPlaying(true)) : setPlaying(!playing))} aria-label={playing ? 'Pause' : 'Play'}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <input type="range" min={t0} max={Math.max(t0 + 1, tEnd)} value={t} onChange={(e) => setT(Number(e.target.value))} className="flex-1 accent-ink" aria-label="Replay time" />
              <span className="w-16 text-right font-mono text-sm">{((t - t0) / 1000).toFixed(1)}s</span>
            </div>
          </div>
          <div className="text-sm">
            <div className="grid grid-cols-2 gap-1.5 font-bold">
              <span className="text-ink/60">outcome</span>
              <span>{run.outcome}</span>
              <span className="text-ink/60">reason</span>
              <span className="font-mono">{run.reason ?? '—'}</span>
              <span className="text-ink/60">duration</span>
              <span>{run.duration_ms != null ? `${(run.duration_ms / 1000).toFixed(1)}s` : '—'}</span>
              <span className="text-ink/60">injection</span>
              <span>{run.injection_exposed ? (run.injection_complied ? '🤖 complied' : 'exposed, ignored') : 'off'}</span>
              <span className="text-ink/60">submitted via</span>
              <span>{String(run.submission?.via ?? run.submission?.action ?? '—')}</span>
            </div>
            <ol className="mt-3 max-h-64 space-y-1 overflow-auto pr-1">
              {notable.map((e, i) => {
                const st = EVENT_STYLE[e.type];
                return (
                  <li key={i}>
                    <button
                      onClick={() => setT(e.t)}
                      className={`flex w-full items-center gap-2 rounded-lg border-2 border-ink/20 px-2 py-0.5 text-left ${st.tone ?? 'bg-white'} ${e.t <= t ? '' : 'opacity-40'}`}
                    >
                      <span className="w-12 font-mono text-xs">{((e.t - t0) / 1000).toFixed(1)}s</span>
                      <span aria-hidden>{st.icon}</span>
                      <span className="font-bold">{st.label}</span>
                      {e.type === 'srv.result' && <span className="ml-auto font-mono text-xs">{String(e.data?.reason)}</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
      {a.harness_notes && !compact && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-bold">harness notes</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-ink p-3 text-xs text-cream">{a.harness_notes}</pre>
        </details>
      )}
    </div>
  );
}

export { LEVEL_SHORT, LEVEL_ORDER };
