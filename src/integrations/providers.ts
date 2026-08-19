export interface CurrentSearchResult {
  title: string;
  url: string;
  excerpt?: string;
  publishedAt?: string;
}
export interface CurrentSearchProvider {
  search(query: string, options?: { domains?: string[]; maxResults?: number }): Promise<CurrentSearchResult[]>;
}

export interface ExecutionReceiptRequest {
  repository: string;
  revision: string;
  commandCategory: string;
  scope?: string[];
}
export interface ExecutionReceiptProvider {
  capture(request: ExecutionReceiptRequest): Promise<{ receiptId: string; revision: string; verified: boolean }>;
}

export interface SecurityEvidenceProvider {
  assess(request: { scope: string[]; revision?: string }): Promise<{
    verdict: 'pass' | 'fail' | 'not-checked';
    findings: Array<{ id: string; severity: string; summary: string }>;
  }>;
}

export interface RepositoryProvider {
  revision(): Promise<string>;
  changedFiles(base?: string): Promise<string[]>;
}

export interface BrowserEvidenceProvider {
  capture(request: { url: string; timeoutMs?: number }): Promise<{
    url: string;
    status: number;
    title?: string;
  }>;
}

export interface SkillBehaviorRequest {
  skillId: string;
  caseId: string;
  instruction: string;
  given: Record<string, unknown>;
  actionVocabulary: string[];
}
export interface SkillBehaviorResponse {
  action: string;
  selectedSkill?: string;
  produces?: string;
  gates?: string[];
  structure?: string[];
}
export interface SkillBehaviorProvider {
  id: string;
  executeSkill(request: SkillBehaviorRequest): Promise<SkillBehaviorResponse>;
}
