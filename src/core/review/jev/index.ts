// Jev Review: Automated code and diff review powered by TypeSafe Jev
import { runChangeReview } from './review/changes.js';
import { runCodebaseReview } from './review/codebase.js';
import type { ReviewReport } from './domain/types.js';

export * from './domain/types.js';
export * from './domain/config.js';
export * from './domain/patch.js';
export * from './adapters/git.js';
export * from './adapters/repository-files.js';
export * from './adapters/report-store.js';
export * from './review/changes.js';
export * from './review/codebase.js';
export * from './dashboard/server.js';

export async function reviewChanges(scope: string = process.cwd(), log?: (msg: string) => void): Promise<ReviewReport> {
  return runChangeReview(scope, log || (() => {}));
}

export async function reviewCodebase(scope: string = process.cwd(), log?: (msg: string) => void): Promise<ReviewReport> {
  return runCodebaseReview(scope, log || (() => {}));
}
