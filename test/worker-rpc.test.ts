import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { FableWorkerServer, FableWorkerClient } from '../src/rpc/index.js';
import type { TaskEvent } from '../src/rpc/types.js';

describe('Fable gRPC Worker Transport', () => {
  let server: FableWorkerServer;
  let client: FableWorkerClient;
  let boundPort: number;

  beforeAll(async () => {
    // Bind to port 0 for ephemeral port allocation
    server = new FableWorkerServer({
      host: '127.0.0.1',
      port: 0,
      skillHandler: async (req) => ({
        action: req.action_vocabulary?.[0] || 'executed',
        selected_skill: req.skill_id,
        produces: 'verified-artifact',
        gates: ['bounded-scope'],
        structure: ['SPEC.md'],
      }),
      taskHandler: async (req, emit) => {
        emit({
          event_id: 'fixture-tool-call',
          task_id: req.task_id,
          run_id: req.run_id,
          timestamp: Date.now(),
          event_type: 'tool_call',
          message: 'Explicit test handler invoked',
          is_terminal: false,
        });
        emit({
          event_id: 'fixture-complete',
          task_id: req.task_id,
          run_id: req.run_id,
          timestamp: Date.now(),
          event_type: 'completed',
          message: 'Explicit test handler completed',
          payload_json: JSON.stringify({ success: true, taskId: req.task_id }),
          is_terminal: true,
        });
      },
    });
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

  test('unconfigured workers fail closed instead of fabricating verified execution', async () => {
    const bareServer = new FableWorkerServer({ host: '127.0.0.1', port: 0 });
    const port = await bareServer.start();
    const bareClient = new FableWorkerClient({
      serverAddress: `127.0.0.1:${port}`,
      insecure: true,
    });
    try {
      const events = await bareClient.executeTask({
        task_id: 'no-executor',
        run_id: 'test-fail-closed',
        title: 'Do actual work',
        objective: 'Must not pretend to work',
      });
      expect(events.some((event) => event.event_type === 'failed')).toBe(true);
      expect(events.some((event) => event.event_type === 'completed')).toBe(false);
      expect(events.some((event) => event.event_type === 'mutation')).toBe(false);
      const health = await bareClient.getWorkerHealth();
      expect(health.status).toBe('NOT_SERVING');
      expect(health.supported_skills).toEqual([]);
      let executeSkillError: Error | null = null;
      try {
        await bareClient.executeSkill({
          skill_id: 'fable-tdd',
          case_id: 'no-skill-handler',
          instruction: 'Do actual work',
        });
      } catch (err: any) {
        executeSkillError = err;
      }
      expect(executeSkillError).not.toBeNull();
      expect(executeSkillError?.message).toContain('No skillHandler configured');
    } finally {
      bareClient.close();
      await bareServer.stop();
    }
  });

  test('cancels active task on request', async () => {
    const cancelRes = await client.cancelTask('non-existent-task', 'test-cancel');
    expect(cancelRes.cancelled).toBe(false);
  });
});
