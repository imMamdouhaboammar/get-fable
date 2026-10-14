import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveAuditAsset(filename: string): string {
  const local = path.join(__dirname, filename);
  if (fs.existsSync(local)) return local;
  const inSrc = path.resolve(__dirname, '..', 'src', 'core', 'redteam', 'audit', filename);
  if (fs.existsSync(inSrc)) return inSrc;
  const fromCwd = path.resolve(process.cwd(), 'src', 'core', 'redteam', 'audit', filename);
  if (fs.existsSync(fromCwd)) return fromCwd;
  return local;
}

let findingsValidatorModule: any = { validateDocument: () => [] };
let coverageLedgerValidatorModule: any = { validateCoverageDocument: () => [] };
let reportSchema: any = {};

try {
  findingsValidatorModule = require(resolveAuditAsset('validate-findings.cjs'));
  coverageLedgerValidatorModule = require(resolveAuditAsset('validate-coverage-ledger.cjs'));
  reportSchema = require(resolveAuditAsset('report-schema.json'));
} catch {
  // Fail-soft fallback
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  totalChecked?: number;
}

/**
 * Validate findings array in-memory against report-schema.json and semantic rules.
 */
export function validateFindings(findings: unknown): ValidationResult {
  try {
    const errors: string[] = findingsValidatorModule.validateDocument(findings, reportSchema);
    return {
      valid: errors.length === 0,
      errors,
      totalChecked: Array.isArray(findings) ? findings.length : 0,
    };
  } catch (err) {
    return {
      valid: false,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

/**
 * Validate a findings.json file on disk.
 */
export function validateFindingsFile(filePath: string): ValidationResult {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, errors: [`File not found: ${filePath}`] };
    }
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return { valid: false, errors: [`Path is not a regular file: ${filePath}`] };
    }
    if (stat.size > 5 * 1024 * 1024) {
      return { valid: false, errors: [`File exceeds maximum allowed size (5 MiB): ${stat.size} bytes`] };
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return validateFindings(parsed);
  } catch (err) {
    return {
      valid: false,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

/**
 * Validate coverage-ledger array in-memory against schema and canonical ID rules.
 */
export function validateCoverageLedger(ledger: unknown): ValidationResult {
  try {
    const errors: string[] = coverageLedgerValidatorModule.validateDocument(ledger);
    return {
      valid: errors.length === 0,
      errors,
      totalChecked: Array.isArray(ledger) ? ledger.length : 0,
    };
  } catch (err) {
    return {
      valid: false,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

/**
 * Validate a coverage-ledger.json file on disk.
 */
export function validateCoverageLedgerFile(filePath: string): ValidationResult {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, errors: [`File not found: ${filePath}`] };
    }
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return { valid: false, errors: [`Path is not a regular file: ${filePath}`] };
    }
    if (stat.size > 5 * 1024 * 1024) {
      return { valid: false, errors: [`File exceeds maximum allowed size (5 MiB): ${stat.size} bytes`] };
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return validateCoverageLedger(parsed);
  } catch (err) {
    return {
      valid: false,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

/**
 * Compute the deterministic canonical coverage ID for a given tuple of refs.
 */
export function computeCanonicalCoverageId(refs: {
  surface: string;
  boundary: string;
  subsystem: string;
  attack_class: string;
  lifecycle?: string;
}): string {
  return coverageLedgerValidatorModule.canonicalCoverageId(refs);
}

export { reportSchema };
