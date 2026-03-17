const toAnchorId = (label: string) =>
  label
    .toLowerCase()
    .replace(/[`#:*]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Extract section anchors from markdown headings and bold pseudo-headings */
export const extractWikiSections = (text: string) => {
  const sections: { id: string; label: string }[] = [];
  const seen = new Map<string, number>();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const markdownHeading = trimmed.match(/^#{1,3}\s+(.+)/);
    const boldHeading = trimmed.match(/^\*\*([^*]+)\*\*/);

    const label = markdownHeading?.[1]?.trim() ?? boldHeading?.[1]?.replace(/:$/, "").trim();
    if (!label) continue;

    const baseId = toAnchorId(label);
    if (!baseId) continue;

    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

    sections.push({ id, label });
  }

  return sections;
};
