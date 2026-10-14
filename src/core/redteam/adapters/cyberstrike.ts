import type {
  AdapterContext,
  AttackEdge,
  AttackGraph,
  AttackNode,
  AttackPath,
  RedTeamFinding,
  ToolAdapterId,
} from '../types.js';
import { BaseToolAdapter } from './base.js';

export class CyberStrikeAdapter extends BaseToolAdapter {
  readonly id: ToolAdapterId = 'cyberstrike';
  readonly name = 'CyberStrikeAI Attack Graph Engine';
  readonly description =
    'Multi-stage kill-chain attack graph modeling and exploit path prioritization';

  async isAvailable(): Promise<boolean> {
    return true; // Graph modeling is computed natively from discovered reconnaissance data
  }

  buildAttackGraph(targetUrl: string, existingFindings: RedTeamFinding[]): AttackGraph {
    const nodes: AttackNode[] = [];
    const edges: AttackEdge[] = [];
    const attackPaths: AttackPath[] = [];

    const origin = new URL(targetUrl).origin;
    const entryNode: AttackNode = {
      id: 'entry-http',
      label: `Public HTTP Surface (${origin})`,
      type: 'entrypoint',
      metadata: { target: targetUrl },
    };
    nodes.push(entryNode);

    // Group findings into attack chain steps
    const authVulns = existingFindings.filter(
      (f) => f.category === 'auth-bypass' || f.category === 'session-management'
    );
    const idorVulns = existingFindings.filter((f) => f.category === 'idor-bola');
    const injectionVulns = existingFindings.filter((f) => f.category === 'injection');
    const exposureVulns = existingFindings.filter((f) => f.category === 'sensitive-exposure');

    const deriveEdgeSemantics = (findings: RedTeamFinding[]) => {
      if (findings.length === 0) {
        return { evidenceLevel: 'hypothetical' as const, confidence: 0.35, sourceFindings: [] };
      }
      const hasReproduced = findings.some((f) => f.evidenceLevel === 'reproduced' || f.evidence?.reproCurl);
      const hasObserved = findings.some((f) => f.evidenceLevel === 'observed' || !f.evidenceLevel);
      const hasInferred = findings.some((f) => f.evidenceLevel === 'inferred');

      const evidenceLevel = hasReproduced
        ? ('reproduced' as const)
        : hasObserved
        ? ('observed' as const)
        : hasInferred
        ? ('inferred' as const)
        : ('hypothetical' as const);

      const avgConfidence = Number(
        (
          findings.reduce((acc, f) => acc + (f.confidence || (hasReproduced ? 0.95 : 0.75)), 0) /
          findings.length
        ).toFixed(2)
      );

      const sourceFindings = findings.map((f) => f.id || f.fingerprint || 'finding');
      return { evidenceLevel, confidence: avgConfidence, sourceFindings };
    };

    if (exposureVulns.length > 0) {
      const expSemantics = deriveEdgeSemantics(exposureVulns);
      const expNode: AttackNode = {
        id: 'node-secrets',
        label: 'Exposed Credentials / Config (.env)',
        type: 'secret',
      };
      nodes.push(expNode);
      edges.push({
        source: 'entry-http',
        target: 'node-secrets',
        relationship: 'unauthenticated_file_leak',
        riskScore: 9.5,
        evidenceLevel: expSemantics.evidenceLevel,
        confidence: expSemantics.confidence,
        prerequisites: ['Direct HTTP connectivity', 'Public read access on /.env or config'],
        sourceFindings: expSemantics.sourceFindings,
      });

      attackPaths.push({
        path: ['entry-http', 'node-secrets'],
        riskScore: 9.5,
        confidence: expSemantics.confidence,
        evidenceLevel: expSemantics.evidenceLevel,
        description: 'Direct credential harvesting via exposed configuration files',
        reproducible: expSemantics.evidenceLevel === 'reproduced',
      });
    }

    if (authVulns.length > 0) {
      const authSemantics = deriveEdgeSemantics(authVulns);
      const authNode: AttackNode = {
        id: 'node-auth-bypass',
        label: 'Broken Authentication Gateway',
        type: 'endpoint',
      };
      nodes.push(authNode);
      edges.push({
        source: 'entry-http',
        target: 'node-auth-bypass',
        relationship: 'unauthorized_access',
        riskScore: 9.0,
        evidenceLevel: authSemantics.evidenceLevel,
        confidence: authSemantics.confidence,
        prerequisites: ['Direct HTTP connectivity', 'Unauthenticated route accessibility'],
        sourceFindings: authSemantics.sourceFindings,
      });

      if (idorVulns.length > 0) {
        const idorSemantics = deriveEdgeSemantics(idorVulns);
        const idorNode: AttackNode = {
          id: 'node-tenant-data',
          label: 'Cross-Tenant Object Access (IDOR/BOLA)',
          type: 'database',
        };
        nodes.push(idorNode);

        edges.push({
          source: 'node-auth-bypass',
          target: 'node-tenant-data',
          relationship: 'privilege_escalation',
          riskScore: 8.8,
          evidenceLevel: idorSemantics.evidenceLevel,
          confidence: idorSemantics.confidence,
          prerequisites: ['Valid session token or auth bypass', 'Object identifier manipulation'],
          sourceFindings: idorSemantics.sourceFindings,
        });

        // Kill-chain confidence is product of each stage's confidence
        const chainedConfidence = Number((authSemantics.confidence * idorSemantics.confidence).toFixed(2));
        const weakestLevel =
          authSemantics.evidenceLevel === 'hypothetical' || idorSemantics.evidenceLevel === 'hypothetical'
            ? 'hypothetical'
            : authSemantics.evidenceLevel === 'inferred' || idorSemantics.evidenceLevel === 'inferred'
            ? 'inferred'
            : authSemantics.evidenceLevel === 'observed' || idorSemantics.evidenceLevel === 'observed'
            ? 'observed'
            : 'reproduced';

        attackPaths.push({
          path: ['entry-http', 'node-auth-bypass', 'node-tenant-data'],
          riskScore: 9.8,
          confidence: chainedConfidence,
          evidenceLevel: weakestLevel,
          description: 'Full tenant compromise: Auth bypass chained with object-level authorization flaw',
          reproducible: weakestLevel === 'reproduced',
        });
      }
    }

    if (injectionVulns.length > 0) {
      const injSemantics = deriveEdgeSemantics(injectionVulns);
      const dbNode: AttackNode = {
        id: 'node-database',
        label: 'Backend Database / Storage',
        type: 'database',
      };
      nodes.push(dbNode);
      edges.push({
        source: 'entry-http',
        target: 'node-database',
        relationship: 'remote_code_execution_or_sqli',
        riskScore: 9.9,
        evidenceLevel: injSemantics.evidenceLevel,
        confidence: injSemantics.confidence,
        prerequisites: ['Unsanitized input parameter', 'Execution context access'],
        sourceFindings: injSemantics.sourceFindings,
      });

      attackPaths.push({
        path: ['entry-http', 'node-database'],
        riskScore: 9.9,
        confidence: injSemantics.confidence,
        evidenceLevel: injSemantics.evidenceLevel,
        description: 'Direct server-side or database injection exploit chain',
        reproducible: injSemantics.evidenceLevel === 'reproduced',
      });
    }

    return { nodes, edges, attackPaths };
  }

  async run(context: AdapterContext): Promise<RedTeamFinding[]> {
    // In standalone execution, generate graph-prioritized finding if attack paths exist
    return [];
  }
}
