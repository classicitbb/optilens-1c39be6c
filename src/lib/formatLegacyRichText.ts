const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const formatInlineMarkdown = (value: string) => escapeHtml(value)
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");

/** Cells of a Markdown table row: `| a | b |` → ["a", "b"]. `\|` is a literal pipe. */
const tableCells = (line: string) => line
  .replace(/^\|/, "")
  .replace(/(?<!\\)\|$/, "")
  .split(/(?<!\\)\|/)
  .map((cell) => cell.trim().replace(/\\\|/g, "|"));

const isTableSeparator = (line: string) => tableCells(line).every((cell) => /^:?-{3,}:?$/.test(cell));

/**
 * Converts legacy pasted text into the HTML understood by the shared rich-text
 * editor. It deliberately supports the lightweight Markdown patterns found in
 * imported CMS records without treating the source as trusted HTML.
 */
export const formatLegacyRichText = (rawText: string): string => {
  const lines = rawText
    .replace(/\\r\\n|\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const blocks: string[] = [];
  let paragraphLines: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let tableLines: string[] = [];

  const flushParagraph = () => {
    const text = paragraphLines.join(" ").trim();
    if (text) blocks.push(`<p>${formatInlineMarkdown(text)}</p>`);
    paragraphLines = [];
  };
  const flushList = () => {
    if (listType && listItems.length) {
      blocks.push(`<${listType}>${listItems.map((item) => `<li>${formatInlineMarkdown(item)}</li>`).join("")}</${listType}>`);
    }
    listType = null;
    listItems = [];
  };
  // A run of `| … |` lines is a table only when its second line is the `| --- |` separator.
  const flushTable = () => {
    if (tableLines.length >= 2 && isTableSeparator(tableLines[1])) {
      const row = (line: string, tag: "th" | "td") => `<tr>${tableCells(line).map((cell) => `<${tag}>${formatInlineMarkdown(cell)}</${tag}>`).join("")}</tr>`;
      blocks.push(`<table>${row(tableLines[0], "th")}${tableLines.slice(2).map((line) => row(line, "td")).join("")}</table>`);
    } else {
      paragraphLines.push(...tableLines);
    }
    tableLines = [];
  };

  for (const sourceLine of lines) {
    const line = sourceLine.trim();
    if (line.startsWith("|") && line.length > 1) {
      flushParagraph();
      flushList();
      tableLines.push(line);
      continue;
    }
    if (tableLines.length) flushTable();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push(`<h${heading[1].length}>${formatInlineMarkdown(heading[2])}</h${heading[1].length}>`);
      continue;
    }

    const unorderedItem = line.match(/^(?:[-*+] |•\s+)(.+)$/);
    const orderedItem = line.match(/^\d+[.)]\s+(.+)$/);
    if (unorderedItem || orderedItem) {
      flushParagraph();
      const nextListType = unorderedItem ? "ul" : "ol";
      if (listType && listType !== nextListType) flushList();
      listType = nextListType;
      listItems.push((unorderedItem ?? orderedItem)![1]);
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushTable();
  flushParagraph();
  flushList();
  return blocks.join("") || "<p></p>";
};
