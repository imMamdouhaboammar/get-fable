import type {
  ArchitectureEvaluationResult,
  ArchitectureVectorScores,
  ArchitectureVerdict,
  DecomposedService,
  MicroserviceCommunicationContract,
  TechStackAssignment,
  TechStackCategory,
} from './types.js';

export const TECH_STACK_MATRIX: Record<TechStackCategory, Omit<TechStackAssignment, 'role'>> = {
  A: {
    category: 'A',
    language: 'Go',
    framework: 'Fiber',
    frameworkOptions: ['Fiber', 'Gin', 'Go-Kit'],
    runtime: 'Go 1.23+',
    competency: 'High-Concurrency APIs & Distributed Networking',
  },
  B: {
    category: 'B',
    language: 'TypeScript',
    framework: 'NestJS',
    frameworkOptions: ['NestJS', 'Fastify', 'Elysia'],
    runtime: 'Node.js 22+ / Bun',
    competency: 'I/O Intensive, Rapid API Gateway & Orchestration',
  },
  C: {
    category: 'C',
    language: 'Rust',
    framework: 'Axum',
    frameworkOptions: ['Axum', 'Actix-web'],
    runtime: 'Rust 1.80+ (native binary)',
    competency: 'High-Performance Computational Kernels, Media Processing, Systems Engineering',
  },
  D: {
    category: 'D',
    language: 'Python',
    framework: 'FastAPI',
    frameworkOptions: ['FastAPI', 'PyTorch/TensorFlow integrations'],
    runtime: 'Python 3.12+',
    competency: 'Artificial Intelligence, Data Engineering, & Machine Learning',
  },
  E: {
    category: 'E',
    language: 'Elixir',
    framework: 'Phoenix',
    frameworkOptions: ['Phoenix', 'LiveView', 'Cowboy/Bandit', 'GenStage'],
    runtime: 'Erlang/OTP 26+ / BEAM',
    competency: 'Ultra-High Concurrency, Fault-Tolerant Real-Time Systems & WebSockets',
  },
};

const SCALE_LOAD_PATTERNS = [
  /\b(\d{4,}|\d+k|\d+m)\s*(?:persistent\s+)?(?:concurrent|rps|req\/s|tps|users|connections|events\/s|websockets?)\b/i,
  /\b(?:hundreds of thousands|tens of thousands|millions)\s+of\s+(?:persistent\s+)?(?:connections|websockets?|users|events|messages)\b/i,
  /\b(?:high|extreme|massive|strict)\s+(?:concurrency|throughput|load|scale)\b/i,
  /\bmillions of (?:messages|requests|events|records|packets)\b/i,
  /\bpersistent\s+(?:web\s*sockets?|connections)\b/i,
  /\b(?:low latency|sub[- ](?:10|20|50)ms|p99|sla)\b/i,
  /\bhorizontal(?:ly)?\s+scal(?:e|ing|able)\b/i,
  /\bdistributed\s+(?:traffic|load|routing)\b/i,
  /\bstateless\s+(?:message|event|request)\s+routing\b/i,
];

const DOMAIN_DEFINITIONS: Array<{ id: string; name: string; pattern: RegExp }> = [
  { id: 'auth', name: 'Identity & Authentication', pattern: /\b(?:auth|identity|oauth|sso|credentials|rbac|abac|jwt|session)\b/i },
  { id: 'billing', name: 'Payments & Billing', pattern: /\b(?:payment|billing|stripe|invoice|subscription|checkout|transaction)\b/i },
  { id: 'gateway', name: 'API Gateway & Ingress', pattern: /\b(?:api gateway|gateway|reverse proxy|ingress|bff|orchestration)\b/i },
  { id: 'compute', name: 'Computational Kernel', pattern: /\b(?:transcod(?:e|ing)|heavy math|cryptography|binary stream|encryption pipeline|signal processing)\b/i },
  { id: 'ai', name: 'AI & Inference Engine', pattern: /\b(?:ai inference|llm routing|deep learning|predictive model|embeddings|neural network|rag pipeline)\b/i },
  { id: 'messaging', name: 'Message Broker & Streaming', pattern: /\b(?:kafka|rabbitmq|message broker|event stream|pubsub|event bus)\b/i },
  { id: 'analytics', name: 'Analytics & Telemetry', pattern: /\b(?:analytics|telemetry|metrics aggregation|data warehouse|olap)\b/i },
  { id: 'notifications', name: 'Notifications & Webhooks', pattern: /\b(?:notification|webhook|email delivery|push notification|sms dispatch)\b/i },
  { id: 'realtime', name: 'Real-Time Streaming & WebSockets', pattern: /\b(?:websocket|web sockets?|real[- ]time|live view|liveview|presence|chat room|zero[- ]downtime|fault[- ]tolerant|actor model|beam|elixir|phoenix)\b/i },
  { id: 'crud', name: 'Core Business Entity CRUD', pattern: /\b(?:crud|product catalog|user management|order management|inventory)\b/i },
];

