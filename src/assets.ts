import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';

/**
 * Derives the same safe numeric identity in Vite and isolated Node workers.
 * Canonical paths keep symlinked imports equal without conflating file contents.
 */
export function getAssetId(filename: string): number {
  const hash = createHash('sha256').update(realpathSync(filename)).digest('hex');

  return Number.parseInt(hash.slice(0, 13), 16) + 1;
}
