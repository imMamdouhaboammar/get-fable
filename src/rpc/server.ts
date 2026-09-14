import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { canonicalSkillIds } from '../core/skill-registry.js';
import { logInfo, logError } from '../utils.js';
import type {
  FableRpcServerOptions,
  TaskExecutionRequest,
  TaskEvent,
  SkillExecutionRequest,
  SkillExecutionResponse,
  WorkerHealthResponse,
  CancelTaskRequest,
  CancelTaskResponse,
} from './types.js';

function resolveDefaultProtoPath(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidateLocal = path.resolve(currentDir, '../../proto/fable_worker.proto');
  if (fs.existsSync(candidateLocal)) return candidateLocal;
  const candidateDist = path.resolve(currentDir, '../proto/fable_worker.proto');
  if (fs.existsSync(candidateDist)) return candidateDist;
  return path.resolve(process.cwd(), 'proto/fable_worker.proto');
}

export class FableWorkerServer {
  private server: grpc.Server;
  private host: string;
  private port: number;
  private workerId: string;
  private startedAt: number = 0;
  private activeTasks = new Map<string, { cancelled: boolean }>();
  private options: FableRpcServerOptions;
  private boundPort: number = 0;

  constructor(options: FableRpcServerOptions = {}) {
    this.options = options;
    this.host = options.host || '127.0.0.1';
    this.port = options.port || 50051;
    this.workerId = options.workerId || `worker-${process.pid}-${Date.now().toString(36)}`;
    this.server = new grpc.Server();

    const protoFile = options.protoPath || resolveDefaultProtoPath();
    if (!fs.existsSync(protoFile)) {
      throw new Error(`Protobuf file not found at ${protoFile}`);
    }

    const packageDefinition = protoLoader.loadSync(protoFile, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    const workerService = protoDescriptor.fable?.worker?.v1?.WorkerService;

    if (!workerService) {
      throw new Error('WorkerService definition not found in loaded protobuf');
    }

    this.server.addService(workerService.service, {
      executeTask: this.handleExecuteTask.bind(this),
      executeSkill: this.handleExecuteSkill.bind(this),
      getWorkerHealth: this.handleGetWorkerHealth.bind(this),
      cancelTask: this.handleCancelTask.bind(this),
    });
  }

  private async handleExecuteTask(
    call: grpc.ServerWritableStream<TaskExecutionRequest, TaskEvent>
  ) {
    const request = call.request;
    const taskId = request.task_id || `task-${Date.now()}`;
    const runId = request.run_id || 'run-default';
    const taskState = { cancelled: false };

    this.activeTasks.set(taskId, taskState);

    const emit = (event: Partial<TaskEvent>) => {
      const fullEvent: TaskEvent = {
        event_id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        task_id: taskId,
        run_id: runId,
        timestamp: Date.now(),
        event_type: event.event_type || 'log',
        message: event.message || '',
        payload_json: event.payload_json || '{}',
        is_terminal: Boolean(event.is_terminal),
        error: event.error || '',
      };
      call.write(fullEvent);
    };

    emit({
      event_type: 'started',
      message: `Task ${taskId} execution initiated on worker ${this.workerId}`,
    });

    try {
      if (this.options.taskHandler) {
        await this.options.taskHandler(request, emit, () => taskState.cancelled);
      } else {
        // Default simulated bounded task execution
        emit({
          event_type: 'tool_call',
          message: `Resolving required capabilities: ${(request.required_capabilities || []).join(', ') || 'none'}`,
        });

        if (taskState.cancelled) {
          emit({
            event_type: 'cancelled',
            message: `Task ${taskId} was cancelled by caller`,
            is_terminal: true,
          });
          call.end();
          return;
        }

        emit({
          event_type: 'mutation',
          message: 'Executing bounded task lifecycle updates',
          payload_json: JSON.stringify({ status: 'in_progress', verified: false }),
        });

        emit({
          event_type: 'completed',
          message: `Task ${taskId} completed successfully`,
          is_terminal: true,
          payload_json: JSON.stringify({ success: true, taskId }),
        });
      }
    } catch (err: any) {
      emit({
        event_type: 'failed',
        message: `Task ${taskId} failed: ${err.message}`,
        is_terminal: true,
        error: err.message,
      });
    } finally {
      this.activeTasks.delete(taskId);
      call.end();
    }
  }

  private async handleExecuteSkill(
    call: grpc.ServerUnaryCall<SkillExecutionRequest, SkillExecutionResponse>,
    callback: grpc.sendUnaryData<SkillExecutionResponse>
  ) {
    const request = call.request;
    try {
      if (this.options.skillHandler) {
        const response = await this.options.skillHandler(request);
        callback(null, response);
        return;
      }

      // Default execution logic conforming to SkillBehaviorProvider
      const canonical = canonicalSkillIds();
      const isValidSkill = canonical.includes(request.skill_id as any);

      const action = request.action_vocabulary && request.action_vocabulary.length > 0
        ? request.action_vocabulary[0]
        : request.case_id || 'executed';

      callback(null, {
        action,
        selected_skill: isValidSkill ? request.skill_id : 'fable-execute',
        produces: 'verified-artifact',
        gates: ['bounded-scope', 'named-acceptance'],
        structure: ['SPEC.md', 'LEDGER.md'],
      });
    } catch (err: any) {
      callback({
        code: grpc.status.INTERNAL,
        message: err.message || 'Skill execution failed',
      });
    }
  }

  private handleGetWorkerHealth(
    _call: grpc.ServerUnaryCall<unknown, WorkerHealthResponse>,
    callback: grpc.sendUnaryData<WorkerHealthResponse>
  ) {
    const uptime = this.startedAt > 0 ? Math.floor((Date.now() - this.startedAt) / 1000) : 0;
    callback(null, {
      status: this.activeTasks.size > 10 ? 'BUSY' : 'SERVING',
      worker_id: this.workerId,
      uptime_seconds: uptime,
      supported_skills: canonicalSkillIds(),
      active_tasks: this.activeTasks.size,
    });
  }

  private handleCancelTask(
    call: grpc.ServerUnaryCall<CancelTaskRequest, CancelTaskResponse>,
    callback: grpc.sendUnaryData<CancelTaskResponse>
  ) {
    const { task_id, reason } = call.request;
    const task = this.activeTasks.get(task_id);
    if (!task) {
      callback(null, {
        cancelled: false,
        message: `Task ${task_id} not found or already terminated`,
      });
      return;
    }
    task.cancelled = true;
    logInfo(`[FableWorkerServer] Cancelled task ${task_id}: ${reason}`);
    callback(null, {
      cancelled: true,
      message: `Task ${task_id} marked for cancellation`,
    });
  }

  public async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      const address = `${this.host}:${this.port}`;
      this.server.bindAsync(
        address,
        grpc.ServerCredentials.createInsecure(),
        (err, boundPort) => {
          if (err) {
            logError(`Failed to bind FableWorkerServer on ${address}: ${err.message}`);
            return reject(err);
          }
          this.boundPort = boundPort;
          this.startedAt = Date.now();
          logInfo(`[FableWorkerServer] Worker ${this.workerId} listening on ${this.host}:${boundPort}`);
          resolve(boundPort);
        }
      );
    });
  }

  public getPort(): number {
    return this.boundPort;
  }

  public getWorkerId(): string {
    return this.workerId;
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.tryShutdown((err) => {
        if (err) {
          this.server.forceShutdown();
        }
        resolve();
      });
    });
  }
}
