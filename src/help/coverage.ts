import { ADMIN_CONTEXT_OPTIONS } from "@/lib/adminContexts";
import { PORTAL_CONTEXT_OPTIONS } from "./portalContexts";

export interface HelpContextPage {
  value: string;
  label: string;
  path: string;
  audience: "staff" | "customer";
}

/** Every page that should have help: each admin context (except "all") and each customer portal page. */
export const HELP_CONTEXT_PAGES: HelpContextPage[] = [
  ...ADMIN_CONTEXT_OPTIONS.filter((option) => option.value !== "all").map((option) => ({ ...option, audience: "staff" as const })),
  ...PORTAL_CONTEXT_OPTIONS.map((option) => ({ ...option, audience: "customer" as const })),
];

/**
 * Pages with no published article assigned. `published` is the context_slug of every
 * help_article_contexts row whose article is published and active, e.g. from:
 *   select c.context_slug from help_article_contexts c join help_articles a on a.id = c.article_id
 *   where a.status = 'published' and a.is_active;
 */
export const helpCoverageGaps = (published: Iterable<string>) => {
  const covered = new Set(published);
  return HELP_CONTEXT_PAGES.filter((page) => !covered.has(page.value));
};
