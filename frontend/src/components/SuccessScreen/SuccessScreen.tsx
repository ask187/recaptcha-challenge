import { motion } from 'motion/react';
import { BrainCellSvg, Doodle, KarateCat } from '../MemeCharacter/characters';
import { ChunkyButton, Confetti } from '../GameShell/ui';

export function LevelReaction({ message, emoji }: { message: string; emoji: string }) {
  return (
    <motion.div className="absolute inset-0 z-40 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="status">
      <motion.div
        initial={{ scale: 0.3, rotate: -12 }}
        animate={{ scale: 1, rotate: [-3, 2, -1] }}
        transition={{ type: 'spring', stiffness: 300, damping: 12 }}
        className="card-wobbly max-w-lg bg-mint px-8 py-6 text-center"
        style={{ background: '#B8E6C5' }}
      >
        <div className="text-5xl" aria-hidden>
          {emoji}
        </div>
        <p className="mt-2 font-display text-3xl leading-tight font-bold">{message}</p>
      </motion.div>
    </motion.div>
  );
}

export function SuccessScreen({
  verified,
  totalMs,
  tries,
  rating,
  onAgain,
}: {
  verified: boolean;
  totalMs: number;
  tries: number;
  rating: string;
  onAgain: () => void;
}) {
  if (!verified) {
    // Deliberately vague: never reveals which signal (e.g. a honeypot) caused this.
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <div className="card-wobbly p-8">
          <h2 className="font-display text-4xl font-bold">Hmm. Not quite.</h2>
          <p className="mt-3 text-lg font-bold">You finished, but verification couldn't be completed. The cat is reviewing your case.</p>
          <ChunkyButton className="mt-6 w-full text-xl" onClick={onAgain}>
            start a new attempt
          </ChunkyButton>
        </div>
      </div>
    );
  }
  return (
    <div className="relative mx-auto max-w-xl py-10 text-center">
      <Confetti />
      <Doodle kind="star" className="anim-floaty absolute -left-2 top-4 w-12" />
      <Doodle kind="spark" className="anim-floaty absolute right-0 top-16 w-10" style={{ animationDelay: '0.7s' }} />
      <motion.div initial={{ scale: 0.5, rotate: 8 }} animate={{ scale: 1, rotate: -1 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }} className="card-wobbly relative px-6 py-9 sm:px-10">
        <motion.div className="absolute -top-16 left-1/2 w-28 -translate-x-1/2" animate={{ y: [0, -14, 0] }} transition={{ repeat: Infinity, duration: 1.2 }}>
          <BrainCellSvg mood="happy" className="w-full" />
        </motion.div>
        <p className="mt-6 text-lg font-bold">Congratulations. Your single remaining brain cell has been recovered.</p>
        <h2 className="mt-4 font-display text-5xl font-bold sm:text-6xl">
          <span className="inline-block -rotate-2 bg-mint px-3">HUMAN VERIFIED</span>
        </h2>
        <p className="mt-2 font-display text-xl font-semibold">Human verified. Intelligence still under investigation.</p>
        <p className="mt-4 text-lg font-bold">Congratulations. You're a real person.</p>
        <p className="text-lg font-bold text-ink/70">Unfortunately, you're also extremely online.</p>
        <dl className="mt-6 grid grid-cols-3 gap-3">
          <div className="sticker rounded-2xl! bg-butter px-2 py-3">
            <dt className="text-xs uppercase">time</dt>
            <dd className="text-2xl">{(totalMs / 1000).toFixed(1)}s</dd>
          </div>
          <div className="sticker rounded-2xl! bg-pink px-2 py-3">
            <dt className="text-xs uppercase">attempts</dt>
            <dd className="text-2xl">{tries}</dd>
          </div>
          <div className="sticker rounded-2xl! bg-lilac px-2 py-3">
            <dt className="text-xs uppercase">levels</dt>
            <dd className="text-2xl">4/4</dd>
          </div>
        </dl>
        <div className="mt-5 inline-block -rotate-1 rounded-2xl border-4 border-ink bg-white px-4 py-2 font-display text-xl font-bold" style={{ boxShadow: '4px 4px 0 #25212B' }}>
          Rating: {rating}
        </div>
        <div className="mt-6 flex items-end justify-center gap-4">
          <KarateCat mood="calm" className="w-24" />
          <ChunkyButton onClick={onAgain} className="text-lg">
            do it again (why?)
          </ChunkyButton>
        </div>
      </motion.div>
    </div>
  );
}
