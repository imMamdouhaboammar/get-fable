import type {
  AdapterContext,
  FindingCategory,
  FindingSeverity,
  RedTeamFinding,
  RedTeamToolAdapter,
  ToolAdapterId,
  ToolAdapterStatus,
} from '../types.js';

export abstract class BaseToolAdapter implements RedTeamToolAdapter {
  abstract readonly id: ToolAdapterId;
  abstract readonly name: string;
  abstract readonly description: string;

  abstract isAvailable(context?: AdapterContext): Promise<boolean>;

  async getStatus(context?: AdapterContext): Promise<ToolAdapterStatus> {
    const start = performance.now();
    try {
      const available = await this.isAvailable(context);
      const latencyMs = Math.round(performance.now() - start);
      return {
        id: this.id,
        name: this.name,
        available,
        runtime: available ? 'ready' : 'unavailable',
        latencyMs,
      };
    } catch (err) {
      return {
        id: this.id,
        name: this.name,
        available: false,
        runtime: 'error',
        details: err instanceof Error ? err.message : String(err),
      };
    }
  }

  abstract run(context: AdapterContext): Promise<RedTeamFinding[]>;

  protected createFinding(params: {
    title: string;
    category: FindingCategory;
    severity: FindingSeverity;
    description: string;
    target: string;
    remediation: string;
    reproCurl?: string;
    responseSnippet?: string;
    responseStatus?: number;
    requestMethod?: string;
    cwe?: string;
    rawOutput?: string;
    evidenceLevel?: import('../types.js').EvidenceLevel;
    confidence?: number;
    lifecycle?: import('../types.js').FindingLifecycle;
  }): RedTeamFinding {
    return {
      id: `${this.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      title: params.title,
      category: params.category,
      severity: params.severity,
      description: params.description,
      target: params.target,
      evidence: {
        request: {
          method: params.requestMethod || 'GET',
          url: params.target,
        },
        response: {
          status: params.responseStatus || 200,
          snippet: params.responseSnippet,
        },
        reproCurl: params.reproCurl,
        rawOutput: params.rawOutput,
        sourceTool: this.id,
        evidenceLevel: params.evidenceLevel,
        confidence: params.confidence,
      },
      remediation: params.remediation,
      cwe: params.cwe,
      sourceTool: this.id,
      evidenceLevel: params.evidenceLevel,
      confidence: params.confidence,
      lifecycle: params.lifecycle,
    };
  }
}
