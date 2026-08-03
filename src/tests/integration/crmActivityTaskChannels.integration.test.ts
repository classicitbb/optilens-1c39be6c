import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");
const migration = readFileSync(
  resolve(repoRoot, "supabase/migrations/20260729130000_add_activity_task_channels.sql"),
  "utf8",
);

describe("CRM activity task-channel migration", () => {
  it("creates the two server-backed channels and backfills existing activities", () => {
    expect(migration).toContain("CREATE TYPE public.activity_task_channel AS ENUM ('todo', 'agent_todo')");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS task_channel public.activity_task_channel");
    expect(migration).toContain("SET task_channel = 'todo'");
    expect(migration).toContain("ALTER COLUMN task_channel SET NOT NULL");
    expect(migration).toContain("ALTER COLUMN task_channel SET DEFAULT 'todo'");
  });
});
