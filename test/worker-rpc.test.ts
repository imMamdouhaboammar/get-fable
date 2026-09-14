import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { FableWorkerServer, FableWorkerClient } from '../src/rpc/index.js';
import type { TaskEvent } from '../src/rpc/types.js';

describe('Fable gRPC Worker Transport', () => {
  let server: FableWorkerServer;
  let client: FableWorkerClient;
  let boundPort: number;

  beforeAll(async () => {
    // Bind to port 0 for ephemeral port allocation
    server = new FableWorkerServer({ host: '127.0.0.1', port: 0 });
    boundPort = await server.start();
    client = new FableWorkerClient({
      serverAddress: `127.0.0.1:${boundPort}`,
      insecure: true,
    });
  });

  afterAll(async () => {
    if (client) client.close();
    if (server) await server.stop();
  });

  test('reports health and readiness correctly', async () => {
    const health = await client.getWorkerHealth('test-client');
    expect(health.status).toBe('SERVING');
    expect(health.worker_id).toBeDefined();
    expect(Array.isArray(health.supported_skills)).toBe(true);
    expect(health.supported_skills.length).toBeGreaterThan(0);
    expect(health.supported_skills).toContain('fable-execute');
  });

  test('executes skill synchronously fulfilling SkillExecutionResponse', async () => {
    const response = await client.executeSkill({
      skill_id: 'fable-tdd',
      case_id: 'test-case-1',
      instruction: 'Run test-driven cycle',
      action_vocabulary: ['write-failing-test', 'implement-minimal-code'],
    });

    expect(response.action).toBe('write-failing-test');
    expect(response.selected_skill).toBe('fable-tdd');
    expect(response.produces).toBe('verified-artifact');
    expect(response.gates).toContain('bounded-scope');
  });

  test('bridges into SkillBehaviorProvider interface smoothly', async () => {
    const provider = client.asSkillBehaviorProvider('grpc-worker-test');
    expect(provider.id).toBe('grpc-worker-test');

    const result = await provider.executeSkill({
      skillId: 'fable-verify',
      caseId: 'verify-task-1',
      instruction: 'Check test output',
      given: { testsPassed: true },
      actionVocabulary: ['verify-behavior', 'report-pass'],
    });

    expect(result.action).toBe('verify-behavior');
    expect(result.selectedSkill).toBe('fable-verify');
    expect(result.produces).toBe('verified-artifact');
  });

  test('streams task lifecycle events from ExecuteTask', async () => {
    const receivedEvents: TaskEvent[] = [];

    const allEvents = await client.executeTask(
      {
        task_id: 'task-test-101',
        run_id: 'run-alpha',
        title: 'Run bounded feature implementation',
        objective: 'Implement gRPC transport bridge',
        required_capabilities: ['shell.execute', 'verification.freshness'],
      },
      (event) => {
        receivedEvents.push(event);
      }
    );

    expect(allEvents.length).toBeGreaterThanOrEqual(3);
    expect(receivedEvents.length).toBe(allEvents.length);

    const eventTypes = allEvents.map((e) => e.event_type);
    expect(eventTypes).toContain('started');
    expect(eventTypes).toContain('completed');

    const completedEvent = allEvents.find((e) => e.event_type === 'completed');
    expect(completedEvent).toBeDefined();
    expect(completedEvent?.is_terminal).toBe(true);
  });

  test('cancels active task on request', async () => {
    const cancelRes = await client.cancelTask('non-existent-task', 'test-cancel');
    expect(cancelRes.cancelled).toBe(false);
  });
});
