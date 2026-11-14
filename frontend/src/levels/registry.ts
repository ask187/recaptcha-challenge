import { lazy, type ComponentType } from 'react';
import type { LevelConfig, LevelId } from '../../../shared/types';
import type { LevelMeta, LevelProps } from './types';
import KarateCat from './KarateCat/KarateCat';
import CorporateBurnout from './CorporateBurnout/CorporateBurnout';
import Gaslighting from './Gaslighting/Gaslighting';

const LastBrainCell = lazy(() => import('./LastBrainCell/LastBrainCell'));

/** Add / remove / reorder levels here (and in LEVEL_ORDER + the server generator). */
export const LEVELS: Record<LevelId, LevelMeta & { component: ComponentType<LevelProps<any>> }> = {
  'karate-cat': {
    id: 'karate-cat',
    name: 'Bro Is NOT the Main Character',
    pass: 'Bro got humbled by a cardboard box.',
    decoyFail: 'YOU FOUGHT A CAT. SEEK HELP.',
    wrongFail: 'The cat has filed a complaint.',
    component: KarateCat,
  },
  'corporate-burnout': {
    id: 'corporate-burnout',
    name: 'Corporate Burnout Simulator',
    pass: 'Work-life balance detected. Suspiciously human.',
    decoyFail: "Congratulations. You've scheduled a meeting that could've been an email.",
    wrongFail: 'You filed the wrong thing. HR has been notified.',
    component: CorporateBurnout,
  },
  gaslighting: {
    id: 'gaslighting',
    name: 'The CAPTCHA Is Gaslighting You',
    pass: "Correct. You can't be gaslit. Therapy is working.",
    decoyFail: 'The website gaslit you, and you apologized to it.',
    wrongFail: 'The website gaslit you, and you apologized to it.',
    component: Gaslighting,
  },
  'last-brain-cell': {
    id: 'last-brain-cell',
    name: 'The Last Brain Cell',
    pass: 'Congratulations. Your single remaining brain cell has been recovered.',
    decoyFail: "There's no auto-verify button. It's one brain cell, not a startup.",
    wrongFail: 'Even your last brain cell gave up.',
    component: LastBrainCell,
  },
};

export const FAIL_LINES = [
  'That was embarrassing.',
  'The cat has filed a complaint.',
  'The website won the argument.',
  "You've been promoted to unpaid intern.",
  'Even your last brain cell gave up.',
  'Skill issue. Respectfully.',
];

export type AnyLevelConfig = LevelConfig;
