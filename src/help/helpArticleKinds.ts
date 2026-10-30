/** help_articles.content_type for task articles listed under "How to…" in the help panels. */
export const HOW_TO_CONTENT_TYPE = "howto";

// Takes any article shape: static wiki articles have no content_type and are never how-tos.
export const isHowTo = (article: object) => (article as { content_type?: unknown }).content_type === HOW_TO_CONTENT_TYPE;

/**
 * Published articles show to everyone; drafts only to editors (marked Draft, so they can be
 * reviewed in place); archived articles never. Static articles have no status and count as published.
 */
export const isVisibleInHelpPanel = (status: string | undefined, canEdit: boolean) =>
  !status || status === "published" || (status === "draft" && canEdit);
