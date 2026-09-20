import type { InternalModel } from "../types.js";
import { score, TypeSafeClient } from "../../client.js";

export class JevClassifier {
    private client: TypeSafeClient;

    constructor(customClient?: TypeSafeClient) {
        this.client = customClient || new TypeSafeClient();
    }

    async classify(query: string, models: InternalModel[]): Promise<number[]> {
        const response = await this.client.systemOne({
            state: { document: query },
            questions: {
                tier: score("Which model tier should handle this query?", models.map(m => m.description) as [string, string, ...string[]]),
            },
        });

        return Object.values(response.answers.tier.probabilities);
    }
}