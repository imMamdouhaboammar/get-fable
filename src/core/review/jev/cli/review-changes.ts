import { printReview } from "./execute.js";
import { runChangeReview } from "../review/changes.js";

await printReview(runChangeReview);
