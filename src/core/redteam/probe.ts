import { discoverTargetSurface } from './crawler.js';
import { buildExecutionEnvelope, EnvelopeHttpClient } from './envelope.js';
import { createDefaultProbeRegistry, type ProbeContext, type ProbeRegistry } from './modules/index.js';
import { validateScope } from './scope.js';
import type {
  DiscoveredEndpoint,
  DiscoveredSurface,
  RedTeamFinding,
  ScanOptions,
} from './types.js';

export * from './modules/index.js';

/**
 * Orchestrates modular red-team security probing across target surface.
 */
export async function runSecurityProbes(
  options: ScanOptions,
  providedSurface?: DiscoveredSurface,
  providedClient?: EnvelopeHttpClient,
  customRegistry?: ProbeRegistry
): Promise<RedTeamFinding[]> {
  validateScope(options.target, options.scopeConfig);

  const envelope = buildExecutionEnvelope(options.scopeConfig, options.envelope);
  const client = providedClient || new EnvelopeHttpClient(envelope);

  const profile = options.profile || 'passive';
  const targetUrl = new URL(options.target);
  const rootUrl = `${targetUrl.protocol}//${targetUrl.host}`;

  // Surface Discovery (Crawler)
  let surface = providedSurface;
  const shouldCrawl = options.crawl !== false && (profile === 'comprehensive' || profile === 'api-logic' || profile === 'orchestrated');
  if (!surface && shouldCrawl) {
    surface = await discoverTargetSurface(options.target, envelope, client);
  }

  const endpointsToTest: DiscoveredEndpoint[] = surface ? [...surface.endpoints] : [
    { url: options.target, path: targetUrl.pathname, method: 'GET', source: 'probe' }
  ];

  const context: ProbeContext = {
    target: options.target,
    rootUrl,
    endpoints: endpointsToTest,
    client,
    options,
  };

  const registry = customRegistry || createDefaultProbeRegistry();
  return await registry.runAll(context);
}
