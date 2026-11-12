import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  ADMIN_RESOURCES,
  dispatchAdminResourceTool,
} from "../../../supabase/functions/_shared/copilot/adminResources";

const root = process.cwd();
const migrationsDir = path.join(root, "supabase/migrations");

/**
 * Payroll and HR data (salaries, bank details, NIS/tax IDs, leave, assessments)
 * must never be reachable by the AI surfaces: the admin_* resource tools shared by
 * the Portal Copilot and the MCP server, Iris, and the companion assistant.
 *
 * The HR table list is derived from the HR migrations, so a new HR table is
 * covered automatically as soon as its migration lands.
 */
const HR_MIGRATION = /_(hr_|payroll|employee|leave)/i;

const hrTables = (() => {
  const tables = new Set<string>();
  for (const file of fs.readdirSync(migrationsDir)) {
    if (!HR_MIGRATION.test(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    for (const m of sql.matchAll(/create table (?:if not exists )?(?:public\.)?([a-z_]+)/gi)) {
      tables.add(m[1].toLowerCase());
    }
  }
  return [...tables].sort();
})();

const AI_SOURCES = [
  "supabase/functions/mcp",
  "supabase/functions/mcp-staging",
  "supabase/functions/portal-copilot",
  "supabase/functions/companion-assistant",
  "supabase/functions/iris-take-message",
  "supabase/functions/copilot-facts",
  "supabase/functions/_shared/copilot",
];

const listSourceFiles = (dir: string): string[] => {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(rel);
    return /\.(ts|tsx|js|mjs)$/.test(entry.name) ? [rel] : [];
  });
};

describe("payroll and HR data are excluded from AI tools", () => {
  it("finds the HR tables from the HR migrations", () => {
    for (const core of ["employees", "employee_sensitive", "employee_compensation", "payroll_runs", "payslips", "leave_requests"]) {
      expect(hrTables).toContain(core);
    }
  });

  it("registers no HR table as an admin resource", () => {
    const exposed = ADMIN_RESOURCES.filter((r) => hrTables.includes(r.table) || hrTables.includes(r.key));
    expect(exposed.map((r) => r.key)).toEqual([]);
  });

  it("does not list any HR resource to the AI", async () => {
    const result = await dispatchAdminResourceTool({} as never, "admin_list_resources", {});
    const listed = JSON.stringify(result.data).toLowerCase();
    for (const table of hrTables) {
      expect(listed).not.toMatch(new RegExp(`"${table}"`));
    }
  });

  it.each(["admin_search_records", "admin_get_record", "admin_create_record", "admin_update_record", "admin_delete_record"])(
    "rejects HR resources through %s without querying the database",
    async (tool) => {
      const db = { from: () => { throw new Error("must not query"); } };
      for (const table of hrTables) {
        await expect(
          dispatchAdminResourceTool(db as never, tool, { resource: table, id: "00000000-0000-0000-0000-000000000000", values: { notes: "x" } }, undefined, {
            canAccessFinancialData: true,
          }),
        ).rejects.toThrow(/Unknown resource/);
      }
    },
  );

  it("never names an HR table in AI edge-function code", () => {
    const files = AI_SOURCES.flatMap(listSourceFiles);
    expect(files.length).toBeGreaterThan(0);
    const hits: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(path.join(root, file), "utf8");
      for (const table of hrTables) {
        if (new RegExp(`["'\`]${table}["'\`]`).test(source)) hits.push(`${file}: ${table}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
