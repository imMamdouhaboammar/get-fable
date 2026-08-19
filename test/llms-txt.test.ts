import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { buildLlmsTxt } from "../scripts/generate-llms-txt.ts";

const root = path.resolve(import.meta.dir, "..");

describe("llms.txt generation", () => {
  test("generates a deterministic local documentation index without external services", () => {
    const first = buildLlmsTxt(root);
    const second = buildLlmsTxt(root);
    expect(first).toBe(second);
    expect(first).toContain("# get-fable");
    expect(first).toContain("docs/ARCHITECTURE.md");
    expect(first).toContain("docs/USAGE.md");
    expect(first).not.toContain("jina.ai");
    expect(first).not.toContain("firecrawl");
  });

  test("checked-in public/llms.txt matches the generator", () => {
    expect(fs.readFileSync(path.join(root, "public", "llms.txt"), "utf-8")).toBe(buildLlmsTxt(root));
  });
});
