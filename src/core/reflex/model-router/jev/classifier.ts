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

        const raw = response.answers?.tier?.probabilities;
        if (!raw || typeof raw !== 'object') {
            throw new Error("Invalid classifier response: missing tier probabilities from TypeSafe API");
        }
        const probabilities = Object.values(raw).map((p: any) => {
            const num = Number(p);
            if (!Number.isFinite(num)) {
                throw new Error("Invalid classifier response: non-finite probability value received");
            }
            return num;
        });
        if (probabilities.length !== models.length) {
            throw new Error(`Classifier response mismatch: expected ${models.length} model probabilities, received ${probabilities.length}`);
        }
        return probabilities;
    }
}