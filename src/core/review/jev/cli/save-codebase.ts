import { saveReview } from "./execute.js";
import { runCodebaseReview } from "../review/codebase.js";

await saveReview(runCodebaseReview);
