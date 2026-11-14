import { motion } from 'motion/react';
import { Check } from 'lucide-react';

const EMOJI = ['🥋', '📅', '🙃', '🧠'];

export function ProgressBar({ total, current, completed }: { total: number; current: number; completed: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label={`Level ${Math.min(current + 1, total)} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const state = i < completed ? 'done' : i === current ? 'active' : 'todo';
        return (
          <li key={i} className="flex items-center gap-2 sm:gap-3">
            <motion.div
              layout
              animate={state === 'active' ? { scale: [1, 1.12, 1], rotate: [-4, 4, -4] } : { scale: 1, rotate: state === 'done' ? -6 : 0 }}
              transition={state === 'active' ? { repeat: Infinity, duration: 1.6 } : { type: 'spring', stiffness: 300 }}
              className={`sticker grid h-10 w-10 place-items-center text-lg sm:h-12 sm:w-12 ${
                state === 'done' ? 'bg-mint' : state === 'active' ? 'bg-butter' : 'bg-white opacity-60'
              }`}
              aria-label={`Level ${i + 1}: ${state === 'done' ? 'completed' : state === 'active' ? 'current' : 'not started'}`}
            >
              {state === 'done' ? <Check strokeWidth={4} className="h-5 w-5" /> : <span aria-hidden>{EMOJI[i] ?? i + 1}</span>}
            </motion.div>
            {i < total - 1 && (
              <div className="h-1.5 w-4 overflow-hidden rounded-full bg-ink/15 sm:w-8">
                <motion.div className="h-full bg-ink" initial={false} animate={{ width: i < completed ? '100%' : '0%' }} transition={{ duration: 0.5 }} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