const CPU_BOUND_PATTERNS = [
  /\b(?:transcoding|video encoding|heavy math|cryptography|encryption|binary parsing|sub-millisecond|neural net|model inference|matrix multiplication|compression)\b/i,
];

const IO_BOUND_PATTERNS = [
  /\b(?:crud|api gateway|rest endpoint|database query|http handler|webhook|json api|user session|admin panel|file upload|websocket)\b/i,
];

export function evaluateScaleAndLoad(text: string): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  for (const pattern of SCALE_LOAD_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      score += 2.5;
      reasons.push(`Detected scale/load indicator: "${match[0]}"`);
    }
  }

  // Check specific quantitative concurrency markers
  const concurrencyMatch = text.match(/\b(\d+)\s*(?:k|kilo)\s*(?:persistent\s+)?(?:web\s*sockets?|concurrent|users|rps|connections|clients)\b/i);
  if (concurrencyMatch) {
    const count = parseInt(concurrencyMatch[1], 10) * 1000;
    if (count >= 5000) {
      score = Math.max(score, 8.5);
      reasons.push(`Explicit high concurrency target: ${count.toLocaleString()} concurrent units`);
    }
  }

  const rawConcurrency = text.match(/\b(\d{4,})\s*(?:persistent\s+)?(?:web\s*sockets?|concurrent|users|rps|connections|clients)\b/i);
  if (rawConcurrency) {
    const count = parseInt(rawConcurrency[1], 10);
    if (count >= 5000) {
      score = Math.max(score, 8.5);
      reasons.push(`Explicit high concurrency target: ${count.toLocaleString()} concurrent units`);
    }
  }

  if (/\bhundreds of thousands of (?:persistent\s+)?(?:web\s*sockets?|connections|users)/i.test(text)) {
    score = Math.max(score, 9.0);
    reasons.push('Explicit ultra-high concurrency target: hundreds of thousands of persistent connections');
  }

  const boundedScore = Number(Math.min(10, Math.max(0, score)).toFixed(1));
  return { score: boundedScore, reasons };
}

export function evaluateDomainDecoupling(text: string): {
  score: number;
  identifiedDomains: Array<{ id: string; name: string }>;
  reasons: string[];
} {
  const identifiedDomains: Array<{ id: string; name: string }> = [];
  const reasons: string[] = [];

  for (const domain of DOMAIN_DEFINITIONS) {
    if (domain.pattern.test(text)) {
      identifiedDomains.push({ id: domain.id, name: domain.name });
      reasons.push(`Identified operational domain boundary: ${domain.name}`);
    }
  }

  let score = 0;
  if (identifiedDomains.length >= 4) {
    score = 9.0;
  } else if (identifiedDomains.length === 3) {
    score = 8.0;
  } else if (identifiedDomains.length === 2) {
    score = 7.0;
  } else if (identifiedDomains.length === 1) {
    score = 3.5;
  } else {
    score = 1.0;
  }

  return { score, identifiedDomains, reasons };
}

export function evaluateResourceIntensity(text: string): {
  score: number;
  isCpuBound: boolean;
  isIoBound: boolean;
  reasons: string[];
} {
  const isCpuBound = CPU_BOUND_PATTERNS.some((p) => p.test(text));
  const isIoBound = IO_BOUND_PATTERNS.some((p) => p.test(text));
  const reasons: string[] = [];

  let score = 0;
  if (isCpuBound && isIoBound) {
    score = 8.5;
    reasons.push('Mixed workload detected: CPU-bound computation kernels co-existing with I/O-bound API/CRUD pipelines');
  } else if (isCpuBound) {
    score = 5.5;
    reasons.push('Predominantly CPU-bound computational workload');
  } else if (isIoBound) {
    score = 3.0;
    reasons.push('Predominantly I/O-bound standard API workload');
  } else {
    score = 1.0;
    reasons.push('Uniform or standard resource workload');
  }

  return { score, isCpuBound, isIoBound, reasons };
}

