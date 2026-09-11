export interface FableDshConfig {
  /** Automatically run Fable route analysis on new prompts (default: true) */
  autoRoute?: boolean;
  /** Planning mode enforcement: 'legacy' | 'autonomous' | 'gated' (default: 'autonomous') */
  planningMode?: 'legacy' | 'autonomous' | 'gated';
  /** Path to project root (defaults to process.cwd()) */
  projectRoot?: string;
  /** Whether to inject Fable lifecycle discipline into system prompts (default: true) */
  injectDiscipline?: boolean;
}

export interface FableSkillInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  pack: string;
  inputs?: string[];
  requires?: string[];
  produces?: string[];
  gates?: string[];
  neural_links?: {
    precursors?: string[];
    continuations?: string[];
    lateral_peers?: string[];
    recovery?: string;
  };
}

export interface FablePlanStatus {
  hasPlan: boolean;
  hasProgress: boolean;
  hasFindings: boolean;
  planContent: string | null;
  progressContent: string | null;
  findingsContent: string | null;
  mode: 'legacy' | 'autonomous' | 'gated' | null;
  attestationSha: string | null;
  phases: Array<{
    name: string;
    status: 'pending' | 'in_progress' | 'complete' | 'blocked';
  }>;
}

export interface FableStatusResponse {
  active: boolean;
  version: string;
  stateSchemaVersion: number | null;
  activeCard: string | null;
  phase: string | null;
  failureStreak: number;
  unverifiedMutations: number;
  totalCards: number;
  doctorHealthy: boolean;
  issuesCount: number;
  planning: FablePlanStatus;
}
