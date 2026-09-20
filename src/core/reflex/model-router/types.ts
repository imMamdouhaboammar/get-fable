export interface ModelConfig {
    name: string;
    cost: number;
    description: string;
}

export type InternalModel = ModelConfig & {
    normalizedCost: number;
};

import type { TypeSafeClient } from "../client.js";

export interface RouterConfig {
    models: ModelConfig[];
    client?: TypeSafeClient;
    lambda?: number;
}

export interface RouterResult {
    model: string;
    tier: number;
    probabilities: Record<string, number>;
}