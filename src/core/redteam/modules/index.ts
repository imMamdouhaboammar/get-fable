import { cookieProbe } from './cookies.js';
import { corsProbe } from './cors.js';
import { exposureProbe } from './exposure.js';
import { graphqlProbe } from './graphql.js';
import { headersProbe } from './headers.js';
import { idorProbe } from './idor.js';
import { jwtProbe } from './jwt.js';
import { mutationProbe } from './mutation.js';
import { nosqlProbe } from './nosql.js';
import { pathTraversalProbe } from './path-traversal.js';
import { prototypePollutionProbe } from './prototype-pollution.js';
import { redirectProbe } from './redirect.js';
import { ProbeRegistry } from './registry.js';
import { sqliProbe } from './sqli.js';
import { ssrfProbe } from './ssrf.js';
import { sstiProbe } from './ssti.js';

export * from './types.js';
export * from './registry.js';

export const BUILTIN_PROBE_MODULES = [
  headersProbe,
  corsProbe,
  exposureProbe,
  idorProbe,
  sqliProbe,
  ssrfProbe,
  redirectProbe,
  jwtProbe,
  mutationProbe,
  sstiProbe,
  nosqlProbe,
  pathTraversalProbe,
  graphqlProbe,
  prototypePollutionProbe,
  cookieProbe,
];

export function createDefaultProbeRegistry(): ProbeRegistry {
  const registry = new ProbeRegistry();
  for (const mod of BUILTIN_PROBE_MODULES) {
    registry.register(mod);
  }
  return registry;
}
