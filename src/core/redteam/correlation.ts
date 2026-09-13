import crypto from 'node:crypto';
import type {
  BaselineDiffResult,
  ComplianceTag,
  CvssScore,
  EvidenceLevel,
  FindingCategory,
  FindingEvidence,
  FindingLifecycle,
  FindingProvenance,
  FindingSeverity,
  PriorityBreakdown,
  RedTeamFinding,
} from './types.js';

export interface NormalizedRoute {
  asset: string;
  routeTemplate: string;
  dynamicParams: string[];
}

/**
 * Normalizes an endpoint URL or path into a canonical route template.
 * E.g.:
 *   "http://127.0.0.1:3000/users/123" -> { asset: "http://127.0.0.1:3000", routeTemplate: "/users/{id}" }
 *   "https://api.example.com/orders/a1b2c3d4-e5f6-7890-abcd-ef1234567890/items" -> routeTemplate: "/orders/{uuid}/items"
 */
export function normalizeRouteTemplate(rawUrlOrPath: string): NormalizedRoute {
  let asset = '';
  let pathname = rawUrlOrPath;

  try {
    const parsed = new URL(rawUrlOrPath);
    asset = parsed.origin;
    pathname = parsed.pathname;
  } catch {
    // Relative path or endpoint pattern
    const slashIdx = rawUrlOrPath.indexOf('/');
    if (slashIdx >= 0) {
      pathname = rawUrlOrPath.slice(slashIdx);
      asset = rawUrlOrPath.slice(0, slashIdx);
    }
  }

  const segments = pathname.split('/').filter(Boolean);
  const dynamicParams: string[] = [];

  const normalizedSegments = segments.map((seg) => {
    // 1. Numeric ID: /users/123
    if (/^\d+$/.test(seg)) {
      dynamicParams.push(seg);
      return '{id}';
    }
    // 2. Standard UUID: /items/550e8400-e29b-41d4-a716-446655440000
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) {
      dynamicParams.push(seg);
      return '{uuid}';
    }
    // 3. Hex token / hash segment >= 16 chars: /token/4f53c2...
    if (/^[0-9a-f]{16,}$/i.test(seg)) {
      dynamicParams.push(seg);
      return '{hex}';
    }
    // 4. Already templated segment: {userId}, :id
    if (/^\{.*\}$/.test(seg) || seg.startsWith(':')) {
      dynamicParams.push(seg);
      return '{param}';
    }
    return seg;
  });

  const routeTemplate = '/' + normalizedSegments.join('/');
  return { asset, routeTemplate, dynamicParams };
}

/**
 * Computes a deterministic canonical fingerprint for cross-tool correlation and lineage tracking.
 */
export function computeCanonicalFingerprint(finding: RedTeamFinding): string {
  const { asset, routeTemplate } = normalizeRouteTemplate(finding.target);
  const method = (finding.evidence.request?.method || 'GET').toUpperCase();
  const category = finding.category;
  const cwe = finding.cwe || 'CWE-GENERAL';

  // Include target parameter if identifiable
  let paramIndicator = '';
  if (finding.title.includes('?')) {
    paramIndicator = finding.title.split('?')[1]?.split('=')[0] || '';
  }

  const fingerprintSeed = `${asset}|${routeTemplate}|${method}|${category}|${cwe}|${paramIndicator}`;
  const sha256 = crypto.createHash('sha256').update(fingerprintSeed).digest('hex');
  return `RT-FP-${sha256.slice(0, 16)}`;
}

/**
 * Computes a weighted multi-factor priority breakdown preserving all raw components.
 */
