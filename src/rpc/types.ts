export interface TaskExecutionRequest {
  task_id: string;
  run_id: string;
  title: string;
  objective: string;
  required_capabilities?: string[];
  input_artifacts?: string[];
  parameters?: Record<string, string>;
  timeout_ms?: number | string;
}

export interface TaskEvent {
  event_id: string;
  task_id: string;
  run_id: string;
  timestamp: number | string;
  event_type: 'started' | 'log' | 'tool_call' | 'mutation' | 'completed' | 'failed' | 'cancelled';
  message: string;
  payload_json?: string;
  is_terminal: boolean;
  error?: string;
}

export interface SkillExecutionRequest {
  skill_id: string;
  case_id: string;
  instruction: string;
  given_json?: string;
  action_vocabulary?: string[];
}

export interface SkillExecutionResponse {
  action: string;
  selected_skill?: string;
  produces?: string;
  gates?: string[];
  structure?: string[];
}

export interface WorkerHealthRequest {
  client_id?: string;
}

export interface WorkerHealthResponse {
  status: 'SERVING' | 'BUSY' | 'NOT_SERVING';
  worker_id: string;
  uptime_seconds: number | string;
  supported_skills: string[];
  active_tasks: number;
}

export interface CancelTaskRequest {
  task_id: string;
  reason: string;
}

export interface CancelTaskResponse {
  cancelled: boolean;
  message: string;
}

export interface FableRpcServerOptions {
  host?: string;
  port?: number;
  workerId?: string;
  protoPath?: string;
  taskHandler?: (
    request: TaskExecutionRequest,
    emitEvent: (event: TaskEvent) => void,
    isCancelled: () => boolean
  ) => Promise<void>;
  skillHandler?: (request: SkillExecutionRequest) => Promise<SkillExecutionResponse>;
}

export interface FableRpcClientOptions {
  serverAddress: string;
  protoPath?: string;
  insecure?: boolean;
}
