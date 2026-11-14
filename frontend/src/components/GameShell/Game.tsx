import { Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Accessibility, Volume2, VolumeX } from 'lucide-react';
import { LEVELS, FAIL_LINES } from '../../levels/registry';
import { useGame } from '../../hooks/useGame';
import { isMuted, onMuteChange, setMuted, sfx } from '../../lib/sound';
import { HoneypotControls } from '../../security/HoneypotControls';
import { InjectionCtx } from '../../security/InjectionLayer';
import { tracker } from '../../security/InteractionTracker';
import { FailureScreen, useRandomLine } from '../FailureScreen/FailureScreen';
import { ProgressBar } from '../ProgressBar/ProgressBar';
import { LevelReaction, SuccessScreen } from '../SuccessScreen/SuccessScreen';
import { Landing } from './Landing';
import { ChunkyButton } from './ui';

const EMOJI: Record<string, string> = { 'karate-cat': '📦', 'corporate-burnout': '🏖️', gaslighting: '🧠', 'last-brain-cell': '🛋️' };

export function Game() {
  const { state, start, submit, retry, totalLevels } = useGame();
  const [muted, setM] = useState(isMuted());
  const [a11y, setA11y] = useState(false);
  useEffect(() => onMuteChange(setM) as () => void, []);

  const level = state.level;
  const meta = level ? LEVELS[level.id] : null;
  const LevelComponent = meta?.component;
  const failLine = useRandomLine(FAIL_LINES, `${level?.index}-${level?.tryNo}-${state.phase}`);
  const inGame = ['playing', 'passed', 'failed'].includes(state.phase);

  useEffect(() => {
    if (state.phase === 'failed') sfx.fail();
  }, [state.phase]);

  const toggleA11y = () => {
    setA11y((v) => {
      if (!v) tracker.log('a11y.on', null, null, true);
      return !v;
    });
  };

  const decoy = state.lastSubmission?.action === 'decoy';
  const headline = meta ? (decoy ? meta.decoyFail : state.lastResult?.reason === 'wrong' ? meta.wrongFail : failLine) : failLine;
  const subline = decoy ? failLine : 'Skill issue. Respectfully.';

  return (
    <InjectionCtx.Provider value={state.injections}>
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pb-8 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3 py-4">
          <a href="#/" className="sticker -rotate-2 bg-butter px-4 py-1.5 text-lg sm:text-xl" onClick={(e) => e.preventDefault()}>
            BOT, BE SERIOUS! <span aria-hidden>🤖🚫</span>
          </a>
          {inGame && <ProgressBar total={totalLevels} current={level?.index ?? 0} completed={state.completed} />}
          <div className="flex items-center gap-2">
            {inGame && (
              <button
                type="button"
                onClick={toggleA11y}
                aria-pressed={a11y}
                className={`sticker flex items-center gap-1.5 px-3 py-1.5 text-sm ${a11y ? 'bg-lilac' : 'bg-white'}`}
                title="Accessible version of this challenge"
              >
                <Accessibility className="h-4 w-4" strokeWidth={3} />
                <span className="hidden sm:inline">accessible version</span>
                <span className="sr-only sm:hidden">accessible version</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
              className="sticker grid h-9 w-9 place-items-center bg-white"
            >
              {muted ? <VolumeX className="h-4 w-4" strokeWidth={3} /> : <Volume2 className="h-4 w-4" strokeWidth={3} />}
            </button>
          </div>
        </header>

        <main className="relative flex-1">
          {state.phase === 'landing' && <Landing onStart={start} busy={false} />}
          {state.phase === 'loading' && (
            <div className="grid min-h-[60vh] place-items-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} className="text-6xl" aria-label="Loading">
                🧠
              </motion.div>
            </div>
          )}

          {inGame && level && LevelComponent && (
            <div className="relative">
              <HoneypotControls key={state.attemptId ?? 'none'} />
              <Suspense fallback={<div className="p-10 text-center font-display text-2xl">locating brain cell…</div>}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${level.index}-${level.tryNo}`}
                    initial={{ x: 80, opacity: 0, rotate: 1.5 }}
                    animate={{ x: 0, opacity: 1, rotate: 0 }}
                    exit={{ x: -80, opacity: 0, rotate: -1.5, transition: { duration: 0.2, ease: 'easeIn' } }}
                    transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  >
                    <LevelComponent config={level.config} injections={state.injections} a11y={a11y} locked={state.phase !== 'playing'} onFinish={submit} />
                  </motion.div>
                </AnimatePresence>
              </Suspense>
              <AnimatePresence>
                {state.phase === 'passed' && meta && <LevelReaction key="ok" message={meta.pass} emoji={EMOJI[meta.id]} />}
                {state.phase === 'failed' && (
                  <FailureScreen
                    key="fail"
                    headline={headline}
                    line={subline}
                    canRetry={!!state.lastResult?.canRetry}
                    triesLeft={level.maxTries - level.tryNo}
                    onRetry={retry}
                    onRestart={start}
                  />
                )}
              </AnimatePresence>
            </div>
          )}

          {state.phase === 'finished' && state.lastResult?.finished && (
            <SuccessScreen {...state.lastResult.finished} onAgain={start} />
          )}

          {state.phase === 'error' && (
            <div className="mx-auto max-w-md py-16 text-center">
              <div className="card-wobbly p-8">
                <h2 className="font-display text-3xl font-bold">The website tripped over its own cable.</h2>
                <p className="mt-2 font-bold text-ink/70">{state.error}</p>
                <ChunkyButton className="mt-6 w-full" onClick={start}>
                  start a fresh attempt
                </ChunkyButton>
              </div>
            </div>
          )}
        </main>

        <footer className="mt-6 flex items-center justify-between text-xs font-bold text-ink/40">
          <span>Original characters. No cats were harmed. Several were humbled.</span>
          <a href="#/dashboard" className="underline decoration-dotted hover:text-ink">
            evaluator lab
          </a>
        </footer>
      </div>
    </InjectionCtx.Provider>
  );
}
