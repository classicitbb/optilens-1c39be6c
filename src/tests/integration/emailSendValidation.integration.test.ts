import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());

const read = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("managed email transport", () => {
  it("sends through the managed email API and records every outcome", () => {
    const source = read("supabase/functions/_shared/email/managed-send.ts");

    expect(source).toContain("sendLovableEmail");
    expect(source).toContain("recipient_suppressed");
    expect(source).toContain("email_send_log");
    expect(source).toMatch(/status: 'sent'/);
    expect(source).toMatch(/status: 'failed'/);
  });

  it("keeps the admin test sender restricted to registered templates", () => {
    const source = read("supabase/functions/send-test-email/index.ts");

    expect(source).toContain("requirePrivilegedAccess");
    expect(source).toContain("TEMPLATES[templateName]");
    expect(source).toContain("Invalid recipient email");
    expect(source).toContain("sendManagedEmail");
  });

  it("no longer ships a self-hosted email queue", () => {
    const config = read("supabase/config.toml");

    expect(config).not.toContain("process-email-queue");
    expect(config).not.toContain("send-transactional-email");
    expect(config).toContain("handle-email-events");
  });
});
