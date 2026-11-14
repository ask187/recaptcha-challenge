import { motion } from 'motion/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function ChunkyButton({
  children,
  color = 'butter',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { color?: 'butter' | 'pink' | 'mint' | 'lilac' | 'coral' | 'white' }) {
  const bg = { butter: 'bg-butter', pink: 'bg-pink', mint: 'bg-mint', lilac: 'bg-lilac', coral: 'bg-coral', white: 'bg-white' }[color];
  return (
    <button {...rest} className={`btn-chunky ${bg} px-6 py-3 text-ink ${className}`}>
      {children}
    </button>
  );
}

export function LevelHeader({ title, sub, emoji }: { title: ReactNode; sub?: ReactNode; emoji?: string }) {
  return (
    <motion.header initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-3 text-center sm:mb-4">
      <h2 className="font-display text-2xl leading-tight font-bold sm:text-3xl" aria-live="polite">
        {emoji && <span aria-hidden className="mr-2">{emoji}</span>}
        {title}
      </h2>
      {sub && <p className="mt-1 text-base font-bold text-ink/70 sm:text-lg">{sub}</p>}
    </motion.header>
  );
}

export function Confetti({ count = 60 }: { count?: number }) {
  const colors = ['#FF9DB9', '#FFD76B', '#B8E6C5', '#BBA9F5', '#F36B6B'];
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 12) * 0.08;
        const size = 8 + (i % 4) * 4;
        return (
          <motion.div
            key={i}
            className="absolute border-2 border-ink"
            style={{ left: `${left}%`, top: -30, width: size, height: size * 0.6, background: colors[i % colors.length], borderRadius: i % 3 === 0 ? 99 : 3 }}
            initial={{ y: -40, rotate: 0 }}
            animate={{ y: '110vh', rotate: 720 * (i % 2 ? 1 : -1), x: [0, (i % 5) * 12 - 24, 0] }}
            transition={{ duration: 2.4 + (i % 7) * 0.25, delay, ease: 'easeIn' }}
          />
        );
      })}
    </div>
  );
}
