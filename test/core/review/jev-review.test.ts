import { describe, expect, it } from 'bun:test';
import { parseHunks } from '../../../src/core/review/jev/domain/patch.js';
import { isReviewReport, type ReviewReport } from '../../../src/core/review/jev/domain/types.js';
import { dimensionMetadata } from '../../../src/core/review/jev/domain/config.js';

describe('Jev Review Subsystem', () => {
  it('parses git diff hunks correctly', () => {
    const diff = `@@ -1,5 +1,6 @@
 import { foo } from './bar';
-const x = 1;
+const x = 2;
+const y = 3;
 export default x;`;

    const hunks = parseHunks(diff);
    expect(hunks.length).toBe(1);
    expect(hunks[0].startLine).toBe(1);
    expect(hunks[0].patch).toContain('const x = 2;');
  });

  it('validates review report structure with isReviewReport', () => {
    const mockReport: ReviewReport = {
      mode: 'changes',
      scope: 'HEAD',
      dimensions: dimensionMetadata,
      config: {
        screenThreshold: 0.7,
        severityMax: 3,
        maxFollowUps: 8,
        maxProfiles: 5,
      },
      screenedFiles: 2,
      contextFiles: ['test/app.test.ts'],
      matrix: [
        {
          file: 'src/app.ts',
          correctness: 0.1,
          security: 0.05,
          reliability: 0.1,
          compatibility: 0.0,
          testGap: 0.2,
        },
      ],
      followedSignals: 0,
      profiles: [],
      workflow: {
        screenedCells: 5,
        thresholdSignals: 0,
        profiledFiles: 1,
        followedSignals: 0,
        locatedFindings: 0,
        routedFindings: 0,
      },
      findings: [],
    };

    expect(isReviewReport(mockReport)).toBe(true);
    expect(isReviewReport({ foo: 'bar' })).toBe(false);
  });
});
