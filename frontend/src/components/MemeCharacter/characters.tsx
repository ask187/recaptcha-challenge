import { motion, useReducedMotion } from 'motion/react';

/**
 * Original hand-drawn style characters (inline SVG, no external assets).
 * All are decorative: aria-hidden, and their parent supplies any real labels.
 */

const INK = '#25212B';
const SW = 5;

type SvgProps = { className?: string; style?: React.CSSProperties };

// ----------------------------------------------------------------------------- Karate cat

export type CatMood = 'angry' | 'furious' | 'calm' | 'hungry';

export function KarateCat({ mood = 'angry', className, style }: SvgProps & { mood?: CatMood }) {
  const reduce = useReducedMotion();
  const punching = (mood === 'angry' || mood === 'furious') && !reduce;
  const speed = mood === 'furious' ? 0.18 : 0.32;
  const orange = '#FFA24C';
  return (
    <svg viewBox="0 0 220 260" className={className} style={style} aria-hidden="true">
      {/* tail */}
      <motion.path
        d="M150 215 C 205 215, 210 160, 190 130"
        fill="none"
        stroke={INK}
        strokeWidth={22}
        strokeLinecap="round"
        animate={punching ? { rotate: [0, 8, 0] } : { rotate: 0 }}
        transition={{ repeat: Infinity, duration: 0.6 }}
        style={{ originX: '150px', originY: '215px' }}
      />
      <motion.path
        d="M150 215 C 205 215, 210 160, 190 130"
        fill="none"
        stroke={orange}
        strokeWidth={12}
        strokeLinecap="round"
        animate={punching ? { rotate: [0, 8, 0] } : { rotate: 0 }}
        transition={{ repeat: Infinity, duration: 0.6 }}
        style={{ originX: '150px', originY: '215px' }}
      />
      {/* legs */}
      <ellipse cx="85" cy="238" rx="22" ry="14" fill={orange} stroke={INK} strokeWidth={SW} />
      <ellipse cx="137" cy="238" rx="22" ry="14" fill={orange} stroke={INK} strokeWidth={SW} />
      {/* body + gi */}
      <ellipse cx="111" cy="182" rx="56" ry="58" fill="#fff" stroke={INK} strokeWidth={SW} />
      <path d="M111 128 L 92 190 M111 128 L 130 190" stroke={INK} strokeWidth={4} fill="none" />
      <ellipse cx="111" cy="196" rx="24" ry="22" fill={orange} opacity={0.35} />
      {/* black belt */}
      <path d="M58 196 Q 111 210 164 196" stroke={INK} strokeWidth={12} fill="none" strokeLinecap="round" />
      <path d="M108 203 l -14 26 M114 203 l 12 24" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      {/* arms with gloves */}
      <motion.g
        animate={punching ? { x: [0, -34, 0], y: [0, -6, 0] } : { x: 0, y: 0 }}
        transition={{ repeat: Infinity, duration: speed, ease: 'easeOut' }}
      >
        <path d="M70 160 Q 40 160 36 140" stroke={INK} strokeWidth={18} strokeLinecap="round" fill="none" />
        <path d="M70 160 Q 40 160 36 140" stroke="#fff" strokeWidth={9} strokeLinecap="round" fill="none" />
        <circle cx="32" cy="132" r="21" fill="#F36B6B" stroke={INK} strokeWidth={SW} />
        <path d="M22 126 q 8 -6 16 0" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.8} />
      </motion.g>
      <motion.g
        animate={punching ? { x: [0, 34, 0], y: [0, -6, 0] } : { x: 0, y: 0 }}
        transition={{ repeat: Infinity, duration: speed, ease: 'easeOut', delay: speed / 2 }}
      >
        <path d="M152 160 Q 182 160 186 140" stroke={INK} strokeWidth={18} strokeLinecap="round" fill="none" />
        <path d="M152 160 Q 182 160 186 140" stroke="#fff" strokeWidth={9} strokeLinecap="round" fill="none" />
        <circle cx="190" cy="132" r="21" fill="#F36B6B" stroke={INK} strokeWidth={SW} />
        <path d="M180 126 q 8 -6 16 0" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.8} />
      </motion.g>
      {/* head */}
      <motion.g
        animate={punching ? { rotate: [-3, 3, -3] } : mood === 'calm' ? { rotate: [0, -4, 0] } : { rotate: 0 }}
        transition={{ repeat: Infinity, duration: punching ? speed * 2 : 2.4 }}
        style={{ originX: '110px', originY: '120px' }}
      >
        <path d="M62 62 L 58 14 L 96 40 Z" fill={orange} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <path d="M158 62 L 162 14 L 124 40 Z" fill={orange} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <path d="M66 52 L 64 28 L 84 42 Z" fill="#FF9DB9" />
        <path d="M154 52 L 156 28 L 136 42 Z" fill="#FF9DB9" />
        <ellipse cx="110" cy="86" rx="58" ry="50" fill={orange} stroke={INK} strokeWidth={SW} />
        {/* stripes */}
        <path d="M98 40 l 3 14 M110 38 l 0 15 M122 40 l -3 14" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        {/* headband */}
        <path d="M54 66 Q 110 52 166 66" stroke="#F36B6B" strokeWidth={11} fill="none" strokeLinecap="round" />
        <motion.path
          d="M162 66 q 22 4 34 -6 M162 70 q 20 12 30 10"
          stroke="#F36B6B"
          strokeWidth={7}
          fill="none"
          strokeLinecap="round"
          animate={punching ? { rotate: [0, -10, 0] } : {}}
          transition={{ repeat: Infinity, duration: 0.25 }}
          style={{ originX: '162px', originY: '66px' }}
        />
        {/* face */}
        {mood === 'calm' ? (
          <>
            <path d="M76 88 q 10 -10 20 0 M124 88 q 10 -10 20 0" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
            <ellipse cx="74" cy="104" rx="9" ry="5" fill="#FF9DB9" opacity={0.8} />
            <ellipse cx="146" cy="104" rx="9" ry="5" fill="#FF9DB9" opacity={0.8} />
            <path d="M100 106 q 5 7 10 0 q 5 7 10 0" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
          </>
        ) : mood === 'hungry' ? (
          <>
            <circle cx="88" cy="88" r="12" fill="#fff" stroke={INK} strokeWidth={4} />
            <circle cx="132" cy="88" r="12" fill="#fff" stroke={INK} strokeWidth={4} />
            <circle cx="91" cy="86" r="6" fill={INK} />
            <circle cx="135" cy="86" r="6" fill={INK} />
            <circle cx="93" cy="84" r="2" fill="#fff" />
            <circle cx="137" cy="84" r="2" fill="#fff" />
            <ellipse cx="110" cy="112" rx="10" ry="8" fill={INK} />
            <path d="M106 116 q 4 10 8 0" fill="#FF9DB9" />
          </>
        ) : (
          <>
            <path d="M74 74 L 100 84 M146 74 L 120 84" stroke={INK} strokeWidth={7} strokeLinecap="round" />
            <ellipse cx="89" cy="92" rx="10" ry={mood === 'furious' ? 6 : 8} fill="#fff" stroke={INK} strokeWidth={4} />
            <ellipse cx="131" cy="92" rx="10" ry={mood === 'furious' ? 6 : 8} fill="#fff" stroke={INK} strokeWidth={4} />
            <circle cx="92" cy="93" r={mood === 'furious' ? 2.5 : 4} fill={INK} />
            <circle cx="128" cy="93" r={mood === 'furious' ? 2.5 : 4} fill={INK} />
            {mood === 'furious' ? (
              <>
                <path d="M92 108 Q 110 98 128 108 L 124 122 Q 110 128 96 122 Z" fill={INK} />
                <path d="M100 110 l 4 7 l 4 -7 M112 110 l 4 7 l 4 -7" fill="#fff" />
                <path d="M150 52 l 8 -6 m -4 10 l 10 -2 m -12 -8 l 2 -10" stroke="#F36B6B" strokeWidth={4} strokeLinecap="round" />
              </>
            ) : (
              <>
                <path d="M96 114 Q 110 106 124 114" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
                <path d="M100 113 l 3 7 l 3 -6" fill="#fff" stroke={INK} strokeWidth={2} />
              </>
            )}
          </>
        )}
        <path d="M108 100 l 4 0 l -2 3 z" fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path d="M60 100 l -26 -4 M60 108 l -26 4 M160 100 l 26 -4 M160 108 l 26 4" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      </motion.g>
    </svg>
  );
}

