import { printReview } from "./execute.js";
import { runCodebaseReview } from "../review/codebase.js";

await printReview(runCodebaseReview);
