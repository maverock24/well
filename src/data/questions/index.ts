import dr from './01-getting-to-know.json';
import rd from './02-deep-relationship.json';
import ft from './03-friendship-trust.json';
import si from './04-self-inquiry.json';
import wk from './05-work-career.json';
import ng from './06-negotiation-money.json';
import lc from './07-leadership-conflict.json';
import em from './08-ethics-meaning.json';
import type { BankId, Question } from '@/types';

const stamp = (rows: unknown, bank: BankId): Question[] =>
  (rows as Question[]).map((q) => ({ ...q, bank }));

/**
 * All seed questions, bundled at build time. Each question is stamped
 * with the `bank` it came from — presets use that to gate which
 * questions are appropriate to surface (a "Job Interview" preset must
 * not pull intimate questions from the relationship bank just because
 * they happen to share a theme like `identity` or `regret`).
 */
export const SEED_QUESTIONS: Question[] = [
  ...stamp(dr, 'getting-to-know'),
  ...stamp(rd, 'deep-relationship'),
  ...stamp(ft, 'friendship-trust'),
  ...stamp(si, 'self-inquiry'),
  ...stamp(wk, 'work-career'),
  ...stamp(ng, 'negotiation-money'),
  ...stamp(lc, 'leadership-conflict'),
  ...stamp(em, 'ethics-meaning'),
];
