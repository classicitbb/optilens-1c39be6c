import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/pages/admin/helpdesk/HelpdeskTicketsPage.tsx"), "utf8");

describe("Helpdesk create-ticket dialog loading state", () => {
  it("keeps unloaded option fallbacks stable while the opening effect initializes the form", () => {
    expect(source).toContain("const EMPTY_STAGES: StageOption[] = [];");
    expect(source).toContain("const EMPTY_PRIORITIES: PriorityOption[] = [];");
    expect(source).toContain("data: stages = EMPTY_STAGES");
    expect(source).toContain("data: priorities = EMPTY_PRIORITIES");
  });
});
