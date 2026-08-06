import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260806201552_crm_focus_desk.sql"), "utf8");
const executor = readFileSync(resolve(root, "supabase/functions/crm-activity-automation/index.ts"), "utf8");
const page = readFileSync(resolve(root, "src/pages/admin/crm/CrmActivitiesPage.tsx"), "utf8");
const dialog = readFileSync(resolve(root, "src/components/admin/CrmActivityDialog.tsx"), "utf8");

describe("CRM Focus Desk database foundation", () => {
  it("adds accountable task fields and preserves the existing activity store", () => {
    expect(migration).toContain("ALTER TABLE public.activities");
    expect(migration).toContain("owner_id uuid REFERENCES auth.users");
    expect(migration).toContain("priority IN ('urgent', 'high', 'normal', 'low')");
    expect(migration).toContain("ELSE 'inbox'");
    expect(migration).toContain("ALTER COLUMN status SET DEFAULT 'inbox'");
  });

  it("protects participants, recipes, and immutable review runs with staff RLS", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.activity_participants");
    expect(migration).toContain("PRIMARY KEY (activity_id, user_id, role)");
    expect(migration).toContain("ALTER TABLE public.activity_automation_runs ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("GRANT SELECT ON public.activity_automation_runs TO authenticated");
    expect(migration).not.toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_automation_runs TO authenticated");
  });

  it("creates automation review runs transactionally and executes them idempotently", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.transition_crm_activity");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.transition_crm_activity");
    expect(migration).toContain("idempotency_key text NOT NULL UNIQUE");
    expect(executor).toContain('.eq("status", "running")');
    expect(executor).toContain('status: "draft"');
    expect(executor).toContain("ignoreDuplicates: true");
  });

  it("ships synchronized board, calendar, and list views with ordinary editable controls", () => {
    expect(page).toContain('value="board"');
    expect(page).toContain('value="calendar"');
    expect(page).toContain('value="list"');
    expect(page).toContain("Priority shelf");
    expect(dialog).toContain('placeholder="@mention a staff member"');
    expect(dialog).not.toMatch(/navigator\.clipboard|readOnly/);
    expect(dialog).toContain('id="crm-activity-title" value={form.activityType} onChange=');
    expect(dialog).toContain('id="crm-helper-mention" className="pl-9" value={mention} onChange=');
  });
});
