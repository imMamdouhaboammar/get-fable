import { saveReview } from "./execute.js";
import { runChangeReview } from "../review/changes.js";

await saveReview(runChangeReview);
