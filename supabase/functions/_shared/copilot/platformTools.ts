// Tier-2 self-knowledge: the detail that is too large to sit in the system
// prompt on every turn. Reads only the generated tables — no database access,
// no I/O — so it is safe to dispatch alongside the read-only lookups.
import {
  PLATFORM_RESOURCE_DETAIL,
  PLATFORM_RESOURCE_INDEX,
  PLATFORM_ROUTES,
} from "./platformFacts.generated.ts";

export const PLATFORM_TOOLS = [
  {
    name: "get_platform_facts",
    description:
      "Look up exactly what OpticAdmin holds for one module or one data set: its pages and routes, the columns you can read, the fields you can search, the fields you can write, and whether writing needs approval. Call this before promising a specific change or listing a page's contents, so the answer matches the real schema instead of a guess. Omit both arguments to list every module and data set available.",
    input_schema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description: "An OpticAdmin module name, e.g. \"Pricing\", \"Contacts\", \"Website\", \"Helpdesk\".",
        },
        resourceKey: {
          type: "string",
          description: "A data set key, e.g. \"contacts\", \"orders\", \"help_articles\", \"helpdesk_tickets\".",
        },
      },
      additionalProperties: false,
    },
  },
] as const;

export const PLATFORM_TOOL_NAMES = new Set(PLATFORM_TOOLS.map((tool) => tool.name));

const matches = (value: string, query: string) => value.toLowerCase().includes(query.toLowerCase());

export const dispatchPlatformTool = (name: string, input: Record<string, unknown>) => {
  if (name !== "get_platform_facts") {
    throw new Error(`Unsupported platform tool: ${name}`);
  }

  const resourceKey = typeof input.resourceKey === "string" ? input.resourceKey.trim() : "";
  const moduleQuery = typeof input.module === "string" ? input.module.trim() : "";

  if (resourceKey) {
    const detail = PLATFORM_RESOURCE_DETAIL[resourceKey];
    if (!detail) {
      return {
        found: false,
        message: `No data set named "${resourceKey}".`,
        availableKeys: Object.keys(PLATFORM_RESOURCE_DETAIL),
      };
    }
    return { found: true, resource: detail };
  }

  if (moduleQuery) {
    const pages = PLATFORM_ROUTES.filter((route) => matches(route.module, moduleQuery));
    const resources = Object.values(PLATFORM_RESOURCE_DETAIL).filter((detail) => matches(detail.module, moduleQuery));
    if (!pages.length && !resources.length) {
      return {
        found: false,
        message: `No module matching "${moduleQuery}".`,
        availableModules: [...new Set(PLATFORM_ROUTES.map((route) => route.module))],
      };
    }
    return { found: true, module: moduleQuery, pages, resources };
  }

  return {
    found: true,
    modules: [...new Set(PLATFORM_ROUTES.map((route) => route.module))],
    routes: PLATFORM_ROUTES,
    resourceIndex: PLATFORM_RESOURCE_INDEX,
  };
};
