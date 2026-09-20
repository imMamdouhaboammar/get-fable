import { choice, noul, score, TypeSafeClient } from "../../../reflex/client.js";
import {
  BLOCKING_SEVERITY,
  type Dimension,
  dimensions,
  mechanisms,
  MIN_LOCATION_CONFIDENCE,
  owners,
  reviewPriorityRubric,
  ROUTE_SEVERITY,
  severityRubric,
} from "../domain/config.js";
import { parseHunks } from "../domain/patch.js";
import type {
  ChangedFile,
  FileProfile,
  Finding,
  Screening,
  Signal,
} from "../domain/types.js";

const client = new TypeSafeClient();

const changeTypes = {
  behavior: "Adds or changes runtime behavior",
  interface: "Changes an exported API, type, protocol, or data shape",
  infrastructure: "Changes execution, scheduling, build, or operational plumbing",
  observability: "Changes events, logging, monitoring, or diagnostics",
  refactor: "Restructures implementation without intending behavior changes",
  routine: "A small routine change that fits none of the other categories",
};

function requireNoul(answers: Record<string, any> | undefined, question: string): number {
  const val = answers?.[question]?.noul;
  if (typeof val !== "number" || !Number.isFinite(val)) {
    throw new Error(`Screening answer "${question}" is missing or non-numeric`);
  }
  return val;
}

function requireChoice(answers: Record<string, any> | undefined, question: string): { choice: string; confidence: number } {
  const ans = answers?.[question];
  if (!ans || typeof ans.choice !== "string") {
    throw new Error(`Judgment answer "${question}" is missing choice`);
  }
  return { choice: ans.choice, confidence: typeof ans.confidence === "number" ? ans.confidence : 1.0 };
}

function requireScore(answers: Record<string, any> | undefined, question: string): { score: number; confidence: number } {
  const ans = answers?.[question];
  if (!ans || typeof ans.score !== "number" || !Number.isFinite(ans.score)) {
    throw new Error(`Judgment answer "${question}" is missing score`);
  }
  return { score: ans.score, confidence: typeof ans.confidence === "number" ? ans.confidence : 1.0 };
}

export async function screenFile(
  file: ChangedFile,
  changedTests: ChangedFile[],
): Promise<Screening<ChangedFile>> {
  const response = await client.systemOne({
    state: { file, changedTests },
    questions: {
      correctness: noul(
        {
          question: "Does file.patch directly support that this change likely introduces incorrect runtime behavior?",
          inspect: "file.patch",
          focus: "Concrete behavior, state, data-flow, or async errors introduced by added or modified lines",
          ignore: ["Style preferences", "Naming concerns", "Unsupported speculation"],
        },
        {
          true: {
            what: "A changed line introduces a logic, syntax, data-flow, async, or reference error",
            examples: ["Off-by-one loop bound", "Unhandled null or undefined value", "Race condition"],
          },
          false: { what: "The patch is consistent, intentional, and does not exhibit clear logic flaws" },
        },
      ),
      security: noul(
        {
          question: "Does file.patch directly support that this change introduces a security risk or trust boundary violation?",
          inspect: "file.patch",
          focus: "Injection, unsafe inputs, privilege escalations, or unintended exposure",
        },
        {
          true: {
            what: "A changed path handles untrusted data unsafely or expands attacker reach",
            examples: ["Unsanitized SQL or command construction", "Missing authorization check"],
          },
          false: { what: "The change operates within established security boundaries" },
        },
      ),
      reliability: noul(
        {
          question: "Does file.patch directly support that this change risks process stability, unhandled exceptions, or resource leaks?",
          inspect: "file.patch",
          focus: "Resource lifecycle, unhandled rejection paths, timeouts, and invariants",
        },
        {
          true: {
            what: "A changed path can lose work, leak resources, hang, crash, or leave inconsistent state",
            examples: ["Cleanup is skipped after failure", "Concurrent work updates shared state unsafely"],
          },
          false: { what: "The patch preserves safe lifecycle and failure handling" },
        },
      ),
      compatibility: noul(
        {
          question: "Does file.patch directly support that this change can break an existing caller, format, protocol, or public behavior?",
          inspect: "file.patch",
          focus: "Externally observed contracts rather than internal implementation details",
        },
        {
          true: {
            what: "An existing consumer can fail because a contract changed without a safe migration",
            examples: ["A required field is removed", "A persisted value changes meaning"],
          },
          false: { what: "The changed contract remains compatible or is entirely internal" },
        },
      ),
      testGap: noul(
        {
          question: "Does file.patch change important behavior without adequate targeted evidence in changedTests?",
          compare: ["file.patch", "changedTests"],
          focus: "New branches, boundaries, failure paths, and component interactions",
        },
        {
          true: {
            what: "Important changed behavior has no targeted changed test",
            examples: ["A new failure branch has no assertion", "A protocol change lacks a compatibility test"],
          },
          false: {
            what: "Changed tests exercise the important behavior, or the patch is non-behavioral",
            examples: ["A focused regression test covers the branch", "Documentation-only change"],
          },
        },
      ),
    },
  });

  return {
    file,
    probabilities: {
      correctness: requireNoul(response.answers, "correctness"),
      security: requireNoul(response.answers, "security"),
      reliability: requireNoul(response.answers, "reliability"),
      compatibility: requireNoul(response.answers, "compatibility"),
      testGap: requireNoul(response.answers, "testGap"),
    },
  };
}

