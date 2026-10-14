import { changedFiles } from "../adapters/git.js";
import { TEST_FILE } from "../domain/config.js";
import type { ReviewReport } from "../domain/types.js";
import { locateSignal, profileFile, screenFile } from "./judgments.js";
import { type Log, runReview } from "./workflow.js";

export function runChangeReview(scope: string, log: Log): Promise<ReviewReport> {
  return runReview(scope, log, {
    mode: "changes",
    subject: "changed source",
    context: "changed test",
    discover: (target) => {
      const changed = changedFiles(target);
      const contextFiles = changed.filter((file) => TEST_FILE.test(file.path));
      return {
        files: changed.filter((file) => !TEST_FILE.test(file.path)),
        contextFiles,
      };
    },
    screen: screenFile,
    profile: profileFile,
    locate: locateSignal,
  });
}
