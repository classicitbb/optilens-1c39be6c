import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_RESOURCES } from "../../../supabase/functions/_shared/copilot/adminResources";

/**
 * The Portal Copilot's admin resource registry names columns as plain strings,
 * so nothing stops an entry from referring to a column that does not exist.
 * That is not hypothetical: docstudio_billing_documents shipped with
 * writable: ["title", "status"] and searchColumns: ["title"] against a table
 * whose column is document_name, which made the resource unwritable and its
 * search permanently broken. company_settings listed support_email, phone and
 * address, none of which are columns either.
 *
 * This test reads the generated Supabase types and asserts every column the
 * registry references is real, so that class of bug cannot ship again.
 */

const typesPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../integrations/supabase/types.ts",
);
// The checked-in file uses CRLF; normalise so the block patterns below match.
const types = readFileSync(typesPath, "utf8").split("\r\n").join("\n");

/** Column names in the `Row:` block of a generated table type. */
const columnsFor = (table: string): string[] | null => {
  const block = new RegExp(`^      ${table}: \\{\\n        Row: \\{\\n([\\s\\S]*?)\\n        \\}`, "m").exec(types);
  if (!block) return null;
  return block[1]
    .split("\n")
    .map((line) => /^\s{10}([A-Za-z0-9_]+)\??:/.exec(line)?.[1])
    .filter((name): name is string => Boolean(name));
};

/**
 * Pre-existing breakage, recorded so this test can guard against NEW breakage
 * without silently rewriting 28 unrelated resources.
 *
 * Every entry here is a column the registry references that does not exist on
 * the table, which means that field does not work today. Some are merely
 * degraded (one bad column among several good ones); others are total, e.g.
 * price_catalog and price_matrix list `price` as their ONLY writable column
 * while the real column is `web_price`, so every price write fails with
 * "No writable fields supplied" before it ever reaches the approval check.
 *
 * This is a ratchet, not an allowlist: the test below also fails if an entry
 * here is no longer broken, so fixing a resource forces its removal and the
 * list can only shrink.
 */
const KNOWN_BROKEN: Record<string, string[]> = {
  activities: ["channel", "notes", "subject"],
  balances: ["updated_at"],
  catalog_templates: ["description"],
  customer_addresses: ["is_default"],
  customers: ["is_active"],
  helpdesk_teams: ["active"],
  helpdesk_ticket_messages: ["author_id", "is_internal"],
  helpdesk_ticket_stages: ["active"],
  lead_audits: ["created_at"],
  lenses: ["description", "web_enabled", "wspl_enabled"],
  opportunities: ["expected_close_date", "name", "notes", "probability"],
  order_items: ["status"],
  orders: ["notes"],
  portal_account_memberships: ["role"],
  price_catalog: ["price"],
  price_matrix: ["price"],
  pricelist_versions: ["notes", "status"],
  quote_lines: ["description", "quantity"],
  quotes: ["notes"],
  rx_order_submissions: ["notes"],
  shipment_charges: ["amount", "charge_type_id"],
  shipment_lines: ["notes"],
  shipments: ["arrival_date", "notes", "reference", "supplier_name"],
  stock_order_submissions: ["notes"],
  store_product_overrides: ["display_name", "sort_order"],
  supplies: ["category_id"],
  website_features: ["feature_key"],
};

describe("admin resource registry columns", () => {
  const tables = [...new Set(ADMIN_RESOURCES.map((resource) => resource.table))];

  it.each(tables)("%s exists in the generated schema", (table) => {
    expect(columnsFor(table), `no generated type for table ${table}`).not.toBeNull();
  });

  it.each(ADMIN_RESOURCES.map((resource) => [resource.key, resource] as const))(
    "%s only references real columns",
    (_key, resource) => {
      const columns = columnsFor(resource.table);
      if (!columns) return; // covered by the test above

      const selected = resource.select === "*" ? [] : resource.select.split(",").map((part) => part.trim());
      const referenced = [
        ...selected.map((column) => ["select", column] as const),
        ...resource.searchColumns.map((column) => ["searchColumns", column] as const),
        ...resource.writable.map((column) => ["writable", column] as const),
        ...(resource.orderBy ? [["orderBy", resource.orderBy] as const] : []),
      ];

      const unknown = [...new Set(
        referenced.filter(([, column]) => !columns.includes(column)).map(([, column]) => column),
      )].sort();
      const baseline = [...(KNOWN_BROKEN[resource.key] ?? [])].sort();

      const regressions = unknown.filter((column) => !baseline.includes(column));
      expect(
        regressions,
        `${resource.key} references columns that do not exist on ${resource.table}`,
      ).toEqual([]);

      // Ratchet: once a resource is fixed, its baseline entry must go, so the
      // known-broken list can only ever shrink.
      const fixed = baseline.filter((column) => !unknown.includes(column));
      expect(
        fixed,
        `${resource.key} no longer references these columns — remove them from KNOWN_BROKEN`,
      ).toEqual([]);
    },
  );
});
