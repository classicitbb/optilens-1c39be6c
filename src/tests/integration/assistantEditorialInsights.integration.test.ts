import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");
const migration = readFileSync(
  resolve(repoRoot, "supabase/migrations/20260807150000_assistant_editorial_insights.sql"),
  "utf8",
);
const assistantFunction = readFileSync(
  resolve(repoRoot, "supabase/functions/companion-assistant/index.ts"),
  "utf8",
);

describe("assistant editorial insights", () => {
  it("stores only anonymous recurring-gap signals and creates paired Activity channels", () => {
    expect(migration).toContain("assistant_editorial_signals");
    expect(migration).toContain("session_hash text NOT NULL");
    expect(migration).not.toContain("query text");
    expect(migration).not.toContain("transcript text");
    expect(migration).toContain("interval '30 days'");
    expect(migration).toContain("IF v_count < 5 THEN");
    expect(migration).toContain("'agent_todo'");
    expect(migration).toContain("'todo'");
    expect(migration).toContain("Human approval is required before publication.");
  });

  it("records only unresolved handoffs through the service-role path", () => {
    expect(assistantFunction).toContain('payload.answerMode !== "support_handoff"');
    expect(assistantFunction).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(assistantFunction).toContain('"record_assistant_editorial_signal"');
  });
});
