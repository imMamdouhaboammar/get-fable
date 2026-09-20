import { relative, resolve } from "node:path";
import { reportPath, saveReport } from "../adapters/report-store.js";
import type { ReviewReport } from "../domain/types.js";
import type { Log } from "../review/workflow.js";

type Runner = (scope: string, log: Log) => Promise<ReviewReport>;

const printErr = (msg: string) => process.stderr.write(msg + "\n");
const printOut = (msg: string) => process.stdout.write(msg + "\n");

export const printReview = async (run: Runner): Promise<void> => {
  const scope = resolve(process.argv[2] ?? ".");
  const report = await run(scope, printErr);
  printOut(JSON.stringify(report, null, 2));
};

export const saveReview = async (run: Runner): Promise<void> => {
  const scope = resolve(process.argv[2] ?? ".");
  const out = reportPath();
  const outLabel = relative(process.cwd(), out) || out;

  try {
    const report = await run(scope, printErr);
    await saveReport(report, out);
    printErr("saved " + outLabel);
  } catch (error) {
    printErr(error instanceof Error ? error.message : String(error));
    printErr("review failed; " + outLabel + " unchanged");
    process.exit(1);
  }
};
