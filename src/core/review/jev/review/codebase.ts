import { repositoryFiles } from "../adapters/repository-files.js";
import { TEST_FILE } from "../domain/config.js";
import type { ReviewReport } from "../domain/types.js";
import {
  locateSourceSignal,
  profileSourceFile,
  screenSourceFile,
} from "./codebase-judgments.js";
import { type Log, runReview } from "./workflow.js";

export function runCodebaseReview(scope: string, log: Log): Promise<ReviewReport> {
  return runReview(scope, log, {
    mode: "codebase",
    subject: "codebase source",
    context: "repository test",
    discover: (target) => {
      const repository = repositoryFiles(target);
      const contextFiles = repository.filter((file) => TEST_FILE.test(file.path));
      return {
        files: repository.filter((file) => !TEST_FILE.test(file.path)),
        contextFiles,
      };
    },
    screen: screenSourceFile,
    profile: profileSourceFile,
    locate: locateSourceSignal,
  });
}