export function calculatePriorityBreakdown(finding: Partial<RedTeamFinding>): PriorityBreakdown {
  const severity = finding.severity || 'medium';
  const severityWeights: Record<FindingSeverity, number> = {
    critical: 1.0,
    high: 0.75,
    medium: 0.5,
    low: 0.25,
    info: 0.1,
  };
  const severityWeight = severityWeights[severity];

  // Derive base confidence from evidenceLevel or explicit score
  let confidence = finding.confidence;
  if (confidence === undefined) {
    const level = finding.evidenceLevel || 'observed';
    switch (level) {
      case 'reproduced':
        confidence = 0.95;
        break;
      case 'observed':
        confidence = 0.8;
        break;
      case 'inferred':
        confidence = 0.5;
        break;
      case 'hypothetical':
        confidence = 0.35;
        break;
    }
  }

  // Exploitability: actionable cURL / live proof increases exploitability
  let exploitability = 0.5;
  if (finding.evidence?.reproCurl) exploitability = 0.85;
  if (finding.category === 'injection' || finding.category === 'auth-bypass') {
    exploitability = Math.max(exploitability, 0.9);
  } else if (finding.category === 'security-headers') {
    exploitability = 0.3;
  }

  // Exposure: check target protocol, host, and auth requirements
  let exposure = 0.6;
  const target = finding.target || '';
  if (target.includes('localhost') || target.includes('127.0.0.1')) {
    exposure = 0.4;
  } else if (target.startsWith('https://') || target.startsWith('http://')) {
    exposure = 0.85;
  }

  // Asset Criticality: secrets, databases, and auth boundaries rate highest
  let assetCriticality = 0.5;
  if (finding.category === 'sensitive-exposure' || target.includes('.env')) {
    assetCriticality = 0.95;
  } else if (finding.category === 'auth-bypass' || finding.category === 'idor-bola') {
    assetCriticality = 0.85;
  } else if (finding.category === 'security-headers') {
    assetCriticality = 0.3;
  }

  // Multi-factor formula
  const score = Number(
    (
      severityWeight * 0.35 +
      confidence * 0.25 +
      exploitability * 0.2 +
      exposure * 0.1 +
      assetCriticality * 0.1
    ).toFixed(3)
  );

  return {
    severityWeight,
    confidence: Number(confidence.toFixed(2)),
    exploitability: Number(exploitability.toFixed(2)),
    exposure: Number(exposure.toFixed(2)),
    assetCriticality: Number(assetCriticality.toFixed(2)),
    score,
  };
}

/**
 * Deduplicates and correlates findings from multiple tools into a unified model.
 * Multiple tools discovering the same root cause produce ONE canonical finding with
 * an aggregated list of independent evidence sources and calibrated confidence.
 */
export function correlateAndDeduplicateFindings(rawFindings: RedTeamFinding[]): RedTeamFinding[] {
  const clusters = new Map<string, RedTeamFinding[]>();

  for (const finding of rawFindings) {
    const fp = finding.fingerprint || computeCanonicalFingerprint(finding);
    const enriched: RedTeamFinding = {
      ...finding,
      fingerprint: fp,
      familyId: `${finding.category}:${normalizeRouteTemplate(finding.target).routeTemplate}`,
    };

    const existing = clusters.get(fp);
    if (!existing) {
      clusters.set(fp, [enriched]);
    } else {
      existing.push(enriched);
    }
  }

  const result: RedTeamFinding[] = [];

  for (const [fingerprint, group] of clusters.entries()) {
    if (group.length === 1) {
      const single = group[0];
      const priority = single.priority || calculatePriorityBreakdown(single);
      const evidenceList = single.evidenceList || [single.evidence];
      const lifecycle: FindingLifecycle = single.evidence.reproCurl ? 'reproduced' : 'new';

      result.push({
        ...single,
        evidenceList,
        priority,
        lifecycle: single.lifecycle || lifecycle,
        evidenceLevel: single.evidenceLevel || (single.evidence.reproCurl ? 'reproduced' : 'observed'),
      });
      continue;
    }

    // Correlate multiple findings into one
    const severityRank: Record<FindingSeverity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
      info: 0,
    };

    // Sort descending by severity then by presence of repro cURL
    group.sort((a, b) => {
      const rankDiff = severityRank[b.severity] - severityRank[a.severity];
      if (rankDiff !== 0) return rankDiff;
      return (b.evidence.reproCurl ? 1 : 0) - (a.evidence.reproCurl ? 1 : 0);
    });

    const primary = group[0];
    const allEvidence: FindingEvidence[] = [];
    const sourceTools = new Set<string>();

    for (const item of group) {
      if (item.sourceTool) sourceTools.add(String(item.sourceTool));
      if (item.evidenceList && item.evidenceList.length > 0) {
        allEvidence.push(...item.evidenceList);
      } else {
        allEvidence.push(item.evidence);
      }
    }

    // Calculate cross-tool confidence boost: 1 - Product(1 - C_i)
    let unlikelihood = 1.0;
    for (const item of group) {
      const itemConf = item.confidence || (item.evidence.reproCurl ? 0.9 : 0.7);
      unlikelihood *= 1.0 - Math.min(0.95, itemConf);
    }
    const combinedConfidence = Number(Math.min(0.99, Math.max(0.5, 1.0 - unlikelihood)).toFixed(2));

    // Determine highest evidence level
    let highestLevel: EvidenceLevel = 'hypothetical';
    for (const item of group) {
      const level = item.evidenceLevel || (item.evidence.reproCurl ? 'reproduced' : 'observed');
      if (level === 'reproduced') {
        highestLevel = 'reproduced';
        break;
      }
      if (level === 'observed') {
        highestLevel = 'observed';
      } else if (level === 'inferred' && highestLevel === 'hypothetical') {
        highestLevel = 'inferred';
      }
    }

    // Lifecycle determination
    let lifecycle: FindingLifecycle = 'new';
    if (highestLevel === 'reproduced') {
      lifecycle = 'reproduced';
    } else if (sourceTools.size >= 2) {
      lifecycle = 'confirmed';
    }

    // Provenance summary
    const provenance: FindingProvenance = {
      tool: Array.from(sourceTools).join(' + ') || 'fable-orchestrator',
      timestamp: new Date().toISOString(),
      target: primary.target,
      rawEvidenceHash: crypto
        .createHash('sha256')
        .update(allEvidence.map((e) => e.rawOutput || e.reproCurl || '').join(';'))
        .digest('hex'),
      reproCommand: primary.evidence.reproCurl,
      reproSucceeded: Boolean(primary.evidence.reproCurl),
    };

    // Combine rawOutputs from all evidence items
    const combinedRawOutput = allEvidence
      .map((e) => e.rawOutput)
      .filter(Boolean)
      .join('\n---\n');

    const aggregatedFinding: RedTeamFinding = {
      ...primary,
      id: primary.id,
      fingerprint,
      familyId: `${primary.category}:${normalizeRouteTemplate(primary.target).routeTemplate}`,
      lifecycle,
      evidenceLevel: highestLevel,
      confidence: combinedConfidence,
      evidence: {
        ...primary.evidence,
        rawOutput: combinedRawOutput || primary.evidence.rawOutput,
      },
      evidenceList: allEvidence,
      sourceTool: Array.from(sourceTools).join(' + ') || primary.sourceTool,
      provenance,
    };

    aggregatedFinding.priority = calculatePriorityBreakdown(aggregatedFinding);
    aggregatedFinding.compliance = deriveComplianceMappings(aggregatedFinding);
    aggregatedFinding.cvss = calculateCvssV3(aggregatedFinding);
    result.push(aggregatedFinding);
  }

  return result;
}

