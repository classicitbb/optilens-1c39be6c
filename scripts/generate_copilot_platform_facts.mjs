#!/usr/bin/env node
// Generates the Portal Copilot's self-knowledge from the code that already
// defines it, so the prompt cannot drift from the app.
//
//   npm run copilot:facts       regenerate
//   npm run qa:copilot-facts    fail if the committed file is stale (CI)
//
// Inputs: src/features/admin/core/config/apps.ts (routes + page vocabulary),
// supabase/functions/_shared/copilot/adminResources.ts (capability index),
// and platformFacts.source.ts (hand-maintained facts + terminology).
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const repoRoot = process.cwd();
const checkOnly = process.argv.includes("--check");
const outputPath = path.join(repoRoot, "supabase", "functions", "_shared", "copilot", "platformFacts.generated.ts");

// Tier 1 rides in the system prompt on every model call, and one command can
// loop up to MAX_LOOKUP_ITERATIONS (8) times, so its cost is paid up to 8x per
// user message. The current content is ~5.3k chars / ~1.3k tokens, all of it
// load-bearing (module routes, page labels, the capability index and the
// platform facts). This ceiling is a drift guard against unbounded growth, not
// a target — if it trips, move detail into PLATFORM_RESOURCE_DETAIL and let
// get_platform_facts serve it on demand rather than trimming real content.
const TIER1_MAX_CHARS = 6000;
const FACT_STALE_DAYS = 180;

/** Bundle a TS module and import it, stubbing lucide-react (apps.ts imports ~40 icons). */
const loadModule = async (entry) => {
  const result = await build({
    entryPoints: [path.join(repoRoot, entry)],
    absWorkingDir: repoRoot,
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    target: "esnext",
    logLevel: "silent",
    plugins: [{
      name: "stub-ui-only-imports",
      setup(pluginBuild) {
        pluginBuild.onResolve({ filter: /^lucide-react$/ }, () => ({ path: "lucide-react", namespace: "stub" }));
        pluginBuild.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
          // Icons are React components we never render here. CommonJS so that
          // esbuild allows any named import without declaring each one.
          contents: "module.exports = new Proxy({}, { get: () => () => null });",
          loader: "js",
        }));
        pluginBuild.onResolve({ filter: /^@\// }, (args) => ({
          path: path.join(repoRoot, "src", args.path.slice(2)),
        }));
      },
    }],
  });
  const code = result.outputFiles[0]?.text ?? "";
  return import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
};

const { ADMIN_APPS } = await loadModule("src/features/admin/core/config/apps.ts");
const { ADMIN_RESOURCES } = await loadModule("supabase/functions/_shared/copilot/adminResources.ts");
const { PLATFORM_TERMINOLOGY, PLATFORM_FACTS } = await loadModule("supabase/functions/_shared/copilot/platformFacts.source.ts");

// Tool names are declared as literals in Deno-only modules, so read them from
// source rather than importing code that cannot run under Node.
const readToolNames = (file, pattern) => {
  const source = readFileSync(path.join(repoRoot, file), "utf8");
  const names = [...new Set([...source.matchAll(pattern)].map((m) => m[1]))];
  if (!names.length) throw new Error("Found no tool names in " + file);
  return names;
};
const lookupToolNames = readToolNames(
  "supabase/functions/_shared/copilot/lookupTools.ts",
  /name:\s*"([a-z0-9_]+)"/g,
);
const routerToolNames = readToolNames(
  "supabase/functions/portal-copilot/index.ts",
  /name:\s*"(start_[a-z0-9_]+)"/g,
);

