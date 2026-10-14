import {
  encode,
  decode,
  ToonDecodeError,
  DEFAULT_DELIMITER,
  type Delimiter,
} from '@toon-format/toon';
import type { FableState, EvidenceRecord } from './types.js';

export interface ToonEncodeOptions {
  delimiter?: Delimiter;
  indent?: number;
  replacer?: (key: string, value: unknown) => unknown;
}

export interface ToonDecodeOptions {
  strict?: boolean;
  delimiter?: Delimiter;
  indent?: number;
}

export interface ToonValidationResult {
  valid: boolean;
  error?: string;
  data?: unknown;
}

export interface ToonTokenComparison {
  jsonChars: number;
  toonChars: number;
  estimatedJsonTokens: number;
  estimatedToonTokens: number;
  savingsPercent: number;
}

export interface ToonDelegationContract {
  workerId: string;
  targetCard: string;
  objective: string;
  timeoutSec?: number;
  ownedPaths: string[];
  forbiddenPaths?: string[];
  acceptanceChecks: string[];
  rules?: string[];
}

export interface ToonMutationItem {
  path: string;
  action: 'created' | 'modified' | 'deleted' | string;
  byteSize?: number;
}

export interface ToonVerificationItem {
  command: string;
  result: 'pass' | 'fail';
  durationMs?: number;
}

export interface ToonReturnPacket {
  workerId: string;
  targetCard: string;
  status: 'complete' | 'failed' | 'blocked' | string;
  allChecksPassed: boolean;
  mutations: ToonMutationItem[];
  verifications: ToonVerificationItem[];
  findings?: string[];
  notes?: string[];
}

/**
 * Losslessly encode a JavaScript value into TOON format.
 */
export function encodeToon(data: unknown, options?: ToonEncodeOptions): string {
  return encode(data, options);
}

/**
 * Decode a TOON string back into a JavaScript value.
 * Strict by default to enforce [N] length counts and column structure.
 */
export function decodeToon<T = unknown>(toon: string, options?: ToonDecodeOptions): T {
  const strict = options?.strict ?? true;
  return decode(toon, { ...options, strict }) as T;
}

/**
 * Validate a TOON string with strict length and structure checking.
 */
export function validateToon(toon: string, options?: ToonDecodeOptions): ToonValidationResult {
  try {
    const data = decodeToon(toon, { ...options, strict: true });
    return { valid: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, error: message };
  }
}

/**
 * Estimate token count using a standard character + token-boundary heuristic.
 * Roughly ~3.8 to 4 chars per token for typical code/JSON.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Count words, symbols, and punctuation chunks
  const tokens = text.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]+|\s+/gu);
  return tokens ? Math.ceil(tokens.length * 0.85) : Math.ceil(text.length / 4);
}

/**
 * Compare token efficiency between JSON and TOON representation of data.
 */
export function compareTokens(data: unknown, delimiter: Delimiter = DEFAULT_DELIMITER): ToonTokenComparison {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
  const toonStr = encodeToon(parsedData, { delimiter });

  const jsonChars = jsonStr.length;
  const toonChars = toonStr.length;
  const estimatedJsonTokens = estimateTokens(jsonStr);
  const estimatedToonTokens = estimateTokens(toonStr);

  const savingsTokens = Math.max(0, estimatedJsonTokens - estimatedToonTokens);
  const savingsPercent = estimatedJsonTokens > 0
    ? Number(((savingsTokens / estimatedJsonTokens) * 100).toFixed(1))
    : 0;

  return {
    jsonChars,
    toonChars,
    estimatedJsonTokens,
    estimatedToonTokens,
    savingsPercent,
  };
}

/**
 * Extract code fences marked with ```toon from any markdown string.
 */
