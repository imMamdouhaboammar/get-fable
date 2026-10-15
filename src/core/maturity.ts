import fs from 'node:fs';
import { createPublicKey, verify as verifySignature } from 'node:crypto';
import path from 'node:path';
import { getCoreRepoRoot, getSkillEntry, loadSkillRegistry } from './skill-registry.js';
import { getSkillManifestPath, validateSkillPackage } from './skill-package.js';
import { loadFrozenRoutingHoldoutEvidence, loadFrozenSparkHoldoutEvidence, runEnterpriseRoutingBenchmark, runEnterpriseSparkBenchmark, runSkillKnownCases, runSparkBenchmark } from './eval-runner.js';
import { routeTask } from './task-router.js';
import { loadFrozenVerificationHoldoutEvidence, runEnterpriseVerificationBenchmark } from './verification-eval.js';
import { buildEnterpriseAgentBehaviorEvalPlan, loadAgentBehaviorEvidenceSnapshot, validateAgentBehaviorEvidenceSnapshot, type AgentBehaviorEvalResult } from './agent-behavior-eval.js';
import type { FableSkillId } from './types.js';

export type SkillMaturity = 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5';
export type EvidenceStatus = 'PASS' | 'FAIL' | 'NOT_CHECKED';
export type CertificationReadiness = 'PASS' | 'FAIL';
export type ExternalCertificationStatus = 'VERIFIED' | 'PENDING' | 'REJECTED';

export interface ExternalCertificate {
  schemaVersion: number;
  target: string;
  auditor: string;
  attestationHash: string;
  issuedAt: string;
  expiresAt: string;
  signature: string;
  reportUri?: string;
}

export interface EnterpriseCertificationStatus {
  readiness: CertificationReadiness;
  externalCertification: ExternalCertificationStatus;
  enterpriseGatesPassed: boolean;
  gates: {
    behavioralReliability: boolean;
    orchestrationCorrectness: boolean;
    securityAuthorization: boolean;
    evidenceIntegrity: boolean;
    operationalReliability: boolean;
    integrationAssurance: boolean;
    enterpriseAudit: boolean;
    externalAuditSigned: boolean;
  };
  details: string[];
  certificatePath?: string;
}

export interface EnterpriseGateOptions {
  behavioralReliability: boolean;
  orchestrationCorrectness: boolean;
  securityAuthorization: boolean;
  evidenceIntegrity: boolean;
  operationalReliability: boolean;
  integrationAssurance: boolean;
  enterpriseAudit: boolean;
  externalCertificate?: unknown;
  expectedTarget?: string;
  trustedAuditors?: string[];
  trustedAuditorPublicKeys?: Record<string, string>;
  expectedAttestationHash?: string;
}

export interface MaturityInputs {
  sourceAvailable: boolean;
  structured: boolean;
  contractValid: boolean;
  runtimeIntegrated: boolean;
  knownCases: number; knownPassRate: number;
  negativeCases: number; negativePassRate: number;
  ambiguousCases: number; ambiguousPassRate: number;
  adversarialCases: number; adversarialPassRate: number;
  holdoutCases: number; holdoutPassRate: number;
  enterpriseGatesPassed: boolean;
}

export interface EvidenceSlice {
  status: EvidenceStatus;
  total: number;
  passed: number;
  passRate: number | null;
}

export interface SkillMaturityEvidence {
  id: FableSkillId;
  maturity: SkillMaturity;
  sourceAvailable: boolean;
  structured: boolean;
  packageValid: boolean;
  runtimeIntegrated: boolean;
  behaviorallyProven: boolean;
  enterpriseReady: boolean;
  behavior: {
    known: EvidenceSlice;
    negative: EvidenceSlice;
    ambiguous: EvidenceSlice;
    adversarial: EvidenceSlice;
    holdout: EvidenceSlice;
  };
  certificationReadiness?: CertificationReadiness;
  externalCertification?: ExternalCertificationStatus;
  enterpriseCertification?: EnterpriseCertificationStatus;
}

function slice(total: number, passed: number, threshold: number = 1): EvidenceSlice {
  return total === 0
    ? { status: 'NOT_CHECKED', total, passed, passRate: null }
    : { status: passed / total >= threshold ? 'PASS' : 'FAIL', total, passed, passRate: passed / total };
}

