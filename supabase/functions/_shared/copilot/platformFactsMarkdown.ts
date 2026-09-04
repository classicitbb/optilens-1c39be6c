// Renders the Copilot's generated platform facts (routes + resource
// capability index) as human-readable markdown, for display in
// Settings → Integrations → AI Agents. Purely a formatter over data that
// already exists in platformFacts.generated.ts — it adds no new facts.
import { COPILOT_SYSTEM_CONTEXT, PLATFORM_ROUTES, PLATFORM_RESOURCE_DETAIL } from "./platformFacts.generated.ts";

const escapeCell = (value: string) => value.replaceAll("|", "\\|").replaceAll("\n", " ");

export const renderPlatformFactsMarkdown = (): string => {
  const routesByModule = new Map<string, typeof PLATFORM_ROUTES>();
  for (const route of PLATFORM_ROUTES) {
    const list = routesByModule.get(route.module) ?? [];
    list.push(route);
    routesByModule.set(route.module, list);
  }

  const moduleLines = [...routesByModule.entries()].map(([module, routes]) => {
    const pages = routes.map((route) => `[${route.label}](${route.path})`).join(", ");
    return `- **${module}** — ${pages}`;
  });

  const resources = Object.values(PLATFORM_RESOURCE_DETAIL).sort((a, b) => a.module.localeCompare(b.module) || a.key.localeCompare(b.key));
  const resourceRows = resources.map((resource) =>
    `| ${escapeCell(resource.key)} | ${escapeCell(resource.module)} | ${escapeCell(resource.table)} | ${resource.writeClass} | ${escapeCell(resource.writable.join(", ") || "—")} |`
  );

  return [
    "## Modules & pages",
    "",
    ...moduleLines,
    "",
    "## Data sets the Copilot can read and write",
    "",
    "| Key | Module | Table | Write class | Writable fields |",
    "| --- | --- | --- | --- | --- |",
    ...resourceRows,
    "",
    "`read-only` — never written. `immediate` — ordinary writes execute right away. `approval` — deletes and price-bearing writes; always returned as an approval proposal instead of executing.",
    "",
    "## Grounding context sent to the Copilot",
    "",
    "This is the exact text appended to the admin system prompt on every turn (Tier 1 of `platformFacts.generated.ts`):",
    "",
    "```",
    COPILOT_SYSTEM_CONTEXT,
    "```",
  ].join("\n");
};