export function assignTechStackForDomain(domainId: string, textContext: string = ''): {
  scenario: 1 | 2 | 3 | 4 | 5;
  stack: TechStackAssignment;
} {
  const lowerDomain = domainId.toLowerCase();
  const lowerContext = textContext.toLowerCase();

  // Scenario 5: Ultra-high concurrency, persistent WebSockets, real-time pipelines, zero-downtime tolerance
  if (
    lowerDomain === 'realtime' ||
    lowerDomain === 'websocket' ||
    lowerDomain === 'presence' ||
    /websocket|real[- ]time|chat|presence|liveview|elixir|phoenix|fault[- ]tolerant|zero[- ]downtime/.test(lowerDomain) ||
    /websocket|web sockets?|real[- ]time (?:messaging|orchestration|pipeline)|hundreds of thousands of (?:persistent )?(?:connections|websockets)|zero[- ]downtime(?: tolerance)?|presence channel/i.test(lowerContext)
  ) {
    return {
      scenario: 5,
      stack: {
        ...TECH_STACK_MATRIX.E,
        role: 'realtime-systems-engineer',
      },
    };
  }

  // Scenario 3: Heavy math, raw binary streams, video transcoding, sub-ms encryption
  if (
    lowerDomain === 'compute' ||
    /transcoding|video|crypto|math|binary|encryption|kernel|compression/.test(lowerDomain) ||
    /transcod(?:e|ing)|heavy math|cryptography|binary stream|encryption pipeline/i.test(lowerContext)
  ) {
    return {
      scenario: 3,
      stack: {
        ...TECH_STACK_MATRIX.C,
        role: 'systems-kernel-engineer',
      },
    };
  }

  // Scenario 4: Predictive modeling, deep learning, LLM routing, advanced data science
  if (
    lowerDomain === 'ai' ||
    /ai|llm|ml|data-science|inference|embedding|predictive/.test(lowerDomain) ||
    /ai inference|llm routing|deep learning|predictive model/i.test(lowerContext)
  ) {
    return {
      scenario: 4,
      stack: {
        ...TECH_STACK_MATRIX.D,
        role: 'ai-inference-engineer',
      },
    };
  }

  // Scenario 2: Massive data throughput, routing millions of stateless messages, internal cluster routing
  if (
    lowerDomain === 'messaging' ||
    lowerDomain === 'networking' ||
    /throughput|stateless|routing|cluster|network|broker|proxy|dispatch/.test(lowerDomain) ||
    /stateless message|internal cluster|routing millions|high throughput/i.test(lowerContext)
  ) {
    return {
      scenario: 2,
      stack: {
        ...TECH_STACK_MATRIX.A,
        role: 'distributed-network-engineer',
      },
    };
  }

  // Scenario 1 (Default): Standard CRUD, rapid business logic iterations, public-facing API Gateway
  return {
    scenario: 1,
    stack: {
      ...TECH_STACK_MATRIX.B,
      role: lowerDomain === 'gateway' ? 'gateway-orchestrator' : 'crud-engineer',
    },
  };
}

export function getCommunicationContract(isMicroservices: boolean): MicroserviceCommunicationContract {
  return {
    northSouth: {
      protocol: 'REST HTTP/JSON',
      schemaStandard: 'OpenAPI 3.1',
      tlsVersion: 'TLS 1.3',
    },
    eastWest: {
      protocol: isMicroservices ? 'gRPC' : 'gRPC',
      transport: 'HTTP/2 + Protobuf',
      prohibitHttpJson: isMicroservices,
    },
  };
}

export function formatArchitectureManifestToon(
  verdict: ArchitectureVerdict,
  vectors: ArchitectureVectorScores,
  services: DecomposedService[],
  communication: MicroserviceCommunicationContract
): string {
  const lines: string[] = [
    `architecture_manifest: {verdict, allow_monolith, scale_score, domain_score, resource_score, composite_score}`,
    `  ${verdict}, ${verdict === 'monolith'}, ${vectors.scaleAndLoad}, ${vectors.domainDecoupling}, ${vectors.resourceIntensity}, ${vectors.compositeScore}`,
    ``,
    `communication_standards: {boundary, protocol, transport, http_json_prohibited}`,
    `  North-South (Client -> Gateway), ${communication.northSouth.protocol}, TLS 1.3 (OpenAPI 3.1), false`,
    `  East-West (Service -> Service), ${communication.eastWest.protocol}, ${communication.eastWest.transport}, ${communication.eastWest.prohibitHttpJson}`,
    ``,
    `services [${services.length}]: {name, domain, scenario, language, framework, runtime, role, port, grpc_port}`,
  ];

  for (const s of services) {
    lines.push(
      `  ${s.name}, ${s.domain}, ${s.scenario}, ${s.stack.language}, ${s.stack.framework}, ${s.stack.runtime}, ${s.stack.role}, ${s.port}, ${s.grpcPort || 0}`
    );
  }

  return lines.join('\n');
}

