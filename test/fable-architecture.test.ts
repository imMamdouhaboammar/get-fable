import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  assignTechStackForDomain,
  evaluateArchitecture,
  evaluateDomainDecoupling,
  evaluateResourceIntensity,
  evaluateScaleAndLoad,
  formatArchitectureManifestToon,
  getCommunicationContract,
  TECH_STACK_MATRIX,
} from '../src/core/architecture-eval.js';
import { validateSkillPackage } from '../src/core/skill-package.js';
import { routeTask } from '../src/core/task-router.js';
import { loadSkillRegistry } from '../src/core/skill-registry.js';

describe('fable-architecture: Vector 1 - Scale and Concurrency Evaluation', () => {
  test('scores >= 7.0 for explicit quantitative high concurrency (>= 5k)', () => {
    const spec = 'Design a trading platform supporting 10k concurrent users and 20000 rps';
    const result = evaluateScaleAndLoad(spec);
    expect(result.score).toBeGreaterThanOrEqual(7.0);
    expect(result.reasons.some((r) => r.includes('concurrency'))).toBe(true);
  });

  test('scores >= 7.0 for throughput indicators and low-latency targets', () => {
    const spec = 'Stateless message routing system processing millions of messages with sub-10ms p99 SLA horizontally scalable';
    const result = evaluateScaleAndLoad(spec);
    expect(result.score).toBeGreaterThanOrEqual(7.0);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test('scores low (< 7.0) for standard, non-concurrent workloads', () => {
    const spec = 'A simple personal blog with 50 readers per month and an about page';
    const result = evaluateScaleAndLoad(spec);
    expect(result.score).toBeLessThan(7.0);
    expect(result.score).toBe(0);
  });
});

describe('fable-architecture: Vector 2 - Domain Decoupling Evaluation', () => {
  test('scores >= 7.0 when 2 or more distinct operational domains are identified', () => {
    const spec = 'System with identity auth, payment billing stripe, and notification email delivery';
    const result = evaluateDomainDecoupling(spec);
    expect(result.score).toBeGreaterThanOrEqual(7.0);
    expect(result.identifiedDomains.length).toBeGreaterThanOrEqual(3);
    expect(result.identifiedDomains.some((d) => d.id === 'auth')).toBe(true);
    expect(result.identifiedDomains.some((d) => d.id === 'billing')).toBe(true);
    expect(result.identifiedDomains.some((d) => d.id === 'notifications')).toBe(true);
  });

  test('scores <= 3.5 for a single operational domain', () => {
    const spec = 'A standalone auth and jwt session manager';
    const result = evaluateDomainDecoupling(spec);
    expect(result.score).toBeLessThanOrEqual(3.5);
    expect(result.identifiedDomains.length).toBe(1);
  });

  test('scores 1.0 when no operational domain boundary keywords match', () => {
    const spec = 'A utility to format markdown files';
    const result = evaluateDomainDecoupling(spec);
    expect(result.score).toBe(1.0);
    expect(result.identifiedDomains.length).toBe(0);
  });
});

describe('fable-architecture: Vector 3 - Resource Intensity Evaluation', () => {
  test('scores 8.5 for mixed CPU-bound and I/O-bound workloads', () => {
    const spec = 'Video transcoding and cryptography alongside a REST api gateway and database query CRUD endpoints';
    const result = evaluateResourceIntensity(spec);
    expect(result.score).toBe(8.5);
    expect(result.isCpuBound).toBe(true);
    expect(result.isIoBound).toBe(true);
  });

  test('scores 5.5 for purely CPU-bound computational workloads', () => {
    const spec = 'High performance video encoding and binary parsing mathematical algorithms';
    const result = evaluateResourceIntensity(spec);
    expect(result.score).toBe(5.5);
    expect(result.isCpuBound).toBe(true);
    expect(result.isIoBound).toBe(false);
  });

  test('scores 3.0 for standard I/O-bound CRUD workloads', () => {
    const spec = 'Standard json api rest endpoints with database query crud and user session';
    const result = evaluateResourceIntensity(spec);
    expect(result.score).toBe(3.0);
    expect(result.isCpuBound).toBe(false);
    expect(result.isIoBound).toBe(true);
  });
});

describe('fable-architecture: Tech Stack Matrix & Polyglot Specialization', () => {
  test('Scenario 1: Default CRUD and API Gateway maps to Category B (TypeScript/NestJS)', () => {
    const gateway = assignTechStackForDomain('gateway', 'api gateway orchestration');
    expect(gateway.scenario).toBe(1);
    expect(gateway.stack.category).toBe('B');
    expect(gateway.stack.language).toBe('TypeScript');
    expect(gateway.stack.framework).toBe('NestJS');
    expect(gateway.stack.role).toBe('gateway-orchestrator');

    const crud = assignTechStackForDomain('crud', 'user management product catalog');
    expect(crud.scenario).toBe(1);
    expect(crud.stack.category).toBe('B');
    expect(crud.stack.role).toBe('crud-engineer');
  });

  test('Scenario 2: Distributed Networking and Message Broker maps to Category A (Go/Fiber)', () => {
    const messaging = assignTechStackForDomain('messaging', 'stateless message broker high throughput');
    expect(messaging.scenario).toBe(2);
    expect(messaging.stack.category).toBe('A');
    expect(messaging.stack.language).toBe('Go');
    expect(messaging.stack.framework).toBe('Fiber');
    expect(messaging.stack.role).toBe('distributed-network-engineer');
  });

  test('Scenario 3: Computational Kernels and Transcoding maps to Category C (Rust/Axum)', () => {
    const compute = assignTechStackForDomain('compute', 'heavy math binary stream video transcoding');
    expect(compute.scenario).toBe(3);
    expect(compute.stack.category).toBe('C');
    expect(compute.stack.language).toBe('Rust');
    expect(compute.stack.framework).toBe('Axum');
    expect(compute.stack.role).toBe('systems-kernel-engineer');
  });

  test('Scenario 4: AI & Machine Learning Inference maps to Category D (Python/FastAPI)', () => {
    const ai = assignTechStackForDomain('ai', 'deep learning llm routing neural network inference');
    expect(ai.scenario).toBe(4);
    expect(ai.stack.category).toBe('D');
    expect(ai.stack.language).toBe('Python');
    expect(ai.stack.framework).toBe('FastAPI');
    expect(ai.stack.role).toBe('ai-inference-engineer');
  });

  test('Scenario 5: Ultra-High Concurrency Real-Time and WebSockets maps to Category E (Elixir/Phoenix)', () => {
    const realtime = assignTechStackForDomain(
      'realtime',
      'managing hundreds of thousands of persistent web socket connections with real-time messaging orchestration and zero-downtime tolerance'
    );
    expect(realtime.scenario).toBe(5);
    expect(realtime.stack.category).toBe('E');
    expect(realtime.stack.language).toBe('Elixir');
    expect(realtime.stack.framework).toBe('Phoenix');
    expect(realtime.stack.role).toBe('realtime-systems-engineer');
  });
});

describe('fable-architecture: Microservice Communication Standards', () => {
  test('defines North-South REST HTTP/JSON with OpenAPI 3.1 and TLS 1.3', () => {
    const contract = getCommunicationContract(true);
    expect(contract.northSouth.protocol).toBe('REST HTTP/JSON');
    expect(contract.northSouth.schemaStandard).toBe('OpenAPI 3.1');
    expect(contract.northSouth.tlsVersion).toBe('TLS 1.3');
  });

  test('enforces East-West gRPC with Protobuf and prohibits HTTP/JSON for microservices', () => {
    const contract = getCommunicationContract(true);
    expect(contract.eastWest.protocol).toBe('gRPC');
    expect(contract.eastWest.transport).toBe('HTTP/2 + Protobuf');
    expect(contract.eastWest.prohibitHttpJson).toBe(true);
  });

  test('formatArchitectureManifestToon produces valid TOON structure', () => {
    const evalResult = evaluateArchitecture(
      'Fintech payment gateway with 15k concurrent users, auth identity, stripe billing, and fraud detection ai inference'
    );
    const toon = evalResult.manifestToon;
    expect(toon).toContain('architecture_manifest:');
    expect(toon).toContain('communication_standards:');
    expect(toon).toContain('services [');
    expect(toon).toContain('North-South (Client -> Gateway), REST HTTP/JSON');
    expect(toon).toContain('East-West (Service -> Service), gRPC, HTTP/2 + Protobuf, true');
  });
});

describe('fable-architecture: End-to-End Architectural Evaluation', () => {
  test('locks out monolith when scale, domains, or resources meet trigger threshold', () => {
    const spec = `
      Build a high-volume streaming and payments exchange handling 50k concurrent requests per second.
      Requires user identity authentication, payment transactions via stripe billing,
      heavy encryption and video transcoding, and real-time Kafka event streaming.
    `;
    const result = evaluateArchitecture(spec);

    expect(result.verdict).toBe('microservices');
    expect(result.allowMonolith).toBe(false);
    expect(result.vectors.scaleAndLoad).toBeGreaterThanOrEqual(7.0);
    expect(result.vectors.domainDecoupling).toBeGreaterThanOrEqual(7.0);
    expect(result.services.length).toBeGreaterThanOrEqual(3);

    // Verify presence of API Gateway and polyglot stack allocations
    const gateway = result.services.find((s) => s.name === 'api-gateway');
    expect(gateway).toBeDefined();
    expect(gateway?.stack.category).toBe('B');

    // Verify East-West communication constraints
    expect(result.communication.eastWest.prohibitHttpJson).toBe(true);
  });

  test('allows monolith when scale and domains remain low', () => {
    const spec = 'Build a simple personal portfolio site with a contact form and static markdown pages.';
    const result = evaluateArchitecture(spec);

    expect(result.verdict).toBe('monolith');
    expect(result.allowMonolith).toBe(true);
    expect(result.vectors.scaleAndLoad).toBeLessThan(7.0);
    expect(result.vectors.compositeScore).toBeLessThan(6.0);
    expect(result.services.length).toBe(1);
    expect(result.services[0].name).toBe('monolith-app');
  });

  test('throws descriptive error on empty specification text', () => {
    expect(() => evaluateArchitecture('')).toThrow('Project specification text must not be empty');
    expect(() => evaluateArchitecture('   ')).toThrow('Project specification text must not be empty');
  });
});

describe('fable-architecture: Skill Package Integrity & Schema v2', () => {
  test('validateSkillPackage verifies fable-architecture package is schema-compliant', () => {
    const validation = validateSkillPackage('fable-architecture');
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(validation.manifest?.schemaVersion).toBe(2);
    expect(validation.manifest?.scriptPolicy).toBe('data-only');
    expect(validation.resources.length).toBeGreaterThanOrEqual(10);
  });

  test('canonical package contains required templates and references', () => {
    const skillDir = path.join(process.cwd(), 'skills', 'fable-architecture');
    expect(fs.existsSync(path.join(skillDir, 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(skillDir, 'skill.package.json'))).toBe(true);
    expect(fs.existsSync(path.join(skillDir, 'agents', 'openai.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(skillDir, 'templates', 'microservices-manifest.toon'))).toBe(true);
    expect(fs.existsSync(path.join(skillDir, 'templates', 'docker-compose.microservices.yml'))).toBe(true);
    expect(fs.existsSync(path.join(skillDir, 'templates', 'service-contract.proto'))).toBe(true);
    expect(fs.existsSync(path.join(skillDir, 'references', 'tech-stack-matrix.md'))).toBe(true);
    expect(fs.existsSync(path.join(skillDir, 'references', 'communication-standards.md'))).toBe(true);
    expect(fs.existsSync(path.join(skillDir, 'references', 'vector-scoring.md'))).toBe(true);
    expect(fs.existsSync(path.join(skillDir, 'references', 'subagent-role-distribution.md'))).toBe(true);
    expect(fs.existsSync(path.join(skillDir, 'examples', 'fintech-scale-walkthrough.md'))).toBe(true);
    expect(fs.existsSync(path.join(skillDir, 'evals', 'scenarios.json'))).toBe(true);
    expect(fs.existsSync(path.join(skillDir, 'scripts', 'evaluate-architecture.py'))).toBe(true);
  });
});

describe('fable-architecture: Task Router Integration', () => {
  const registry = loadSkillRegistry();

  test('routes microservice and architecture evaluation requests to fable-architecture', () => {
    const prompt = 'Evaluate architecture and enforce microservices for our distributed trading platform with 10k rps';
    const decision = routeTask(prompt, null, registry);

    expect(decision.selectedSkill).toBe('fable-architecture');
    expect(decision.taskShape).toBe('architecture');
    expect(decision.requiresPlan).toBe(true);
    expect(decision.reasons.some((r) => r.includes('architecture'))).toBe(true);
  });
});