export function extractToonFences(markdown: string): string[] {
  const regex = /```(?:toon|TOON)\r?\n([\s\S]*?)```/g;
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

/**
 * Format FableState into a high-density TOON representation.
 * Collapses evidence records into tabular rows where keys are declared once.
 */
export function compactFableStateToon(state: FableState | null): string {
  if (!state) {
    return 'state: none';
  }

  const payload: Record<string, unknown> = {
    workspaceId: state.workspaceId,
    phase: state.phase,
    skill: state.currentSkill ?? 'none',
    streak: state.failureStreak,
    substantial: state.substantial,
    mutGen: state.mutationGeneration,
    verGen: state.verifiedGeneration,
  };

  if (state.activeCard) {
    payload.activeCard = state.activeCard;
  }

  if (state.lastDecision) {
    payload.decision = {
      skill: state.lastDecision.selectedSkill,
      pack: state.lastDecision.selectedPack,
      task: state.lastDecision.taskShape,
      conf: state.lastDecision.confidence,
      gates: state.lastDecision.requiredGates,
    };
  }

  if (state.evidence && state.evidence.length > 0) {
    payload.evidence = state.evidence.map((ev: EvidenceRecord) => ({
      kind: ev.kind,
      source: ev.source,
      result: ev.result,
      gen: ev.generation,
      detail: ev.detail,
    }));
  }

  return encodeToon(payload);
}

/**
 * Encode a structured subagent delegation contract into TOON.
 */
export function encodeDelegationContract(contract: ToonDelegationContract): string {
  const payload: Record<string, unknown> = {
    contract: {
      workerId: contract.workerId,
      targetCard: contract.targetCard,
      objective: contract.objective,
      ...(contract.timeoutSec !== undefined ? { timeoutSec: contract.timeoutSec } : {}),
    },
    ownedPaths: contract.ownedPaths,
    acceptanceChecks: contract.acceptanceChecks,
  };

  if (contract.forbiddenPaths && contract.forbiddenPaths.length > 0) {
    payload.forbiddenPaths = contract.forbiddenPaths;
  }

  if (contract.rules && contract.rules.length > 0) {
    payload.rules = contract.rules;
  }

  return encodeToon(payload);
}

/**
 * Decode a TOON delegation contract with strict validation.
 */
export function decodeDelegationContract(text: string): ToonDelegationContract {
  // If wrapped in ```toon fences, extract first fence
  const fences = extractToonFences(text);
  const raw = fences.length > 0 ? fences[0] : text.trim();

  const data = decodeToon<any>(raw, { strict: true });
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid delegation contract: root must be an object');
  }

  const contractInfo = data.contract;
  if (!contractInfo || typeof contractInfo !== 'object') {
    throw new Error('Invalid delegation contract: missing "contract" block');
  }

  return {
    workerId: String(contractInfo.workerId || ''),
    targetCard: String(contractInfo.targetCard || ''),
    objective: String(contractInfo.objective || ''),
    timeoutSec: typeof contractInfo.timeoutSec === 'number' ? contractInfo.timeoutSec : undefined,
    ownedPaths: Array.isArray(data.ownedPaths) ? data.ownedPaths.map(String) : [],
    forbiddenPaths: Array.isArray(data.forbiddenPaths) ? data.forbiddenPaths.map(String) : undefined,
    acceptanceChecks: Array.isArray(data.acceptanceChecks) ? data.acceptanceChecks.map(String) : [],
    rules: Array.isArray(data.rules) ? data.rules.map(String) : undefined,
  };
}

/**
 * Encode a subagent worker return packet into TOON.
 */
export function encodeReturnPacket(packet: ToonReturnPacket): string {
  const payload: Record<string, unknown> = {
    result: {
      workerId: packet.workerId,
      targetCard: packet.targetCard,
      status: packet.status,
      allChecksPassed: packet.allChecksPassed,
    },
    mutations: packet.mutations,
    verifications: packet.verifications,
  };

  if (packet.findings && packet.findings.length > 0) {
    payload.findings = packet.findings;
  }

  if (packet.notes && packet.notes.length > 0) {
    payload.notes = packet.notes;
  }

  return encodeToon(payload);
}

/**
 * Decode a subagent worker return packet with strict validation.
 */
export function decodeReturnPacket(text: string): ToonReturnPacket {
  const fences = extractToonFences(text);
  const raw = fences.length > 0 ? fences[0] : text.trim();

  const data = decodeToon<any>(raw, { strict: true });
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid return packet: root must be an object');
  }

  const resultInfo = data.result;
  if (!resultInfo || typeof resultInfo !== 'object') {
    throw new Error('Invalid return packet: missing "result" header block');
  }

  return {
    workerId: String(resultInfo.workerId || ''),
    targetCard: String(resultInfo.targetCard || ''),
    status: String(resultInfo.status || 'failed'),
    allChecksPassed: Boolean(resultInfo.allChecksPassed),
    mutations: Array.isArray(data.mutations) ? data.mutations : [],
    verifications: Array.isArray(data.verifications) ? data.verifications : [],
    findings: Array.isArray(data.findings) ? data.findings.map(String) : undefined,
    notes: Array.isArray(data.notes) ? data.notes.map(String) : undefined,
  };
}

export { ToonDecodeError };