export function deriveComplianceMappings(finding: RedTeamFinding): ComplianceTag {
  const cat = finding.category;
  const cwe = finding.cwe || '';

  let owaspTop10 = 'A05:2021-Security Misconfiguration';
  let owaspApi = 'API8:2023-Security Misconfiguration';
  let pciDss = 'Req 6.3.1-Security Vulnerability Management';
  let soc2 = 'CC7.1-Vulnerability and Threat Management';

  if (cat === 'auth-bypass' || cat === 'session-management') {
    owaspTop10 = 'A07:2021-Identification and Authentication Failures';
    owaspApi = 'API2:2023-Broken Authentication';
    pciDss = 'Req 8.2.1-Strong Authentication Mechanisms';
    soc2 = 'CC6.1-Logical Access Controls';
  } else if (cat === 'idor-bola') {
    owaspTop10 = 'A01:2021-Broken Access Control';
    owaspApi = 'API1:2023-Broken Object Level Authorization';
    pciDss = 'Req 6.2.4-Access Control Verification';
    soc2 = 'CC6.1-Logical Access Controls';
  } else if (cat === 'mass-assignment' || cat === 'business-logic') {
    owaspTop10 = 'A01:2021-Broken Access Control';
    owaspApi = 'API3:2023-Broken Object Property Level Authorization';
    pciDss = 'Req 6.2.4-Input Validation & Access Controls';
    soc2 = 'CC6.1-Logical Access Controls';
  } else if (cat === 'injection' || cat === 'llm-prompt-injection') {
    owaspTop10 = 'A03:2021-Injection';
    owaspApi = 'API10:2023-Unsafe Consumption of APIs';
    pciDss = 'Req 6.2.4-Injection Flaw Prevention';
    soc2 = 'CC7.1-Vulnerability and Threat Management';
  } else if (cat === 'ssrf') {
    owaspTop10 = 'A10:2021-Server-Side Request Forgery';
    owaspApi = 'API7:2023-Server-Side Request Forgery';
    pciDss = 'Req 6.2.4-Network and Request Validation';
    soc2 = 'CC6.6-Boundary Protection';
  } else if (cat === 'sensitive-exposure') {
    owaspTop10 = 'A02:2021-Cryptographic Failures';
    owaspApi = 'API3:2023-Broken Object Property Level Authorization';
    pciDss = 'Req 3.4-Protection of Cardholder and Sensitive Data';
    soc2 = 'CC6.6-Data Protection and Boundary Defense';
  } else if (cat === 'cors-misconfiguration' || cat === 'security-headers') {
    owaspTop10 = 'A05:2021-Security Misconfiguration';
    owaspApi = 'API8:2023-Security Misconfiguration';
    pciDss = 'Req 6.4.3-Web Application Headers and Scripts';
    soc2 = 'CC6.6-Boundary Protection';
  }

  return {
    owaspTop10,
    owaspApi,
    pciDss,
    soc2,
    cweTitle: cwe ? `CWE-${cwe.replace(/^CWE-/i, '')}` : undefined,
  };
}

