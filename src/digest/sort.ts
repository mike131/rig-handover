import type { DigestRow } from './types.js';

// The one row order for the digest page and its JSON (plan § 2b: they must never disagree).
export function byJob(rows: readonly DigestRow[]): DigestRow[] {
  return [...rows].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
}
