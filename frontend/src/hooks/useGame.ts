import { useCallback, useRef, useState } from 'react';
import type { AgentMode, CreateAttemptRequest, LevelPayload, Submission, SubmitResponse } from '../../../shared/types';
import { AGENT_MODES, LEVEL_ORDER } from '../../../shared/types';
import { api, ApiError } from '../api';
import { tracker } from '../security/InteractionTracker';

export type Phase = 'landing' | 'loading' | 'playing' | 'passed' | 'failed' | 'finished' | 'error';

export interface GameState {
  phase: Phase;
  attemptId: string | null;
  level: LevelPayload | null;
  completed: number;
  lastSubmission: Submission | null;
  lastResult: SubmitResponse | null;
  injections: boolean;
  error: string | null;
}

/** Evaluation runs are labelled through the URL, e.g. ?agent=dom&run=gpt-x-01&inj=0&strict=1 */
export function readRunParams(search = window.location.search): CreateAttemptRequest {
  const q = new URLSearchParams(search);
  const agent = q.get('agent') as AgentMode | null;
  return {
    mode: agent && AGENT_MODES.includes(agent) ? agent : 'human',
    agentType: q.get('agentType') ?? undefined,
    runLabel: q.get('run') ?? undefined,
    injections: q.get('inj') !== '0',
    strict: q.get('strict') === '1',
    webdriver: typeof navigator !== 'undefined' && !!navigator.webdriver,
    // demo recordings only; the server ignores it unless BBS_DEMO_JUMP=1
    startAt: q.get('level') ? Number(q.get('level')) - 1 : undefined,
  };
}

const REACTION_MS = 1700;

export function useGame() {
  const [s, setS] = useState<GameState>({
    phase: 'landing',
    attemptId: null,
    level: null,
    completed: 0,
    lastSubmission: null,
    lastResult: null,
    injections: true,
    error: null,
  });
  const busy = useRef(false);
  const patch = (p: Partial<GameState>) => setS((prev) => ({ ...prev, ...p }));

  const fail = (e: unknown) => {
    const msg = e instanceof ApiError && e.status === 410 ? 'This attempt expired. Even the cat got bored.' : e instanceof Error ? e.message : 'Something broke.';
    patch({ phase: 'error', error: msg });
    busy.current = false;
  };

  const loadLevel = useCallback(async (attemptId: string) => {
    const level = await api.startLevel(attemptId);
    tracker.setLevel(level.id);
    tracker.log('level.start', { index: level.index, tryNo: level.tryNo });
    patch({ phase: 'playing', level, lastSubmission: null, completed: level.index });
  }, []);

  const start = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    tracker.end();
    patch({ phase: 'loading', completed: 0, error: null, lastResult: null });
    try {
      const params = readRunParams();
      const a = await api.createAttempt(params);
      tracker.begin((events) => api.events(a.attemptId, events));
      tracker.log('attempt.start', { mode: params.mode, w: window.innerWidth, h: window.innerHeight });
      patch({ attemptId: a.attemptId, injections: a.injections });
      await loadLevel(a.attemptId);
    } catch (e) {
      fail(e);
    }
    busy.current = false;
  }, [loadLevel]);

  const submit = useCallback(
    async (submission: Submission) => {
      if (busy.current || !s.attemptId || !s.level) return;
      busy.current = true;
      const { attemptId, level } = s;
      tracker.log('level.submit', { action: submission.action });
      await tracker.flush();
      try {
        const res = await api.submit(attemptId, level.index, level.token, submission);
        if (res.outcome === 'passed') {
          patch({ phase: 'passed', lastSubmission: submission, lastResult: res, completed: level.index + 1 });
          await new Promise((r) => setTimeout(r, REACTION_MS));
          if (res.finished) {
            tracker.log('attempt.end', { verified: res.finished.verified });
            tracker.end();
            patch({ phase: 'finished' });
          } else await loadLevel(attemptId);
        } else {
          tracker.log('level.fail', { canRetry: res.canRetry });
          patch({ phase: 'failed', lastSubmission: submission, lastResult: res });
          if (!res.canRetry) tracker.end();
        }
      } catch (e) {
        fail(e);
      }
      busy.current = false;
    },
    [s, loadLevel],
  );

  const retry = useCallback(async () => {
    if (busy.current || !s.attemptId) return;
    busy.current = true;
    try {
      await loadLevel(s.attemptId);
    } catch (e) {
      fail(e);
    }
    busy.current = false;
  }, [s.attemptId, loadLevel]);

  return { state: s, start, submit, retry, totalLevels: LEVEL_ORDER.length };
}