// ------------------------------------------------------------------ routes
// Mirrors buildContextOptions() in src/lib/adminContexts.ts, which is what the
// widget sends: sidebar items first, then the app's own base route. The two
// must agree or a page slug resolves to no context.
// Exactly the transform adminContexts.ts uses — only the /admin/ prefix is
// stripped, so a non-admin route such as /copilot keeps its leading slash.
const slugFor = (route) => route.replace(/^\/admin\//, "");
const bySlug = new Map();
for (const app of Object.values(ADMIN_APPS)) {
  for (const item of app.sidebarItems) {
    const slug = slugFor(item.route);
    if (!bySlug.has(slug)) bySlug.set(slug, { slug, label: item.label, path: item.route, module: app.title });
  }
  const appSlug = slugFor(app.baseRoute);
  if (!bySlug.has(appSlug)) bySlug.set(appSlug, { slug: appSlug, label: app.title, path: app.defaultRoute, module: app.title });
}
const routes = [...bySlug.values()];

// --------------------------------------------------------------- resources
// Resource module labels are compound ("Website / Orders", "Pricing / Catalog").
// Group on the leading segment so they line up with the launcher's app titles.
const moduleGroupOf = (resource) => resource.module.split("/")[0].trim();
const resourcesByModule = new Map();
for (const resource of ADMIN_RESOURCES) {
  const group = moduleGroupOf(resource);
  if (!resourcesByModule.has(group)) resourcesByModule.set(group, []);
  resourcesByModule.get(group).push(resource);
}
// A group that only ever carries one full label keeps it, so "Costings /
// Shipments" is not flattened to the misleading "Costings".
const resourceIndex = [...resourcesByModule.entries()].map(([group, list]) => {
  const labels = [...new Set(list.map((r) => r.module))];
  return { module: labels.length === 1 ? labels[0] : group, keys: list.map((r) => r.key) };
});
const resourceDetail = Object.fromEntries(ADMIN_RESOURCES.map((r) => [r.key, {
  key: r.key,
  table: r.table,
  module: r.module,
  description: r.description,
  columns: r.select,
  searchColumns: r.searchColumns,
  writable: r.writable,
  writeClass: r.writable.length === 0 ? "read-only" : r.priceSensitive ? "approval" : "immediate",
}]));

// ----------------------------------------------------------------- tier 1
const moduleLines = Object.values(ADMIN_APPS).map((app) => {
  const pages = app.sidebarItems.map((item) => item.label).join(", ");
  const keys = (resourcesByModule.get(app.title) ?? []).map((r) => r.key);
  const resourceNote = keys.length ? " | data: " + keys.join(", ") : "";
  return "- " + app.title + " (" + app.baseRoute + ") — " + pages + resourceNote;
});
// Resources whose module label does not match an app title still exist.
const claimed = new Set(Object.values(ADMIN_APPS).map((a) => a.title));
const otherLines = resourceIndex
  .filter((entry) => !claimed.has(entry.module.split("/")[0].trim()))
  .map((entry) => "- " + entry.module + " — data: " + entry.keys.join(", "));

const factLines = PLATFORM_FACTS.facts.map((fact) => "- " + fact.label + ": " + fact.detail);

const tier1 = [
  "You are working inside OpticAdmin, Classic Visions' ERP command center for managing sales, customer relationships, service operations, and website performance in one unified workspace.",
  "",
  PLATFORM_TERMINOLOGY,
  "",
  "OpticAdmin is made up of these modules (route — pages | the data you can read and write there):",
  ...moduleLines,
  ...otherLines,
  "",
  "How the platform runs:",
  ...factLines,
  "",
  "Governed workflows you can start: " + routerToolNames.join(", ") + ".",
  "Read-only lookups available to you: " + lookupToolNames.join(", ") + ".",
  "The data above is readable and writable through admin_list_resources, admin_search_records, admin_get_record, admin_create_record, admin_update_record and admin_delete_record. Deletes and price-bearing writes return an approval proposal rather than executing.",
  "Call get_platform_facts before promising a specific change — it returns the exact columns, searchable fields and writable fields of one data set.",
  "",
  "You therefore know what this platform is and what you can do in it. Answer capability questions directly: name the data or page involved and offer to do the work now, instead of describing manual steps — unless the admin only asked how something works.",
  "Assume an ambiguous question is about OpticAdmin and this data unless it is clearly about something external.",
].join("\n");

if (tier1.length > TIER1_MAX_CHARS) {
  console.error("Tier-1 platform context is " + tier1.length + " chars, over the " + TIER1_MAX_CHARS + " budget — move detail into PLATFORM_RESOURCE_DETAIL.");
  process.exit(1);
}

const verifiedAgeDays = Math.floor((Date.now() - Date.parse(PLATFORM_FACTS.lastVerified)) / 86_400_000);
if (verifiedAgeDays > FACT_STALE_DAYS) {
  console.warn("Warning: PLATFORM_FACTS.lastVerified is " + verifiedAgeDays + " days old — re-check platformFacts.source.ts.");
}

const header = [
  "// AUTO-GENERATED by scripts/generate_copilot_platform_facts.mjs — do not edit.",
  "// Regenerate with npm run copilot:facts. Verified in CI by npm run qa:copilot-facts.",
  "// Sources: src/features/admin/core/config/apps.ts, adminResources.ts, platformFacts.source.ts.",
  "",
  "export type PlatformRoute = { slug: string; label: string; path: string; module: string };",
  "export type PlatformResourceDetail = {",
  "  key: string;",
  "  table: string;",
  "  module: string;",
  "  description: string;",
  "  columns: string;",
  "  searchColumns: string[];",
  "  writable: string[];",
  '  writeClass: "read-only" | "immediate" | "approval";',
  "};",
  "",
].join("\n");

const generated = header
  + "export const PLATFORM_ROUTES: PlatformRoute[] = " + JSON.stringify(routes, null, 2) + ";\n\n"
  + "export const PLATFORM_RESOURCE_INDEX: { module: string; keys: string[] }[] = " + JSON.stringify(resourceIndex, null, 2) + ";\n\n"
  + "export const PLATFORM_RESOURCE_DETAIL: Record<string, PlatformResourceDetail> = " + JSON.stringify(resourceDetail, null, 2) + ";\n\n"
  + "/** Tier 1 — always appended to the Copilot system prompt. */\n"
  + "export const COPILOT_SYSTEM_CONTEXT = " + JSON.stringify(tier1) + ";\n";

const existing = (() => {
  try {
    return readFileSync(outputPath, "utf8");
  } catch {
    return null;
  }
})();

if (checkOnly) {
  if (existing !== generated) {
    console.error("supabase/functions/_shared/copilot/platformFacts.generated.ts is stale. Run: npm run copilot:facts");
    process.exit(1);
  }
  console.log("Copilot platform facts are current (" + routes.length + " routes, " + ADMIN_RESOURCES.length + " resources, tier 1 " + tier1.length + " chars).");
} else {
  writeFileSync(outputPath, generated, "utf8");
  console.log("Generated copilot platform facts: " + routes.length + " routes, " + ADMIN_RESOURCES.length + " resources, tier 1 " + tier1.length + "/" + TIER1_MAX_CHARS + " chars.");
}
