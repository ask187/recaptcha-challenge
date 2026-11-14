import { AnimatePresence, motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';

type Tail = 'left' | 'right' | 'bottom' | 'top';

export function SpeechBubble({
  children,
  tail = 'bottom',
  color = '#fff',
  className = '',
  style,
  show = true,
  shout = false,
}: {
  children: ReactNode;
  tail?: Tail;
  color?: string;
  className?: string;
  style?: CSSProperties;
  show?: boolean;
  shout?: boolean;
}) {
  const tailPos: Record<Tail, CSSProperties> = {
    bottom: { left: '24%', bottom: -18, borderWidth: '18px 10px 0 10px', borderColor: '#25212B transparent transparent transparent' },
    top: { left: '24%', top: -18, borderWidth: '0 10px 18px 10px', borderColor: 'transparent transparent #25212B transparent' },
    left: { left: -18, top: '40%', borderWidth: '10px 18px 10px 0', borderColor: 'transparent #25212B transparent transparent' },
    right: { right: -18, top: '40%', borderWidth: '10px 0 10px 18px', borderColor: 'transparent transparent transparent #25212B' },
  };
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: shout ? [-2, 2, -2] : -1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={shout ? { rotate: { repeat: Infinity, duration: 0.3 } } : { type: 'spring', stiffness: 380, damping: 18 }}
          className={`absolute font-display font-semibold text-ink ${className}`}
          style={{
            background: color,
            border: '4px solid #25212B',
            borderRadius: '22px 18px 24px 16px',
            padding: '10px 16px',
            boxShadow: '4px 4px 0 #25212B',
            ...style,
          }}
        >
          {children}
          <span className="absolute h-0 w-0 border-solid" style={tailPos[tail]} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
