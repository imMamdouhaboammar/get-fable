import type { EnvelopeHttpClient } from '../envelope.js';
import type {
  DiscoveredEndpoint,
  FindingCategory,
  FindingSeverity,
  RedTeamFinding,
  RedTeamProfile,
  ScanOptions,
} from '../types.js';

export interface ProbeContext {
  target: string;
  rootUrl: string;
  endpoints: DiscoveredEndpoint[];
  client: EnvelopeHttpClient;
  options: ScanOptions;
}

export interface SecurityProbeModule {
  id: string;
  name: string;
  category: FindingCategory;
  defaultSeverity: FindingSeverity;
  cwe: string;
  cvssVector: string;
  profiles: RedTeamProfile[];
  match: (context: ProbeContext) => boolean;
  run: (context: ProbeContext) => Promise<RedTeamFinding[]>;
}
