import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const MIGRATION = "supabase/migrations/20260908120000_assistant_user_memory.sql";

describe("assistant_user_memory", () => {
  it("keeps every row owner-scoped and unreachable by anonymous callers", () => {
    const migration = read(MIGRATION);

    expect(migration).toContain("ALTER TABLE public.assistant_user_memory ENABLE ROW LEVEL SECURITY");
    for (const action of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      expect(migration).toContain(`FOR ${action}`);
    }
    // Every policy gate is the caller's own id — no role escape hatch.
    const gates = migration.match(/user_id = \(select auth\.uid\(\)\)/g) ?? [];
    expect(gates.length).toBeGreaterThanOrEqual(5);
    expect(migration).not.toMatch(/has_role|has_edit_role/);

    expect(migration).toContain("REVOKE ALL ON TABLE public.assistant_user_memory FROM PUBLIC, anon");
    expect(migration).toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_user_memory TO authenticated");
  });

  it("caps the prompt budget and blocks duplicate facts in the database", () => {
    const migration = read(MIGRATION);

    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.enforce_assistant_memory_budget");
    expect(migration).toContain("assistant memory budget exceeded");
    expect(migration).toContain("CREATE CONSTRAINT TRIGGER assistant_user_memory_budget");
    expect(migration).toContain(
      "CREATE UNIQUE INDEX assistant_user_memory_dedupe_idx\n  ON public.assistant_user_memory (user_id, surface, lower(btrim(content)))",
    );
    expect(migration).toContain("char_length(btrim(content)) BETWEEN 1 AND 500");
    expect(migration).toContain("CHECK (surface IN ('admin', 'portal'))");
  });

  it("keeps the client contract in step with the database constraints", () => {
    const api = read("src/features/admin/settings/assistantMemoryApi.ts");
    const migration = read(MIGRATION);

    expect(api).toContain("MEMORY_CONTENT_MAX = 500");
    expect(api).toContain("MEMORY_ACTIVE_MAX = 40");
    expect(migration).toContain("AND is_active\n  ) > 40");
    for (const category of ["general", "preference", "role", "workflow", "contact"]) {
      expect(api).toContain(`"${category}"`);
      expect(migration).toContain(`'${category}'`);
    }
  });

  it("exposes the memory manager to admins on the AI Agents settings tab", () => {
    const page = read("src/pages/admin/settings/IntegrationsPage.tsx");
    const card = read("src/pages/admin/settings/AssistantMemoryCard.tsx");

    expect(page).toContain('import AssistantMemoryCard from "./AssistantMemoryCard"');
    expect(page).toContain("<AssistantMemoryCard enabled={isAdmin} />");
    // A memory store with no delete path is a support burden the first time a
    // wrong fact sticks, so both single-row and bulk removal stay mandatory.
    expect(card).toContain("deleteAssistantMemory");
    expect(card).toContain("clearAssistantMemory");
  });
});
