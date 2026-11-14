import { motion } from 'motion/react';
import { BrainCellSvg, Doodle, Gaslighter, KarateCat, OfficeMonkey } from '../MemeCharacter/characters';
import { ChunkyButton } from './ui';

export function Landing({ onStart, busy }: { onStart: () => void; busy: boolean }) {
  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-2 py-10">
      {/* characters peeking around the card */}
      <motion.div className="absolute -left-4 top-0 hidden w-40 sm:block md:-left-24 md:w-48" initial={{ rotate: -14, y: 30, opacity: 0 }} animate={{ rotate: -10, y: 0, opacity: 1 }} transition={{ delay: 0.15, type: 'spring' }}>
        <KarateCat className="w-full" />
      </motion.div>
      <motion.div className="absolute -right-4 top-4 hidden w-36 sm:block md:-right-20 md:w-44" initial={{ rotate: 14, y: 30, opacity: 0 }} animate={{ rotate: 8, y: 0, opacity: 1 }} transition={{ delay: 0.25, type: 'spring' }}>
        <Gaslighter className="w-full" look="left" />
      </motion.div>
      <motion.div className="absolute -bottom-2 -left-2 hidden w-44 sm:block md:-left-20 md:w-52" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35, type: 'spring' }}>
        <OfficeMonkey className="w-full" />
      </motion.div>
      <motion.div className="anim-floaty absolute -bottom-4 -right-2 hidden w-28 sm:block md:-right-12 md:w-32" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
        <BrainCellSvg className="w-full" />
      </motion.div>
      <Doodle kind="star" className="anim-floaty absolute left-1/4 top-0 w-10" />
      <Doodle kind="spark" className="anim-floaty absolute bottom-10 right-1/3 w-8" style={{ animationDelay: '1s' }} />
      <Doodle kind="squiggle" className="absolute right-1/4 top-6 w-16" />
      <Doodle kind="heart" className="anim-floaty absolute bottom-0 left-1/3 w-8" style={{ animationDelay: '2s' }} />

      <motion.section
        initial={{ scale: 0.85, rotate: -3, opacity: 0 }}
        animate={{ scale: 1, rotate: -1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        className="card-wobbly relative z-10 w-full max-w-md px-6 py-9 text-center sm:px-10"
      >
        <div className="sticker absolute -top-5 left-1/2 -translate-x-1/2 -rotate-3 bg-pink px-4 py-1 text-sm whitespace-nowrap">certified CAPTCHA™ (allegedly)</div>
        <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight sm:text-6xl">
          BOT, BE
          <br />
          <span className="inline-block -rotate-2 bg-butter px-2">SERIOUS!</span>
        </h1>
        <p className="mt-5 font-display text-2xl font-semibold">Prove you're human.</p>
        <p className="mt-1 text-lg font-bold text-ink/70">Four levels. Zero dignity.</p>
        <ChunkyButton className="mt-7 w-full text-xl sm:text-2xl" onClick={onStart} disabled={busy} autoFocus>
          {busy ? 'warming up the cat…' : "LET'S GET THIS OVER WITH"}
        </ChunkyButton>
        <p className="mt-4 text-sm font-bold text-ink/50">~30 seconds · works with mouse, touch & keyboard</p>
      </motion.section>
    </div>
  );
}
