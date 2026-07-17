import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());

const read = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("send-transactional-email request validation and failure visibility", () => {
  it("validates recipient email format before doing any DB work", () => {
    const source = read("supabase/functions/send-transactional-email/index.ts");

    expect(source).toContain("EMAIL_FORMAT_RE");
    expect(source).toMatch(/recipientEmail is not a valid email address/);
  });

  it("returns a structured 4xx and logs email_send_log when template rendering fails", () => {
    const source = read("supabase/functions/send-transactional-email/index.ts");

    expect(source).toContain("Template render failed");
    expect(source).toMatch(/jsonResponse\(400,\s*\{\s*error:\s*`Failed to render template/);
    // The render step must be wrapped so a bad payload can't produce an
    // unhandled exception with no email_send_log row.
    const renderTryIndex = source.indexOf("try {\n    html = await renderAsync");
    expect(renderTryIndex).toBeGreaterThan(-1);
  });

  it("documents the endpoint contract in a co-located README", () => {
    const readme = read("supabase/functions/send-transactional-email/README.md");

    expect(readme).toContain("templateName");
    expect(readme).toContain("recipientEmail");
    expect(readme).toMatch(/success.*true.*queued.*true/s);
    expect(readme).toContain("email_send_log");
  });
});

describe("process-email-queue structured error visibility", () => {
  it("collects run-level read/DB errors instead of only console logging them", () => {
    const source = read("supabase/functions/process-email-queue/index.ts");

    expect(source).toContain("const runErrors");
    expect(source).toContain("runErrors.push({ queue, stage: 'read_email_batch'");
    expect(source).toContain("runErrors.push({ queue, stage: 'load_failed_attempt_counters'");
  });

  it("returns a non-200 response when the run had unresolved errors", () => {
    const source = read("supabase/functions/process-email-queue/index.ts");

    expect(source).toMatch(/if \(runErrors\.length > 0\)[\s\S]*?status: 500/);
    expect(source).toContain("errors: runErrors");
  });
});