// ----------------------------------------------------------------------------- Office monkey

export type MonkeyMood = 'tired' | 'relaxed' | 'collapsed';

export function OfficeMonkey({ mood = 'tired', className, style }: SvgProps & { mood?: MonkeyMood }) {
  const fur = '#9C6B48';
  const face = '#EBC6A0';
  const collapsed = mood === 'collapsed';
  return (
    <svg viewBox="0 0 250 280" className={className} style={style} aria-hidden="true">
      {/* chair back */}
      <rect x="40" y="96" width="170" height="150" rx="34" fill="#BBA9F5" stroke={INK} strokeWidth={SW} />
      <motion.g
        animate={collapsed ? { rotate: 24, y: 46, x: 14 } : mood === 'relaxed' ? { rotate: [-2, 2, -2], y: 0 } : { y: [0, 3, 0], rotate: 0 }}
        transition={collapsed ? { type: 'spring', stiffness: 140, damping: 9 } : { repeat: Infinity, duration: mood === 'relaxed' ? 2 : 3 }}
        style={{ originX: '125px', originY: '230px' }}
      >
        {/* body / shirt + tie */}
        <path d="M62 250 Q 66 168 125 166 Q 184 168 188 250 Z" fill="#fff" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <path d="M112 168 L 125 186 L 138 168" fill="none" stroke={INK} strokeWidth={4} />
        <path d="M125 186 L 116 222 L 125 236 L 134 222 Z" fill="#F36B6B" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        {/* lanyard badge */}
        <rect x="146" y="206" width="26" height="30" rx="5" fill="#FFD76B" stroke={INK} strokeWidth={3} />
        <path d="M151 216 h 16 M151 224 h 10" stroke={INK} strokeWidth={2.5} />
        {/* ears */}
        <circle cx="62" cy="104" r="24" fill={fur} stroke={INK} strokeWidth={SW} />
        <circle cx="62" cy="104" r="12" fill={face} />
        <circle cx="188" cy="104" r="24" fill={fur} stroke={INK} strokeWidth={SW} />
        <circle cx="188" cy="104" r="12" fill={face} />
        {/* head */}
        <ellipse cx="125" cy="98" rx="66" ry="62" fill={fur} stroke={INK} strokeWidth={SW} />
        <path d="M80 92 Q 82 56 112 62 Q 125 70 138 62 Q 168 56 170 92 Q 176 140 125 146 Q 74 140 80 92 Z" fill={face} stroke={INK} strokeWidth={4} />
        {/* hair tuft */}
        <path d="M112 38 q 8 -18 14 0 q 6 -16 12 2" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        {mood === 'tired' && (
          <>
            <circle cx="104" cy="94" r="11" fill="#fff" stroke={INK} strokeWidth={3.5} />
            <circle cx="146" cy="94" r="11" fill="#fff" stroke={INK} strokeWidth={3.5} />
            <path d="M93 93 h 22 v -12 h -22 z M135 93 h 22 v -12 h -22 z" fill={face} />
            <path d="M93 93 h 22 M135 93 h 22" stroke={INK} strokeWidth={4} strokeLinecap="round" />
            <circle cx="104" cy="98" r="3.5" fill={INK} />
            <circle cx="146" cy="98" r="3.5" fill={INK} />
            <path d="M94 110 q 10 6 20 0 M136 110 q 10 6 20 0" stroke="#8a6fbf" strokeWidth={4} fill="none" strokeLinecap="round" />
            <path d="M110 128 q 15 -6 30 0" stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />
          </>
        )}
        {mood === 'relaxed' && (
          <>
            <path d="M86 86 h 34 v 10 q -2 12 -17 12 q -15 0 -17 -12 z M130 86 h 34 v 10 q -2 12 -17 12 q -15 0 -17 -12 z" fill={INK} />
            <path d="M120 90 h 10" stroke={INK} strokeWidth={4} />
            <path d="M92 90 l 8 0" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
            <path d="M104 122 Q 125 142 146 122" stroke={INK} strokeWidth={5} fill="#fff" strokeLinecap="round" />
          </>
        )}
        {collapsed && (
          <>
            <path d="M96 88 l 14 14 m 0 -14 l -14 14 M138 88 l 14 14 m 0 -14 l -14 14" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
            <ellipse cx="125" cy="128" rx="10" ry="7" fill={INK} />
          </>
        )}
        <ellipse cx="118" cy="114" rx="3" ry="2" fill={INK} />
        <ellipse cx="132" cy="114" rx="3" ry="2" fill={INK} />
      </motion.g>
      {/* desk */}
      <rect x="0" y="236" width="250" height="44" rx="8" fill="#FFD76B" stroke={INK} strokeWidth={SW} />
      {/* mug */}
      <g transform="translate(18 196)">
        <rect x="0" y="0" width="40" height="44" rx="6" fill="#fff" stroke={INK} strokeWidth={4} />
        <path d="M40 10 q 16 2 0 22" fill="none" stroke={INK} strokeWidth={4} />
        <text x="20" y="27" textAnchor="middle" fontSize="12" fontFamily="Fredoka" fontWeight={700} fill={INK}>
          #1
        </text>
        {mood !== 'collapsed' && (
          <path d="M12 -6 q -4 -8 2 -14 M26 -6 q -4 -8 2 -14" stroke={INK} strokeWidth={2.5} fill="none" opacity={0.5} strokeLinecap="round" />
        )}
      </g>
      {collapsed && (
        <text x="196" y="150" fontFamily="Fredoka" fontWeight={700} fontSize="26" fill={INK}>
          z z
        </text>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------------- Gaslighter

export function Gaslighter({ className, style, look = 'right' }: SvgProps & { look?: 'left' | 'right' }) {
  const dx = look === 'right' ? 6 : -6;
  return (
    <svg viewBox="0 0 190 210" className={className} style={style} aria-hidden="true">
      <motion.g animate={{ rotate: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 3 }} style={{ originX: '95px', originY: '200px' }}>
        <path d="M95 10 C 160 10, 178 90, 170 140 C 162 190, 120 202, 95 202 C 70 202, 28 190, 20 140 C 12 90, 30 10, 95 10 Z" fill="#BBA9F5" stroke={INK} strokeWidth={SW} />
        {/* raised brow + flat brow */}
        <path d="M48 70 Q 64 52 82 64" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
        <path d="M110 70 L 140 70" stroke={INK} strokeWidth={6} strokeLinecap="round" />
        {/* side-eye */}
        <ellipse cx="66" cy="90" rx="17" ry="12" fill="#fff" stroke={INK} strokeWidth={4} />
        <ellipse cx="124" cy="90" rx="17" ry="12" fill="#fff" stroke={INK} strokeWidth={4} />
        <circle cx={66 + dx} cy="92" r="6" fill={INK} />
        <circle cx={124 + dx} cy="92" r="6" fill={INK} />
        <path d="M49 86 h 34 M107 86 h 34" stroke="#BBA9F5" strokeWidth={8} />
        <path d="M49 84 h 34 M107 84 h 34" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        {/* smug smirk */}
        <path d="M70 134 Q 100 146 126 124" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
        <path d="M124 120 l 6 8" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <ellipse cx="46" cy="118" rx="10" ry="6" fill="#FF9DB9" opacity={0.7} />
        <ellipse cx="146" cy="118" rx="10" ry="6" fill="#FF9DB9" opacity={0.7} />
        {/* pointing hand */}
        <motion.g animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 0.9 }}>
          <path d={look === 'right' ? 'M150 160 q 20 -4 34 -12' : 'M40 160 q -20 -4 -34 -12'} stroke={INK} strokeWidth={12} strokeLinecap="round" fill="none" />
          <path d={look === 'right' ? 'M150 160 q 20 -4 34 -12' : 'M40 160 q -20 -4 -34 -12'} stroke="#BBA9F5" strokeWidth={5} strokeLinecap="round" fill="none" />
        </motion.g>
        {/* tea */}
        <g transform="translate(36 152)">
          <path d="M0 0 h 34 q -2 22 -17 22 q -15 0 -17 -22 z" fill="#fff" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <path d="M8 -6 q -3 -6 2 -10" stroke={INK} strokeWidth={2.5} fill="none" opacity={0.5} />
        </g>
      </motion.g>
    </svg>
  );
}

// ----------------------------------------------------------------------------- Brain cell

export type BrainMood = 'nervous' | 'panic' | 'happy';

export function BrainCellSvg({ mood = 'nervous', className, style }: SvgProps & { mood?: BrainMood }) {
  return (
    <svg viewBox="0 0 140 140" className={className} style={style} aria-hidden="true">
      <motion.g animate={mood === 'panic' ? { x: [-3, 3, -3] } : { y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: mood === 'panic' ? 0.15 : 1.6 }}>
        <path d="M30 78 q -16 -4 -20 -18 M110 78 q 16 -4 20 -18" stroke={INK} strokeWidth={6} strokeLinecap="round" fill="none" />
        <path d="M70 18 C 98 14, 120 34, 118 62 C 128 84, 108 112, 82 110 C 70 122, 44 118, 38 102 C 16 98, 12 70, 26 56 C 24 32, 48 16, 70 18 Z" fill="#8BD9A4" stroke={INK} strokeWidth={SW} />
        <path d="M46 44 q 10 -6 16 4 M82 36 q 10 2 10 14 M98 76 q -8 8 -18 2 M42 80 q 8 -4 14 4" stroke="#4a9a68" strokeWidth={3.5} fill="none" strokeLinecap="round" />
        <circle cx="56" cy="66" r="12" fill="#fff" stroke={INK} strokeWidth={3.5} />
        <circle cx="86" cy="66" r="12" fill="#fff" stroke={INK} strokeWidth={3.5} />
        <circle cx={mood === 'panic' ? 56 : 58} cy={mood === 'panic' ? 64 : 68} r={mood === 'panic' ? 3 : 5} fill={INK} />
        <circle cx={mood === 'panic' ? 86 : 88} cy={mood === 'panic' ? 64 : 68} r={mood === 'panic' ? 3 : 5} fill={INK} />
        {mood === 'happy' ? (
          <path d="M60 86 Q 71 100 82 86" stroke={INK} strokeWidth={4.5} fill="#fff" strokeLinecap="round" />
        ) : mood === 'panic' ? (
          <ellipse cx="71" cy="92" rx="8" ry="10" fill={INK} />
        ) : (
          <path d="M60 92 q 5 -5 11 0 q 5 5 11 0" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
        )}
        {mood !== 'happy' && <path d="M112 36 q 6 10 0 14 q -6 -4 0 -14" fill="#9fd3ff" stroke={INK} strokeWidth={2.5} />}
      </motion.g>
    </svg>
  );
}

// ----------------------------------------------------------------------------- Slow clap cat

export function SlowClapCat({ className, style }: SvgProps) {
  const grey = '#C9C3D3';
  return (
    <svg viewBox="0 0 210 220" className={className} style={style} aria-hidden="true">
      <path d="M150 200 C 200 200, 205 150, 180 130" fill="none" stroke={INK} strokeWidth={20} strokeLinecap="round" />
      <path d="M150 200 C 200 200, 205 150, 180 130" fill="none" stroke={grey} strokeWidth={11} strokeLinecap="round" />
      <ellipse cx="105" cy="168" rx="58" ry="46" fill={grey} stroke={INK} strokeWidth={SW} />
      <path d="M58 60 L 56 16 L 90 40 Z M152 60 L 154 16 L 120 40 Z" fill={grey} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <ellipse cx="105" cy="82" rx="56" ry="48" fill={grey} stroke={INK} strokeWidth={SW} />
      {/* unimpressed eyes */}
      <circle cx="84" cy="82" r="11" fill="#fff" stroke={INK} strokeWidth={3.5} />
      <circle cx="126" cy="82" r="11" fill="#fff" stroke={INK} strokeWidth={3.5} />
      <rect x="72" y="70" width="24" height="10" fill={grey} />
      <rect x="114" y="70" width="24" height="10" fill={grey} />
      <path d="M72 80 h 24 M114 80 h 24" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <circle cx="84" cy="86" r="4" fill={INK} />
      <circle cx="126" cy="86" r="4" fill={INK} />
      <path d="M94 108 h 22" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <path d="M102 96 l 6 0 l -3 4 z" fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <path d="M54 96 l -24 -4 M54 104 l -24 4 M156 96 l 24 -4 M156 104 l 24 4" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      {/* slow clapping paws */}
      <motion.ellipse cx="88" cy="160" rx="17" ry="22" fill="#fff" stroke={INK} strokeWidth={4} animate={{ x: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }} />
      <motion.ellipse cx="122" cy="160" rx="17" ry="22" fill="#fff" stroke={INK} strokeWidth={4} animate={{ x: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }} />
      <motion.text x="150" y="150" fontFamily="Fredoka" fontWeight={700} fontSize="18" fill={INK} animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
        clap.
      </motion.text>
    </svg>
  );
}

// ----------------------------------------------------------------------------- props & doodles

export function ChickenSnack({ className, style }: SvgProps) {
  return (
    <svg viewBox="0 0 120 110" className={className} style={style} aria-hidden="true">
      <path d="M78 70 l 24 22" stroke={INK} strokeWidth={16} strokeLinecap="round" />
      <path d="M78 70 l 24 22" stroke="#fff" strokeWidth={8} strokeLinecap="round" />
      <circle cx="104" cy="90" r="8" fill="#fff" stroke={INK} strokeWidth={4} />
      <circle cx="96" cy="98" r="8" fill="#fff" stroke={INK} strokeWidth={4} />
      <path d="M20 40 C 20 10, 70 4, 84 34 C 96 58, 78 82, 54 80 C 30 78, 20 62, 20 40 Z" fill="#E8964A" stroke={INK} strokeWidth={SW} />
      <path d="M34 34 q 8 -10 20 -8 M40 56 q 10 6 22 0" stroke="#b86a2a" strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M30 26 q 6 -6 14 -6" stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.7} />
    </svg>
  );
}

export function TimeoutBox({ className, style, occupied = false }: SvgProps & { occupied?: boolean }) {
  return (
    <svg viewBox="0 0 230 170" className={className} style={style} aria-hidden="true">
      <path d="M14 50 L 40 14 L 112 30 Z" fill="#E2B27A" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M216 50 L 196 12 L 118 30 Z" fill="#E2B27A" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      {occupied && (
        <g>
          <ellipse cx="115" cy="54" rx="46" ry="34" fill="#FFA24C" stroke={INK} strokeWidth={SW} />
          <path d="M80 34 l -4 -26 l 22 14 z M150 34 l 4 -26 l -22 14 z" fill="#FFA24C" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <path d="M94 54 q 7 -7 14 0 M122 54 q 7 -7 14 0" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
          <path d="M108 66 q 4 5 7 0 q 4 5 7 0" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      )}
      <path d="M18 50 L 212 50 L 200 160 L 30 160 Z" fill="#D9A066" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M40 50 L 34 150" stroke="#b37a43" strokeWidth={3} />
      <rect x="54" y="82" width="122" height="40" rx="6" fill="#fff" stroke={INK} strokeWidth={4} transform="rotate(-3 115 102)" />
      <text x="115" y="111" textAnchor="middle" fontFamily="Fredoka" fontWeight={700} fontSize="26" fill={INK} transform="rotate(-3 115 102)">
        TIMEOUT
      </text>
    </svg>
  );
}