export function calculateCvssV3(finding: RedTeamFinding): CvssScore {
  const sev = finding.severity;
  const cat = finding.category;

  let av = 'N'; // Network
  let ac = 'L'; // Low complexity
  let pr = 'N'; // Privileges Required: None
  let ui = 'N'; // User Interaction: None
  let s = 'U';  // Scope: Unchanged
  let c = 'N';  // Confidentiality
  let i = 'N';  // Integrity
  let a = 'N';  // Availability
  let score = 0.0;
  let rating: CvssScore['rating'] = 'None';

  if (sev === 'critical') {
    if (cat === 'injection') {
      c = 'H'; i = 'H'; a = 'H';
      score = 9.8;
    } else if (cat === 'sensitive-exposure' || cat === 'auth-bypass') {
      c = 'H'; i = 'H'; a = 'N';
      score = 9.1;
    } else {
      c = 'H'; i = 'H'; a = 'L';
      score = 9.0;
    }
    rating = 'Critical';
  } else if (sev === 'high') {
    if (cat === 'idor-bola' || cat === 'mass-assignment') {
      pr = 'L'; c = 'H'; i = 'H'; a = 'N';
      score = 8.1;
    } else if (cat === 'ssrf') {
      c = 'H'; i = 'L'; a = 'N';
      score = 7.5;
    } else {
      c = 'H'; i = 'L'; a = 'N';
      score = 7.5;
    }
    rating = 'High';
  } else if (sev === 'medium') {
    c = 'L'; i = 'L'; a = 'N';
    score = 5.3;
    rating = 'Medium';
  } else if (sev === 'low') {
    c = 'L'; i = 'N'; a = 'N';
    score = 3.7;
    rating = 'Low';
  } else {
    c = 'N'; i = 'N'; a = 'N';
    score = 0.0;
    rating = 'None';
  }

  const vector = `CVSS:3.1/AV:${av}/AC:${ac}/PR:${pr}/UI:${ui}/S:${s}/C:${c}/I:${i}/A:${a}`;
  return { vector, score, rating };
}

export function diffWithBaseline(
  currentFindings: RedTeamFinding[],
  baselineFindings: RedTeamFinding[],
  suppressedFingerprints: string[] = [],
  baselineFile = '.fable/redteam-baseline.json'
): BaselineDiffResult {
  const suppressedSet = new Set(suppressedFingerprints);
  const baselineMap = new Map<string, RedTeamFinding>();

  for (const b of baselineFindings) {
    if (b.fingerprint) baselineMap.set(b.fingerprint, b);
  }

  const currentMap = new Map<string, RedTeamFinding>();
  for (const c of currentFindings) {
    if (c.fingerprint) currentMap.set(c.fingerprint, c);
  }

  const newFindings: RedTeamFinding[] = [];
  const persistentFindings: RedTeamFinding[] = [];
  let suppressedCount = 0;

  for (const c of currentFindings) {
    const fp = c.fingerprint;
    if (fp && suppressedSet.has(fp)) {
      suppressedCount++;
      continue;
    }
    if (fp && baselineMap.has(fp)) {
      persistentFindings.push(c);
    } else {
      newFindings.push(c);
    }
  }

  const resolvedFindings: RedTeamFinding[] = [];
  for (const b of baselineFindings) {
    const fp = b.fingerprint;
    if (fp && !currentMap.has(fp)) {
      resolvedFindings.push(b);
    }
  }

  return {
    baselineFile,
    newFindings,
    persistentFindings,
    resolvedFindings,
    suppressedCount,
    hasRegressions: newFindings.length > 0,
  };
}