export async function profileFile(
  file: ChangedFile,
  screeningProbabilities: Record<Dimension, number>,
): Promise<FileProfile> {
  const response = await client.systemOne({
    state: { file, screeningProbabilities },
    questions: {
      category: choice(
        { question: "Which category best describes file.patch?", focus: "Primary purpose of the change" },
        changeTypes,
      ),
      reviewPriority: score(
        "Rate how closely a human should review file.patch, considering the code and screeningProbabilities.",
        [...reviewPriorityRubric],
      ),
    },
  });

  const cat = requireChoice(response.answers, "category");
  const prio = requireScore(response.answers, "reviewPriority");

  return {
    file: file.path,
    category: cat.choice as any,
    categoryConfidence: cat.confidence,
    reviewPriority: prio.score,
    reviewPriorityConfidence: prio.confidence,
  };
}

export async function locateSignal(
  signal: Signal<ChangedFile>,
): Promise<Finding<ChangedFile> | null> {
  const hunks = parseHunks(signal.file.patch);
  if (hunks.length === 0) return null;

  const suspectedConcern = {
    dimension: signal.dimension,
    definition: dimensions[signal.dimension],
  };
  const location = await client.systemOne({
    state: {
      file: signal.file.path,
      suspectedConcern: { ...suspectedConcern, screeningProbability: signal.probability },
      candidateHunks: hunks,
    },
    questions: {
      evidence: choice(
        {
          question: "Which candidate hunk provides the strongest direct evidence for suspectedConcern?",
          fallback: "Select noMatch when no hunk provides sufficient evidence",
        },
        {
          ...Object.fromEntries(
            hunks.map((hunk) => [hunk.id, "Candidate beginning at changed-file line " + hunk.startLine]),
          ),
          noMatch: "No candidate hunk directly supports the suspected concern",
        },
      ),
    },
  });

  const selected = location.answers?.evidence;
  if (!selected || typeof selected.choice !== "string" || selected.choice === "noMatch" || (selected.confidence ?? 0) < MIN_LOCATION_CONFIDENCE) return null;
  const hunk = hunks.find((candidate) => candidate.id === selected.choice);
  if (!hunk) return null;

  const classification = await client.systemOne({
    state: { file: signal.file.path, suspectedConcern, selectedEvidence: hunk },
    questions: {
      mechanism: choice(
        "Which mechanism best describes the suspected concern supported by selectedEvidence?",
        mechanisms[signal.dimension],
      ),
    },
  });
  const mechanism = classification.answers?.mechanism;
  if (!mechanism || typeof mechanism.choice !== "string" || mechanism.choice === "noIssue") return null;

  const impact = await client.systemOne({
    state: { file: signal.file.path, suspectedConcern, selectedEvidence: hunk },
    questions: {
      severity: score(
        "Assuming selectedEvidence exhibits suspectedConcern, rate the likely production impact.",
        [...severityRubric],
      ),
    },
  });

  const severity = impact.answers?.severity;
  if (!severity || typeof severity.score !== "number" || !Number.isFinite(severity.score)) return null;

  let owner: string | null = null;
  let ownerConfidence: number | null = null;
  if (severity.score >= ROUTE_SEVERITY) {
    const routing = await client.systemOne({
      state: {
        file: signal.file.path,
        concern: {
          dimension: signal.dimension,
          mechanism: mechanism.choice,
          severity: severity.score,
        },
        selectedEvidence: hunk,
      },
      questions: {
        owner: choice("Which reviewer is best suited to investigate this concern?", owners),
      },
    });
    owner = routing.answers?.owner?.choice ?? null;
    ownerConfidence = routing.answers?.owner?.confidence ?? null;
  }

  return {
    ...signal,
    line: hunk.startLine,
    locationConfidence: selected.confidence ?? 1.0,
    mechanism: mechanism.choice,
    mechanismConfidence: mechanism.confidence ?? 1.0,
    severity: severity.score,
    severityConfidence: severity.confidence ?? 1.0,
    owner,
    ownerConfidence,
    action: severity.score >= BLOCKING_SEVERITY ? "request_changes" : "comment",
  };
}