export function Folder({ className, style, label, glow }: SvgProps & { label: string; glow?: boolean }) {
  return (
    <svg viewBox="0 0 210 170" className={className} style={style} aria-hidden="true">
      <path d="M10 30 Q 10 18 22 18 L 78 18 L 94 34 L 188 34 Q 200 34 200 46 L 200 150 Q 200 162 188 162 L 22 162 Q 10 162 10 150 Z" fill={glow ? '#B8E6C5' : '#FFD76B'} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M10 60 L 200 60" stroke={INK} strokeWidth={4} />
      <text x="105" y="104" textAnchor="middle" fontFamily="Fredoka" fontWeight={700} fontSize="21" fill={INK}>
        {label.split(' ').slice(0, 1).join(' ')}
      </text>
      <text x="105" y="132" textAnchor="middle" fontFamily="Fredoka" fontWeight={700} fontSize="21" fill={INK}>
        {label.split(' ').slice(1).join(' ')}
      </text>
    </svg>
  );
}

export function Doodle({ kind, className, style }: SvgProps & { kind: 'star' | 'squiggle' | 'spark' | 'heart' }) {
  const paths: Record<string, React.ReactNode> = {
    star: <path d="M30 4 L 37 22 L 56 24 L 41 36 L 46 55 L 30 44 L 14 55 L 19 36 L 4 24 L 23 22 Z" fill="#FFD76B" stroke={INK} strokeWidth={4} strokeLinejoin="round" />,
    squiggle: <path d="M4 30 q 8 -20 16 0 t 16 0 t 16 0" fill="none" stroke="#BBA9F5" strokeWidth={6} strokeLinecap="round" />,
    spark: <path d="M30 4 L 34 26 L 56 30 L 34 34 L 30 56 L 26 34 L 4 30 L 26 26 Z" fill="#FF9DB9" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />,
    heart: <path d="M30 52 C 4 34, 6 10, 22 10 C 28 10, 30 16, 30 18 C 30 16, 32 10, 38 10 C 54 10, 56 34, 30 52 Z" fill="#F36B6B" stroke={INK} strokeWidth={4} />,
  };
  return (
    <svg viewBox="0 0 60 60" className={className} style={style} aria-hidden="true">
      {paths[kind]}
    </svg>
  );
}
