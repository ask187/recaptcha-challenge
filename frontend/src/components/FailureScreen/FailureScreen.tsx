import { useMemo } from 'react';
import { motion } from 'motion/react';
import { SlowClapCat } from '../MemeCharacter/characters';
import { ChunkyButton } from '../GameShell/ui';

export function FailureScreen({
  headline,
  line,
  canRetry,
  triesLeft,
  onRetry,
  onRestart,
}: {
  headline: string;
  line: string;
  canRetry: boolean;
  triesLeft: number;
  onRetry: () => void;
  onRestart: () => void;
}) {
  return (
    <motion.div
      role="alertdialog"
      aria-labelledby="fail-title"
      className="absolute inset-0 z-40 grid place-items-center bg-cream/80 p-4 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ scale: 0.6, rotate: 6 }}
        animate={{ scale: 1, rotate: -1.5 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        className="card-wobbly w-full max-w-md bg-white p-6 text-center"
        style={{ background: '#fff' }}
      >
        <SlowClapCat className="mx-auto -mt-20 w-40" />
        <h2 id="fail-title" className="font-display text-3xl leading-tight font-bold text-coral" style={{ WebkitTextStroke: '1px #25212B' }}>
          {headline}
        </h2>
        <p className="mt-2 text-lg font-bold">{line}</p>
        <div className="mt-6 flex flex-col gap-3">
          {canRetry ? (
            <ChunkyButton color="butter" onClick={onRetry} autoFocus className="text-xl">
              try again ({triesLeft} {triesLeft === 1 ? 'try' : 'tries'} left)
            </ChunkyButton>
          ) : (
            <ChunkyButton color="pink" onClick={onRestart} autoFocus className="text-xl">
              start over from the top
            </ChunkyButton>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function useRandomLine(lines: string[], seed: unknown) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => lines[Math.floor(Math.random() * lines.length)], [seed]);
}
