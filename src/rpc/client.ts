import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import type { SkillBehaviorProvider, SkillBehaviorRequest, SkillBehaviorResponse as CoreSkillResponse } from '../integrations/providers.js';
import type {
  FableRpcClientOptions,
  TaskExecutionRequest,
  TaskEvent,
  SkillExecutionRequest,
  SkillExecutionResponse,
  WorkerHealthResponse,
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

export class FableWorkerClient {
  private client: any;

  constructor(options: FableRpcClientOptions) {
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
    const WorkerService = protoDescriptor.fable?.worker?.v1?.WorkerService;

    if (!WorkerService) {
      throw new Error('WorkerService definition not found in loaded protobuf');
    }

    const credentials = options.insecure !== false
      ? grpc.credentials.createInsecure()
      : grpc.credentials.createSsl();

    this.client = new WorkerService(options.serverAddress, credentials);
  }

  public async executeTask(
    request: TaskExecutionRequest,
    onEvent?: (event: TaskEvent) => void
  ): Promise<TaskEvent[]> {
    return new Promise((resolve, reject) => {
      const events: TaskEvent[] = [];
      const call = this.client.executeTask(request);

      call.on('data', (event: TaskEvent) => {
        events.push(event);
        if (onEvent) {
          try {
            onEvent(event);
          } catch {
            // Non-fatal event callback error
          }
        }
      });

      call.on('error', (err: Error) => {
        reject(err);
      });

      call.on('end', () => {
        resolve(events);
      });
    });
  }

  public async executeSkill(request: SkillExecutionRequest): Promise<SkillExecutionResponse> {
    return new Promise((resolve, reject) => {
      this.client.executeSkill(request, (err: grpc.ServiceError | null, response: SkillExecutionResponse) => {
        if (err) return reject(err);
        resolve(response);
      });
    });
  }

  public async getWorkerHealth(clientId: string = 'fable-client'): Promise<WorkerHealthResponse> {
    return new Promise((resolve, reject) => {
      this.client.getWorkerHealth({ client_id: clientId }, (err: grpc.ServiceError | null, response: WorkerHealthResponse) => {
        if (err) return reject(err);
        resolve(response);
      });
    });
  }

  public async cancelTask(taskId: string, reason: string = 'User requested cancellation'): Promise<CancelTaskResponse> {
    return new Promise((resolve, reject) => {
      this.client.cancelTask({ task_id: taskId, reason }, (err: grpc.ServiceError | null, response: CancelTaskResponse) => {
        if (err) return reject(err);
        resolve(response);
      });
    });
  }

  public asSkillBehaviorProvider(providerId: string = 'grpc-worker-provider'): SkillBehaviorProvider {
    return {
      id: providerId,
      executeSkill: async (req: SkillBehaviorRequest): Promise<CoreSkillResponse> => {
        const res = await this.executeSkill({
          skill_id: req.skillId,
          case_id: req.caseId,
          instruction: req.instruction,
          given_json: JSON.stringify(req.given || {}),
          action_vocabulary: req.actionVocabulary,
        });

        return {
          action: res.action,
          selectedSkill: res.selected_skill,
          produces: res.produces,
          gates: res.gates,
          structure: res.structure,
        };
      },
    };
  }

  public close(): void {
    if (this.client && typeof this.client.close === 'function') {
      this.client.close();
    }
  }
}
