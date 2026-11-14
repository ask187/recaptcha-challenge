import { openDb } from '../db.ts';
import { seedDemo } from './demo.ts';

const db = openDb(process.env.BBS_DB ?? 'backend/data/bbs.sqlite');
console.log(seedDemo(db, Number(process.argv[2] ?? 40)), '(rows are flagged is_demo = 1)');