export function evaluateArchitecture(spec: string): ArchitectureEvaluationResult {
  const text = spec.trim();
  if (!text) {
    throw new Error('Project specification text must not be empty');
  }

  const scaleResult = evaluateScaleAndLoad(text);
  const domainResult = evaluateDomainDecoupling(text);
  const resourceResult = evaluateResourceIntensity(text);

  const compositeScore = Number(
    ((scaleResult.score * 0.35) + (domainResult.score * 0.40) + (resourceResult.score * 0.25)).toFixed(1)
  );

  const vectors: ArchitectureVectorScores = {
    scaleAndLoad: scaleResult.score,
    domainDecoupling: domainResult.score,
    resourceIntensity: resourceResult.score,
    compositeScore,
  };

  const allReasons = [
    ...scaleResult.reasons,
    ...domainResult.reasons,
    ...resourceResult.reasons,
  ];

  // Hard Trigger: If any single vector >= 7.0 OR composite score >= 6.0
  const isMicroservices =
    scaleResult.score >= 7.0 ||
    domainResult.score >= 7.0 ||
    resourceResult.score >= 7.0 ||
    compositeScore >= 6.0;

  const verdict: ArchitectureVerdict = isMicroservices ? 'microservices' : 'monolith';
  const allowMonolith = !isMicroservices;

  if (isMicroservices) {
    allReasons.unshift(
      `[ARCHITECTURE ENFORCEMENT] Microservices Architecture mandatory (scale=${scaleResult.score}, domains=${domainResult.score}, resource=${resourceResult.score}, composite=${compositeScore}). Scaffold-building monolith is LOCKED OUT.`
    );
  } else {
    allReasons.unshift(
      `[ARCHITECTURE ENFORCEMENT] Specification scale and domains remain within monolithic boundaries (composite=${compositeScore}). Monolithic scaffolding allowed.`
    );
  }

  // Decompose services
  const services: DecomposedService[] = [];
  let baseHttpPort = 8080;
  let baseGrpcPort = 50051;

  if (isMicroservices) {
    // Ensure API Gateway exists as service #1
    const gatewayAssignment = assignTechStackForDomain('gateway', 'api gateway bff');
    services.push({
      name: 'api-gateway',
      domain: 'API Gateway & Ingress Orchestration',
      scenario: gatewayAssignment.scenario,
      stack: gatewayAssignment.stack,
      description: 'Public-facing REST API Gateway, routing, authentication translation, and rate limiting',
      port: baseHttpPort++,
      grpcPort: baseGrpcPort++,
    });

    for (const d of domainResult.identifiedDomains) {
      if (d.id === 'gateway') continue;
      const { scenario, stack } = assignTechStackForDomain(d.id, text);
      const serviceName = `${d.id}-service`;
      services.push({
        name: serviceName,
        domain: d.name,
        scenario,
        stack,
        description: `Decoupled domain service for ${d.name}`,
        port: baseHttpPort++,
        grpcPort: baseGrpcPort++,
      });
    }

    // If only 1 domain was identified beside gateway, guarantee at least 2 distinct domain services
    if (services.length < 3) {
      const isCpu = resourceResult.isCpuBound;
      const extraDomain = isCpu ? 'compute' : 'crud';
      const extraName = isCpu ? 'compute-kernel-service' : 'business-core-service';
      const { scenario, stack } = assignTechStackForDomain(extraDomain, text);
      services.push({
        name: extraName,
        domain: isCpu ? 'Computational Kernel' : 'Core Business Entities',
        scenario,
        stack,
        description: `Dedicated ${stack.competency} worker service`,
        port: baseHttpPort++,
        grpcPort: baseGrpcPort++,
      });
    }
  } else {
    // Single monolithic service definition
    services.push({
      name: 'monolith-app',
      domain: 'Unified Monolithic Application',
      scenario: 1,
      stack: {
        ...TECH_STACK_MATRIX.B,
        role: 'full-stack-engineer',
      },
      description: 'Unified application process containing all routes and business logic',
      port: 3000,
    });
  }

  const communication = getCommunicationContract(isMicroservices);
  const manifestToon = formatArchitectureManifestToon(verdict, vectors, services, communication);

  return {
    verdict,
    allowMonolith,
    vectors,
    reasons: allReasons,
    services,
    communication,
    manifestToon,
  };
}