/** A certificate is only meaningful when the signed payload is bound to independently verified evidence. */
export function externalCertificateSignedPayload(cert: ExternalCertificate): Buffer {
  return Buffer.from(JSON.stringify({
    schemaVersion: cert.schemaVersion,
    target: cert.target,
    auditor: cert.auditor,
    attestationHash: cert.attestationHash,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    ...(cert.reportUri !== undefined ? { reportUri: cert.reportUri } : {}),
  }), 'utf8');
}

export function verifyExternalCertificate(
  cert: unknown,
  options: {
    expectedTarget: string;
    trustedAuditors?: string[];
    trustedAuditorPublicKeys?: Record<string, string>;
    expectedAttestationHash?: string;
  }
): { valid: boolean; status: ExternalCertificationStatus; reason?: string } {
  const reject = (reason: string) => ({ valid: false, status: 'REJECTED' as const, reason });
  if (!cert || typeof cert !== 'object' || Array.isArray(cert)) return reject('Invalid certificate object');
  const data = cert as Record<string, unknown>;
  if (data.schemaVersion !== 1) return reject('Unsupported certificate schema');
  if (data.target !== options.expectedTarget) return reject('Certificate target mismatch');
  if (typeof data.auditor !== 'string' || !data.auditor.trim()) return reject('Missing auditor identifier');
  if (options.trustedAuditors && !options.trustedAuditors.includes(data.auditor)) {
    return reject('Untrusted auditor');
  }
  const trustedKey = options.trustedAuditorPublicKeys?.[data.auditor];
  if (typeof trustedKey !== 'string' || !trustedKey.trim()) {
    return reject('Missing trusted auditor public key');
  }
  if (typeof data.attestationHash !== 'string' || !/^[0-9a-f]{64}$/i.test(data.attestationHash)) {
    return reject('Invalid SHA-256 attestation hash');
  }
  if (!options.expectedAttestationHash || data.attestationHash !== options.expectedAttestationHash) {
    return reject('Certificate is not bound to the expected independently verified attestation hash');
  }
  const issuedAt = typeof data.issuedAt === 'string' ? Date.parse(data.issuedAt) : NaN;
  const expiresAt = typeof data.expiresAt === 'string' ? Date.parse(data.expiresAt) : NaN;
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) return reject('Invalid certificate dates');
  if (issuedAt > Date.now() || expiresAt <= issuedAt || expiresAt <= Date.now()) {
    return reject('Certificate expired or is not yet valid');
  }
  if (data.reportUri !== undefined && typeof data.reportUri !== 'string') {
    return reject('Invalid report URI');
  }
  if (typeof data.signature !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data.signature) || !data.signature) {
    return reject('Invalid signature encoding');
  }
  try {
    const key = createPublicKey(trustedKey);
    if (key.asymmetricKeyType !== 'ed25519' && key.asymmetricKeyType !== 'rsa') {
      return reject('Unsupported trusted key algorithm');
    }
    const algorithm = key.asymmetricKeyType === 'ed25519' ? null : 'sha256';
    const payload = externalCertificateSignedPayload(data as unknown as ExternalCertificate);
    const signature = Buffer.from(data.signature, 'base64');
    if (!verifySignature(algorithm, payload, key, signature)) return reject('Invalid certificate signature');
  } catch {
    return reject('Certificate signature or trust key cannot be verified');
  }
  return { valid: true, status: 'VERIFIED' };
}

