import { Router } from "./router.js";
import type { ModelConfig, RouterConfig, RouterResult } from "./types.js";
import type { TypeSafeClient } from "../client.js";

export { Router } from "./router.js";
export type { ModelConfig, RouterConfig, RouterResult } from "./types.js";

export const DEFAULT_AGENT_MODELS: ModelConfig[] = [
  {
    name: "flash_lite",
    cost: 1,
    description: "Quick research lookups, simple file reads, syntax formatting, and fast deterministic checks",
  },
  {
    name: "flash",
    cost: 3,
    description: "Standard feature development, unit test creation, bounded bug fixes, and typical coding tasks",
  },
  {
    name: "pro",
    cost: 10,
    description: "Complex distributed architecture, large multi-module refactorings, deep debugging, and multi-agent deliberation",
  },
];

export async function routeTaskToOptimalModel(
  task: string,
  options?: {
    models?: ModelConfig[];
    client?: TypeSafeClient;
    lambda?: number;
  }
): Promise<RouterResult> {
  const models = options?.models || DEFAULT_AGENT_MODELS;
  const router = new Router({
    models,
    client: options?.client,
    lambda: options?.lambda,
  });
  return router.route(task);
}