export function evaluateEnterpriseCertificationGates(options: EnterpriseGateOptions): EnterpriseCertificationStatus {
  const details: string[] = [];

  const behavioralReliability = Boolean(options.behavioralReliability);
  const orchestrationCorrectness = Boolean(options.orchestrationCorrectness);
  const securityAuthorization = Boolean(options.securityAuthorization);
  const evidenceIntegrity = Boolean(options.evidenceIntegrity);
  const operationalReliability = Boolean(options.operationalReliability);
  const integrationAssurance = Boolean(options.integrationAssurance);
  const enterpriseAudit = Boolean(options.enterpriseAudit);

  if (behavioralReliability) details.push('Pillar 1: Behavioral reliability verified (>=90%/95% across all categories)');
  else details.push('Pillar 1: Behavioral reliability NOT satisfied');

  if (orchestrationCorrectness) details.push('Pillar 2: Orchestration correctness verified (Delegation Laws & TOON contracts)');
  else details.push('Pillar 2: Orchestration correctness NOT satisfied');

  if (securityAuthorization) details.push('Pillar 3: Security & authorization verified (least privilege, CIDR boundary)');
  else details.push('Pillar 3: Security & authorization NOT satisfied');

  if (evidenceIntegrity) details.push('Pillar 4: Evidence integrity verified (hash-bound runner and holdout provenance)');
  else details.push('Pillar 4: Evidence integrity NOT satisfied');

  if (operationalReliability) details.push('Pillar 5: Operational reliability verified (atomic state locks & recovery)');
  else details.push('Pillar 5: Operational reliability NOT satisfied');

  if (integrationAssurance) details.push('Pillar 6: Integration assurance verified (32-host parity & packaging)');
  else details.push('Pillar 6: Integration assurance NOT satisfied');

  if (enterpriseAudit) details.push('Pillar 7: Enterprise audit verified (machine-readable JSON & SARIF reports)');
  else details.push('Pillar 7: Enterprise audit NOT satisfied');

  const readiness: CertificationReadiness =
    behavioralReliability &&
    orchestrationCorrectness &&
    securityAuthorization &&
    evidenceIntegrity &&
    operationalReliability &&
    integrationAssurance &&
    enterpriseAudit
      ? 'PASS'
      : 'FAIL';

  let externalCertification: ExternalCertificationStatus = 'PENDING';
  let externalAuditSigned = false;

  if (options.externalCertificate) {
    const certCheck = verifyExternalCertificate(options.externalCertificate, {
      expectedTarget: options.expectedTarget || 'get-fable',
      trustedAuditors: options.trustedAuditors,
      trustedAuditorPublicKeys: options.trustedAuditorPublicKeys,
      expectedAttestationHash: options.expectedAttestationHash,
    });
    externalCertification = certCheck.status;
    externalAuditSigned = certCheck.valid;
    if (certCheck.valid) {
      details.push('Pillar 8: External certification audit signed and verified');
    } else {
      details.push(`Pillar 8: External certificate rejected: ${certCheck.reason}`);
    }
  } else {
    details.push('Pillar 8: External certification audit is pending (independent certification not yet submitted)');
  }

  const enterpriseGatesPassed = readiness === 'PASS' && externalAuditSigned === true;

  return {
    readiness,
    externalCertification,
    enterpriseGatesPassed,
    gates: {
      behavioralReliability,
      orchestrationCorrectness,
      securityAuthorization,
      evidenceIntegrity,
      operationalReliability,
      integrationAssurance,
      enterpriseAudit,
      externalAuditSigned,
    },
    details,
  };
}

export function computeEvidenceBackedMaturity(input: MaturityInputs): SkillMaturity {
  if (!input.sourceAvailable) return 'M0';
  if (!input.structured) return 'M0';
  if (!input.contractValid) return 'M1';
  if (!input.runtimeIntegrated) return 'M2';
  const behaviorReady =
    input.knownCases > 0 && input.knownPassRate >= 0.9 &&
    input.negativeCases > 0 && input.negativePassRate >= 0.95 &&
    input.ambiguousCases > 0 && input.ambiguousPassRate >= 0.9 &&
    input.adversarialCases > 0 && input.adversarialPassRate >= 0.95 &&
    input.holdoutCases > 0 && input.holdoutPassRate >= 0.9;
  if (!behaviorReady) return 'M3';
  return input.enterpriseGatesPassed ? 'M5' : 'M4';
}

function proveRuntimeIntegration(id: FableSkillId, repoRoot: string, packageValid: boolean): boolean {
  if (!packageValid) return false;
  const registry = loadSkillRegistry(repoRoot);
  const entry = getSkillEntry(id, registry);
  if (!entry) return false;
  if (id === registry.entry) return true;
  const probes = [...entry.intents, ...entry.keywords]
    .map((probe) => probe.replace(/[-_]+/g, ' ').trim())
    .filter(Boolean);
  return probes.some((probe) => routeTask(probe, null, registry).selectedSkill === id);
}

export function evaluateSkillMaturity(
  id: FableSkillId,
  repoRoot: string = getCoreRepoRoot(),
  options: {
    agentBehaviorEvidence?: AgentBehaviorEvalResult | null;
    certificationTrust?: { trustedAuditorPublicKeys: Record<string, string>; expectedAttestationHash: string; trustedAuditors?: string[] };
  } = {}
): SkillMaturityEvidence {
  const sourceAvailable = fs.existsSync(path.join(repoRoot, 'skills', id, 'SKILL.md'));
  const structured = fs.existsSync(getSkillManifestPath(id, repoRoot));
  const packageValidation = structured ? validateSkillPackage(id, repoRoot) : null;
  const packageValid = Boolean(packageValidation?.valid);
  const registryEntry = getSkillEntry(id, loadSkillRegistry(repoRoot));
  const known = packageValid ? runSkillKnownCases(id, repoRoot) : null;
  const spark = id === 'fable-spark' && packageValid ? runSparkBenchmark(repoRoot) : null;
  const enterpriseRouting = id === 'get-fable' && packageValid ? runEnterpriseRoutingBenchmark(repoRoot) : null;
  const enterpriseSpark = id === 'fable-spark' && packageValid ? runEnterpriseSparkBenchmark(repoRoot) : null;
  const frozenHoldout = id === 'get-fable' && packageValid ? loadFrozenRoutingHoldoutEvidence(repoRoot) : null;
  const frozenSparkHoldout = id === 'fable-spark' && packageValid ? loadFrozenSparkHoldoutEvidence(repoRoot) : null;
  const enterpriseVerification = id === 'fable-verify' && packageValid ? runEnterpriseVerificationBenchmark(repoRoot) : null;
  const frozenVerificationHoldout = id === 'fable-verify' && packageValid ? loadFrozenVerificationHoldoutEvidence(repoRoot) : null;
  const agentBehaviorPlan = packageValid && id !== 'get-fable' && id !== 'fable-spark' && id !== 'fable-verify'
    ? buildEnterpriseAgentBehaviorEvalPlan(repoRoot)
    : [];
  const hasInjectedAgentEvidence = Object.prototype.hasOwnProperty.call(options, 'agentBehaviorEvidence');
  const agentBehaviorValidation = agentBehaviorPlan.length > 0
    ? hasInjectedAgentEvidence
      ? validateAgentBehaviorEvidenceSnapshot(options.agentBehaviorEvidence, agentBehaviorPlan)
      : loadAgentBehaviorEvidenceSnapshot(repoRoot, agentBehaviorPlan)
    : null;
  const agentBehaviorCases = agentBehaviorValidation?.fresh && agentBehaviorValidation.snapshot
    ? agentBehaviorValidation.snapshot.cases.filter((item) => item.skillId === id)
    : [];
  const knownTotal = spark ? spark.total : known?.executable || 0;
  const knownPassed = spark ? spark.passed : known?.passed || 0;
  const runtimeIntegrated = Boolean(registryEntry && proveRuntimeIntegration(id, repoRoot, packageValid));
  const behavior = enterpriseRouting ? {
    known: slice(enterpriseRouting.categories.known.total, enterpriseRouting.categories.known.passed, 0.9),
    negative: slice(enterpriseRouting.categories.negative.total, enterpriseRouting.categories.negative.passed, 0.95),
    ambiguous: slice(enterpriseRouting.categories.ambiguous.total, enterpriseRouting.categories.ambiguous.passed, 0.9),
    adversarial: slice(enterpriseRouting.categories.adversarial.total, enterpriseRouting.categories.adversarial.passed, 0.95),
    holdout: frozenHoldout?.fresh && frozenHoldout.snapshot
      ? slice(frozenHoldout.snapshot.total, frozenHoldout.snapshot.passed, 0.9)
      : slice(0, 0),
  } : enterpriseSpark ? {
    known: slice(enterpriseSpark.categories.known.total, enterpriseSpark.categories.known.passed, 0.9),
    negative: slice(enterpriseSpark.categories.negative.total, enterpriseSpark.categories.negative.passed, 0.95),
    ambiguous: slice(enterpriseSpark.categories.ambiguous.total, enterpriseSpark.categories.ambiguous.passed, 0.9),
    adversarial: slice(enterpriseSpark.categories.adversarial.total, enterpriseSpark.categories.adversarial.passed, 0.95),
    holdout: frozenSparkHoldout?.fresh && frozenSparkHoldout.snapshot
      ? slice(frozenSparkHoldout.snapshot.total, frozenSparkHoldout.snapshot.passed, 0.9)
      : slice(0, 0),
  } : enterpriseVerification ? {
    known: slice(enterpriseVerification.categories.known.total, enterpriseVerification.categories.known.passed, 0.9),
    negative: slice(enterpriseVerification.categories.negative.total, enterpriseVerification.categories.negative.passed, 0.95),
    ambiguous: slice(enterpriseVerification.categories.ambiguous.total, enterpriseVerification.categories.ambiguous.passed, 0.9),
    adversarial: slice(enterpriseVerification.categories.adversarial.total, enterpriseVerification.categories.adversarial.passed, 0.95),
    holdout: frozenVerificationHoldout?.fresh && frozenVerificationHoldout.snapshot
      ? slice(frozenVerificationHoldout.snapshot.total, frozenVerificationHoldout.snapshot.passed, 0.9)
      : slice(0, 0),
  } : agentBehaviorCases.length > 0 ? {
    known: slice(agentBehaviorCases.filter((item) => item.category === 'known').length, agentBehaviorCases.filter((item) => item.category === 'known' && item.passed).length, 0.9),
    negative: slice(agentBehaviorCases.filter((item) => item.category === 'negative').length, agentBehaviorCases.filter((item) => item.category === 'negative' && item.passed).length, 0.95),
    ambiguous: slice(agentBehaviorCases.filter((item) => item.category === 'ambiguous').length, agentBehaviorCases.filter((item) => item.category === 'ambiguous' && item.passed).length, 0.9),
    adversarial: slice(agentBehaviorCases.filter((item) => item.category === 'adversarial').length, agentBehaviorCases.filter((item) => item.category === 'adversarial' && item.passed).length, 0.95),
    holdout: slice(agentBehaviorCases.filter((item) => item.category === 'holdout').length, agentBehaviorCases.filter((item) => item.category === 'holdout' && item.passed).length, 0.9),
  } : {
    known: slice(knownTotal, knownPassed),
    negative: slice(known?.negativeCases || 0, known?.negativePassed || 0),
    ambiguous: slice(0, 0),
    adversarial: slice(0, 0),
    holdout: slice(0, 0),
  };
  const behaviorReady =
    behavior.known.total > 0 && behavior.known.status === 'PASS' &&
    behavior.negative.total > 0 && behavior.negative.status === 'PASS' &&
    behavior.ambiguous.total > 0 && behavior.ambiguous.status === 'PASS' &&
    behavior.adversarial.total > 0 && behavior.adversarial.status === 'PASS' &&
    behavior.holdout.total > 0 && behavior.holdout.status === 'PASS';

  let enterpriseCertification: EnterpriseCertificationStatus | undefined;
  if (id === 'get-fable') {
    let externalCertificate: unknown = null;
    const certPath = path.join(repoRoot, '.fable', 'certification.json');
    if (fs.existsSync(certPath)) {
      try {
        externalCertificate = JSON.parse(fs.readFileSync(certPath, 'utf-8'));
      } catch {
        externalCertificate = null;
      }
    }

    // File presence is not an executable enterprise audit. Only independently
    // validated evidence may satisfy gates; none is wired for these pillars yet.
    // Preserve accurate M4 reporting rather than advertising false M5 readiness.
    const integrationAssurance = false;
    const evidenceIntegrity = Boolean(frozenHoldout?.fresh);
    const operationalReliability = false;
    const orchestrationCorrectness = false;
    const securityAuthorization = false;
    const enterpriseAudit = false;

    enterpriseCertification = evaluateEnterpriseCertificationGates({
      behavioralReliability: behaviorReady,
      orchestrationCorrectness,
      securityAuthorization,
      evidenceIntegrity,
      operationalReliability,
      integrationAssurance,
      enterpriseAudit,
      externalCertificate,
      expectedTarget: id,
      ...options.certificationTrust,
    });
  }

  const maturity = computeEvidenceBackedMaturity({
    sourceAvailable, structured, contractValid: packageValid, runtimeIntegrated,
    knownCases: behavior.known.total, knownPassRate: behavior.known.passRate || 0,
    negativeCases: behavior.negative.total, negativePassRate: behavior.negative.passRate || 0,
    ambiguousCases: behavior.ambiguous.total, ambiguousPassRate: behavior.ambiguous.passRate || 0,
    adversarialCases: behavior.adversarial.total, adversarialPassRate: behavior.adversarial.passRate || 0,
    holdoutCases: behavior.holdout.total, holdoutPassRate: behavior.holdout.passRate || 0,
    enterpriseGatesPassed: Boolean(enterpriseCertification?.enterpriseGatesPassed),
  });
  return {
    id, maturity, sourceAvailable, structured, packageValid, runtimeIntegrated,
    behaviorallyProven: maturity === 'M4' || maturity === 'M5',
    enterpriseReady: maturity === 'M5',
    behavior,
    certificationReadiness: enterpriseCertification?.readiness,
    externalCertification: enterpriseCertification?.externalCertification,
    enterpriseCertification,
  };
}
