import { isBlogColorName } from "@/components/blog/BlogPostRenderer";
import { depthsToStore, nestByDepth, type DepthNode } from "@/lib/listDepth";
import type { BlogBlockNode, BlogCanonicalContent, BlogInlineNode } from "@/components/blog/BlogPostRenderer";

const isHtmlLike = (value: string) => /<[a-z][\s\S]*>/i.test(value);

const asText = (text: string): BlogInlineNode => ({ type: "text", text });

const parseInlineNode = (node: Node): BlogInlineNode[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    return [asText(node.textContent ?? "")];
  }

  if (!(node instanceof HTMLElement)) {
    return [];
  }

  const children = Array.from(node.childNodes).flatMap(parseInlineNode);
  const tag = node.tagName.toLowerCase();

  if (tag === "strong" || tag === "b") return [{ type: "strong", children }];
  if (tag === "em" || tag === "i") return [{ type: "emphasis", children }];
  if (tag === "a") {
    const href = node.getAttribute("href") ?? "#";
    return [{ type: "link", href, children: children.length ? children : [asText(href)] }];
  }
  if (tag === "br") return [asText("\n")];
  if (tag === "code") return [{ type: "code", children }];
  if (tag === "s" || tag === "del" || tag === "strike") return [{ type: "strike", children }];
  if (tag === "u") return [{ type: "underline", children }];

  return children;
};

const parseHtmlToBlocks = (raw: string): BlogBlockNode[] => {
  if (typeof window === "undefined") {
    return [{ type: "paragraph", children: [asText(raw.replace(/<[^>]+>/g, " "))] }];
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(raw, "text/html");

  const toInline = (nodes: ChildNode[]) => nodes.flatMap(parseInlineNode);

  return Array.from(doc.body.childNodes).flatMap((node): BlogBlockNode[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").trim();
      return text ? [{ type: "paragraph", children: [asText(text)] }] : [];
    }
    if (!(node instanceof HTMLElement)) return [];

    const tag = node.tagName.toLowerCase();
    if (["h1", "h2", "h3", "h4"].includes(tag)) {
      return [{ type: "heading", level: Number(tag[1]) as 1 | 2 | 3 | 4, children: toInline(Array.from(node.childNodes)) }];
    }
    if (tag === "p") {
      return [{ type: "paragraph", children: toInline(Array.from(node.childNodes)) }];
    }
    if (tag === "blockquote") {
      return [{ type: "blockquote", children: toInline(Array.from(node.childNodes)) }];
    }
    if (tag === "ul" || tag === "ol") {
      const items = Array.from(node.querySelectorAll(":scope > li")).map((li) => toInline(Array.from(li.childNodes)));
      return [{ type: "list", ordered: tag === "ol", items }];
    }
    if (tag === "img") {
      const src = node.getAttribute("src") ?? "";
      return src ? [{ type: "image", src, alt: node.getAttribute("alt") ?? "" }] : [];
    }
    if (tag === "hr") return [{ type: "divider" }];
    if (tag === "pre") {
      const codeEl = node.querySelector("code");
      const language = codeEl?.className.match(/language-([\w-]+)/)?.[1];
      return [{ type: "code", ...(language ? { language } : {}), text: node.textContent ?? "" }];
    }

    const fallback = toInline(Array.from(node.childNodes));
    return fallback.length ? [{ type: "paragraph", children: fallback }] : [];
  });
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const inlineToHtml = (node: BlogInlineNode): string => {
  const kids = (children: BlogInlineNode[]) => (Array.isArray(children) ? children : []).map(inlineToHtml).join("");
  switch (node?.type) {
    case "text":
      return escapeHtml(node.text).replace(/\n/g, "<br />");
    case "strong":
      return `<strong>${kids(node.children)}</strong>`;
    case "emphasis":
      return `<em>${kids(node.children)}</em>`;
    case "link":
      return `<a href="${escapeHtml(node.href)}">${kids(node.children)}</a>`;
    case "code":
      return `<code>${kids(node.children)}</code>`;
    case "strike":
      return `<s>${kids(node.children)}</s>`;
    case "underline":
      return `<u>${kids(node.children)}</u>`;
    case "color": {
      const attrs = [
        isBlogColorName(node.color) ? ` data-color="${node.color}"` : "",
        isBlogColorName(node.background) ? ` data-background="${node.background}"` : "",
      ].join("");
      return `<span${attrs}>${kids(node.children)}</span>`;
    }
    case "mention":
      return `<span data-mention="${escapeHtml(node.kind)}">${escapeHtml(node.label)}</span>`;
    default:
      return "";
  }
};

const blockToHtml = (block: BlogBlockNode): string => {
  const inline = (children: BlogInlineNode[]) => (Array.isArray(children) ? children : []).map(inlineToHtml).join("");
  switch (block?.type) {
    case "heading":
      return `<h${block.level}>${inline(block.children)}</h${block.level}>`;
    case "paragraph":
      return `<p>${inline(block.children)}</p>`;
    case "blockquote":
      return `<blockquote>${inline(block.children)}</blockquote>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      const html = (nodes: DepthNode<BlogInlineNode[]>[]): string =>
        `<${tag}>${nodes.map((node) => `<li>${inline(node.item)}${node.children.length ? html(node.children) : ""}</li>`).join("")}</${tag}>`;
      return html(nestByDepth(block.items, block.depths));
    }
    case "image":
      return `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt ?? "")}" />`;
    case "callout":
      return `<aside data-callout="${isBlogColorName(block.color) ? block.color : ""}"><span>${escapeHtml(block.icon ?? "")}</span> ${inline(block.children)}</aside>`;
    case "toggle":
      return `<details><summary>${inline(block.summary)}</summary>${(block.children ?? []).map(blockToHtml).join("")}</details>`;
    case "todo": {
      const html = (nodes: DepthNode<(typeof block.items)[number]>[], root: boolean): string =>
        `<ul${root ? " data-todo" : ""}>${nodes
          .map((node) => `<li data-checked="${node.item.checked ? "true" : "false"}">${inline(node.item.children)}${node.children.length ? html(node.children, false) : ""}</li>`)
          .join("")}</ul>`;
      return html(nestByDepth(block.items, block.items.map((item) => item.depth ?? 0)), true);
    }
    case "code":
      return `<pre><code${block.language ? ` class="language-${escapeHtml(block.language)}"` : ""}>${escapeHtml(block.text)}</code></pre>`;
    case "divider":
      return "<hr />";
    case "table":
      return `<table>${block.rows
        .map((row, rowIndex) => {
          const cellTag = block.header && rowIndex === 0 ? "th" : "td";
          return `<tr>${row.map((cell) => `<${cellTag}>${inline(cell)}</${cellTag}>`).join("")}</tr>`;
        })
        .join("")}</table>`;
    case "pageLink":
      return `<p><a href="${escapeHtml(block.slug ? `/knowledge/${block.slug}` : "#")}" data-page-link="${escapeHtml(block.articleId)}">${escapeHtml(block.title)}</a></p>`;
    default:
      return "";
  }
};

export const canonicalToHtml = (doc: BlogCanonicalContent): string => doc.blocks.map(blockToHtml).filter(Boolean).join("\n");

/** Parse inline markdown: **bold**, *italic*, [link](url) */
const parseInlineMarkdown = (text: string): BlogInlineNode[] => {
  const nodes: BlogInlineNode[] = [];
  // Regex matches **bold**, *italic*, and [text](url)
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(asText(text.slice(lastIndex, match.index)));
    }
    if (match[2] != null) {
      // **bold**
      nodes.push({ type: "strong", children: [asText(match[2])] });
    } else if (match[3] != null) {
      // *italic*
      nodes.push({ type: "emphasis", children: [asText(match[3])] });
    } else if (match[4] != null && match[5] != null) {
      // [text](url)
      nodes.push({ type: "link", href: match[5], children: [asText(match[4])] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(asText(text.slice(lastIndex)));
  }

  return nodes.length > 0 ? nodes : [asText(text)];
};

export const toCanonicalDocument = (value?: unknown): BlogCanonicalContent => {
  if (!value) return { blocks: [] };

  if (typeof value === "object" && value !== null && "blocks" in (value as any) && Array.isArray((value as any).blocks)) {
    return value as BlogCanonicalContent;
  }

  if (typeof value !== "string") return { blocks: [] };

  const raw = value.trim();
  if (!raw) return { blocks: [] };

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.blocks)) {
      return parsed as BlogCanonicalContent;
    }
  } catch {
    // Non-JSON legacy content
  }

  if (isHtmlLike(raw)) {
    return { blocks: parseHtmlToBlocks(raw) };
  }

  // Full markdown-style parser: headings, lists, blockquotes, paragraphs with inline formatting
  const lines = raw.split(/\r?\n/);
  const blocks: BlogBlockNode[] = [];
  let listBuffer: { ordered: boolean; items: BlogInlineNode[][] } | null = null;

  const flushList = () => {
    if (!listBuffer) return;
    blocks.push({ type: "list", ordered: listBuffer.ordered, items: listBuffer.items });
    listBuffer = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    // Blank line — flush list
    if (!trimmed) {
      flushList();
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      blocks.push({ type: "heading", level: headingMatch[1].length as 1 | 2 | 3 | 4, children: parseInlineMarkdown(headingMatch[2]) });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushList();
      blocks.push({ type: "blockquote", children: parseInlineMarkdown(trimmed.slice(2)) });
      continue;
    }

    // Unordered list item
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (listBuffer && listBuffer.ordered) flushList();
      if (!listBuffer) listBuffer = { ordered: false, items: [] };
      listBuffer.items.push(parseInlineMarkdown(ulMatch[1]));
      continue;
    }

    // Ordered list item
    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      if (listBuffer && !listBuffer.ordered) flushList();
      if (!listBuffer) listBuffer = { ordered: true, items: [] };
      listBuffer.items.push(parseInlineMarkdown(olMatch[1]));
      continue;
    }

    // Regular paragraph
    flushList();
    blocks.push({ type: "paragraph", children: parseInlineMarkdown(trimmed) });
  }

  flushList();
  return { blocks };
};

const KNOWN_BLOCK_TYPES = new Set([
  "heading",
  "paragraph",
  "list",
  "blockquote",
  "image",
  "callout",
  "toggle",
  "todo",
  "code",
  "divider",
  "table",
  "pageLink",
]);

const validateBlock = (block: unknown): string | null => {
  if (!block || typeof block !== "object" || !("type" in block)) return "Invalid block detected.";
  const node = block as BlogBlockNode;
  if (!KNOWN_BLOCK_TYPES.has(node.type)) return `Unsupported block type "${String(node.type)}".`;
  switch (node.type) {
    case "image":
      return node.src ? null : "Image blocks need a source URL.";
    case "code":
      return typeof node.text === "string" ? null : "Code blocks need text.";
    case "table":
      return Array.isArray(node.rows) && node.rows.every(Array.isArray) ? null : "Table blocks need rows.";
    case "todo":
      return Array.isArray(node.items) ? null : "To-do blocks need items.";
    case "pageLink":
      return node.articleId && node.title ? null : "Page links need a page.";
    case "toggle": {
      if (!Array.isArray(node.children)) return "Toggle blocks need content.";
      for (const child of node.children) {
        const problem = validateBlock(child);
        if (problem) return problem;
      }
      return null;
    }
    default:
      return null;
  }
};

export const validateCanonicalDocument = (doc: BlogCanonicalContent): { valid: boolean; message?: string } => {
  if (!doc || !Array.isArray(doc.blocks)) return { valid: false, message: "Invalid document structure." };
  for (const block of doc.blocks) {
    const problem = validateBlock(block);
    if (problem) return { valid: false, message: problem };
  }
  return { valid: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// Tiptap JSON <-> canonical JSON
//
// The workspace block editor edits Tiptap JSON; the canonical document is what
// is stored (help_articles.body_json) and rendered. These two functions are the
// only bridge. Blocks the editor does not know are carried through
// "unknownBlock" nodes, so opening and saving a page never drops them.
// ─────────────────────────────────────────────────────────────────────────────

export interface TiptapJson {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapJson[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

const str = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

// Innermost first: a bold link becomes strong(link(...)) reading outward-in.
const MARK_WRAP_ORDER = ["code", "strike", "underline", "italic", "bold", "wsColor", "link"] as const;

const wrapWithMark = (node: BlogInlineNode, mark: { type: string; attrs?: Record<string, unknown> }): BlogInlineNode => {
  switch (mark.type) {
    case "code":
      return { type: "code", children: [node] };
    case "strike":
      return { type: "strike", children: [node] };
    case "underline":
      return { type: "underline", children: [node] };
    case "italic":
      return { type: "emphasis", children: [node] };
    case "bold":
      return { type: "strong", children: [node] };
    case "wsColor": {
      const color = isBlogColorName(mark.attrs?.color) ? mark.attrs?.color : undefined;
      const background = isBlogColorName(mark.attrs?.background) ? mark.attrs?.background : undefined;
      return color || background ? { type: "color", ...(color ? { color } : {}), ...(background ? { background } : {}), children: [node] } : node;
    }
    case "link":
      return { type: "link", href: str(mark.attrs?.href) ?? "#", children: [node] };
    default:
      return node;
  }
};

const tiptapInlineToCanonical = (nodes: TiptapJson[] = []): BlogInlineNode[] =>
  nodes.flatMap((node): BlogInlineNode[] => {
    if (node.type === "hardBreak") return [asText("\n")];
    if (node.type === "mention") {
      const kind = node.attrs?.kind === "person" || node.attrs?.kind === "date" ? node.attrs.kind : "page";
      return [
        {
          type: "mention",
          kind,
          label: str(node.attrs?.label) ?? "",
          ...(str(node.attrs?.id) ? { id: str(node.attrs?.id) } : {}),
          ...(str(node.attrs?.slug) ? { slug: str(node.attrs?.slug) } : {}),
        },
      ];
    }
    if (node.type === "secret") return [{ type: "secret", value: typeof node.attrs?.value === "string" ? node.attrs.value : "" }];
    if (node.type !== "text" || !node.text) return [];
    let out: BlogInlineNode = asText(node.text);
    const marks = node.marks ?? [];
    for (const type of MARK_WRAP_ORDER) {
      const mark = marks.find((candidate) => candidate.type === type);
      if (mark) out = wrapWithMark(out, mark);
    }
    return [out];
  });

const paragraphInline = (node?: TiptapJson): BlogInlineNode[] => tiptapInlineToCanonical(node?.content);

const joinParagraphs = (paragraphs: TiptapJson[]): BlogInlineNode[] =>
  paragraphs.flatMap((paragraph, index) => (index === 0 ? paragraphInline(paragraph) : [asText("\n"), ...paragraphInline(paragraph)]));

const textOf = (node: TiptapJson): string =>
  node.text ?? (node.content ?? []).map(textOf).join("");

const LIST_TYPES = ["bulletList", "orderedList", "taskList"];

/**
 * Nested Tiptap lists flatten into one canonical list with a depth per item. A nested list
 * takes the type of the list it sits in (the editor only nests lists of the same type).
 */
const flattenTiptapList = (list: TiptapJson, depth = 0): { inline: BlogInlineNode[]; checked: boolean; depth: number }[] =>
  (list.content ?? []).flatMap((item) => [
    {
      inline: joinParagraphs((item.content ?? []).filter((child) => child.type === "paragraph")),
      checked: Boolean(item.attrs?.checked),
      depth,
    },
    ...(item.content ?? []).filter((child) => LIST_TYPES.includes(child.type ?? "")).flatMap((nested) => flattenTiptapList(nested, depth + 1)),
  ]);

const tiptapBlockToCanonical = (node: TiptapJson): BlogBlockNode[] => {
  const kids = node.content ?? [];
  switch (node.type) {
    case "paragraph":
      return [{ type: "paragraph", children: tiptapInlineToCanonical(kids) }];
    case "heading": {
      const level = Math.min(4, Math.max(1, Number(node.attrs?.level) || 1)) as 1 | 2 | 3 | 4;
      return [{ type: "heading", level, children: tiptapInlineToCanonical(kids) }];
    }
    case "bulletList":
    case "orderedList": {
      const flat = flattenTiptapList(node);
      const depths = depthsToStore(flat.map((entry) => entry.depth));
      return [{ type: "list", ordered: node.type === "orderedList", items: flat.map((entry) => entry.inline), ...(depths ? { depths } : {}) }];
    }
    case "taskList":
      return [
        {
          type: "todo",
          items: flattenTiptapList(node).map((entry) => ({
            checked: entry.checked,
            children: entry.inline,
            ...(entry.depth > 0 ? { depth: entry.depth } : {}),
          })),
        },
      ];
    case "blockquote": {
      const paragraphs = kids.filter((child) => child.type === "paragraph");
      return paragraphs.length > 0
        ? paragraphs.map((paragraph) => ({ type: "blockquote" as const, children: paragraphInline(paragraph) }))
        : [{ type: "blockquote", children: [] }];
    }
    case "codeBlock": {
      const language = str(node.attrs?.language);
      return [{ type: "code", ...(language ? { language } : {}), text: kids.map(textOf).join("") }];
    }
    case "horizontalRule":
      return [{ type: "divider" }];
    case "image": {
      const src = str(node.attrs?.src);
      return src ? [{ type: "image", src, alt: str(node.attrs?.alt) ?? "" }] : [];
    }
    case "callout": {
      const icon = str(node.attrs?.icon);
      const color = isBlogColorName(node.attrs?.color) ? node.attrs?.color : undefined;
      return [{ type: "callout", ...(icon ? { icon } : {}), ...(color ? { color } : {}), children: tiptapInlineToCanonical(kids) }];
    }
    case "toggle": {
      const [summary, ...rest] = kids;
      return [{ type: "toggle", summary: paragraphInline(summary), children: rest.flatMap(tiptapBlockToCanonical) }];
    }
    case "table": {
      const rows = kids.map((row) => (row.content ?? []).map((cell) => joinParagraphs((cell.content ?? []).filter((child) => child.type === "paragraph"))));
      const header = kids.length > 0 && (kids[0].content ?? []).length > 0 && (kids[0].content ?? []).every((cell) => cell.type === "tableHeader");
      const spacing = node.attrs?.spacing === "compact" || node.attrs?.spacing === "spacious" ? node.attrs.spacing : undefined;
      const firstRow = kids[0]?.content ?? [];
      const widths = firstRow.map((cell) => {
        const width = Array.isArray(cell.attrs?.colwidth) ? Number(cell.attrs.colwidth[0]) : 0;
        return width > 0 ? Math.round(width) : null;
      });
      return [{ type: "table", header, ...(spacing ? { spacing } : {}), ...(widths.some(Boolean) ? { colWidths: widths } : {}), rows }];
    }
    case "pageLink": {
      const articleId = str(node.attrs?.articleId);
      return articleId
        ? [{ type: "pageLink", articleId, title: str(node.attrs?.title) ?? "Untitled", ...(str(node.attrs?.slug) ? { slug: str(node.attrs?.slug) } : {}) }]
        : [];
    }
    case "unknownBlock": {
      try {
        const raw = JSON.parse(String(node.attrs?.raw ?? "null"));
        return raw && typeof raw === "object" ? [raw as BlogBlockNode] : [];
      } catch {
        return [];
      }
    }
    default:
      return [];
  }
};

const isEmptyParagraph = (block: BlogBlockNode) => block.type === "paragraph" && block.children.length === 0;

export const tiptapDocToCanonical = (doc: TiptapJson | null | undefined): BlogCanonicalContent => {
  const blocks = (doc?.content ?? []).flatMap(tiptapBlockToCanonical);
  while (blocks.length > 0 && isEmptyParagraph(blocks[blocks.length - 1])) blocks.pop();
  return { blocks };
};

const canonicalInlineToTiptap = (nodes: BlogInlineNode[] = [], marks: NonNullable<TiptapJson["marks"]> = []): TiptapJson[] =>
  (Array.isArray(nodes) ? nodes : []).flatMap((node): TiptapJson[] => {
    switch (node?.type) {
      case "text": {
        const parts = node.text.split("\n");
        return parts.flatMap((part, index): TiptapJson[] => {
          const out: TiptapJson[] = [];
          if (index > 0) out.push({ type: "hardBreak" });
          if (part) out.push({ type: "text", text: part, ...(marks.length ? { marks } : {}) });
          return out;
        });
      }
      case "strong":
        return canonicalInlineToTiptap(node.children, [...marks, { type: "bold" }]);
      case "emphasis":
        return canonicalInlineToTiptap(node.children, [...marks, { type: "italic" }]);
      case "underline":
        return canonicalInlineToTiptap(node.children, [...marks, { type: "underline" }]);
      case "strike":
        return canonicalInlineToTiptap(node.children, [...marks, { type: "strike" }]);
      case "code":
        return canonicalInlineToTiptap(node.children, [...marks, { type: "code" }]);
      case "link":
        return canonicalInlineToTiptap(node.children, [...marks, { type: "link", attrs: { href: node.href } }]);
      case "color":
        return canonicalInlineToTiptap(node.children, [
          ...marks,
          {
            type: "wsColor",
            attrs: {
              color: isBlogColorName(node.color) ? node.color : null,
              background: isBlogColorName(node.background) ? node.background : null,
            },
          },
        ]);
      case "mention":
        return [{ type: "mention", attrs: { kind: node.kind, label: node.label, id: node.id ?? null, slug: node.slug ?? null } }];
      case "secret":
        return [{ type: "secret", attrs: { value: typeof node.value === "string" ? node.value : "" } }];
      default:
        return [];
    }
  });

const paragraphOf = (children: BlogInlineNode[]): TiptapJson => {
  const content = canonicalInlineToTiptap(children);
  return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
};

const canonicalBlockToTiptap = (block: BlogBlockNode): TiptapJson[] => {
  switch (block?.type) {
    case "paragraph":
      return [paragraphOf(block.children)];
    case "heading": {
      const content = canonicalInlineToTiptap(block.children);
      return [{ type: "heading", attrs: { level: block.level }, ...(content.length ? { content } : {}) }];
    }
    case "blockquote":
      return [{ type: "blockquote", content: [paragraphOf(block.children)] }];
    case "list": {
      const type = block.ordered ? "orderedList" : "bulletList";
      const build = (nodes: DepthNode<BlogInlineNode[]>[]): TiptapJson => ({
        type,
        content: nodes.map((node) => ({
          type: "listItem",
          content: [paragraphOf(node.item), ...(node.children.length ? [build(node.children)] : [])],
        })),
      });
      return [build(nestByDepth(block.items, block.depths))];
    }
    case "todo": {
      const build = (nodes: DepthNode<(typeof block.items)[number]>[]): TiptapJson => ({
        type: "taskList",
        content: nodes.map((node) => ({
          type: "taskItem",
          attrs: { checked: Boolean(node.item.checked) },
          content: [paragraphOf(node.item.children), ...(node.children.length ? [build(node.children)] : [])],
        })),
      });
      return [build(nestByDepth(block.items, block.items.map((item) => item.depth ?? 0)))];
    }
    case "image":
      return [{ type: "image", attrs: { src: block.src, alt: block.alt ?? null } }];
    case "callout": {
      const content = canonicalInlineToTiptap(block.children);
      return [{ type: "callout", attrs: { icon: block.icon ?? null, color: isBlogColorName(block.color) ? block.color : null }, ...(content.length ? { content } : {}) }];
    }
    case "toggle":
      return [
        {
          type: "toggle",
          attrs: { open: true },
          content: [paragraphOf(block.summary), ...(Array.isArray(block.children) ? block.children : []).flatMap(canonicalBlockToTiptap)],
        },
      ];
    case "code":
      return [{ type: "codeBlock", attrs: { language: block.language ?? null }, ...(block.text ? { content: [{ type: "text", text: block.text }] } : {}) }];
    case "divider":
      return [{ type: "horizontalRule" }];
    case "table": {
      const columns = Math.max(1, ...block.rows.map((row) => row.length));
      if (block.rows.length === 0) return [{ type: "paragraph" }];
      return [
        {
          type: "table",
          attrs: { spacing: block.spacing ?? "normal" },
          content: block.rows.map((row, rowIndex) => ({
            type: "tableRow",
            content: Array.from({ length: columns }, (_, column) => ({
              type: block.header && rowIndex === 0 ? "tableHeader" : "tableCell",
              ...(block.colWidths?.[column] ? { attrs: { colwidth: [block.colWidths[column]] } } : {}),
              content: [paragraphOf(row[column] ?? [])],
            })),
          })),
        },
      ];
    }
    case "pageLink":
      return [{ type: "pageLink", attrs: { articleId: block.articleId, title: block.title, slug: block.slug ?? null } }];
    default:
      return block && typeof block === "object" ? [{ type: "unknownBlock", attrs: { raw: JSON.stringify(block) } }] : [];
  }
};

export const canonicalToTiptapDoc = (doc: BlogCanonicalContent | null | undefined): TiptapJson => {
  const content = (doc?.blocks ?? []).flatMap(canonicalBlockToTiptap);
  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
};

const inlineSearchText = (nodes: BlogInlineNode[] = []): string =>
  (Array.isArray(nodes) ? nodes : [])
    .map((node) => {
      if (node?.type === "text") return node.text;
      if (node?.type === "mention") return node.label;
      return node && "children" in node ? inlineSearchText(node.children) : "";
    })
    .join("");

const blockSearchText = (block: BlogBlockNode): string => {
  switch (block?.type) {
    case "heading":
    case "paragraph":
    case "blockquote":
    case "callout":
      return inlineSearchText(block.children);
    case "list":
      return block.items.map(inlineSearchText).join(" ");
    case "todo":
      return block.items.map((item) => inlineSearchText(item.children)).join(" ");
    case "toggle":
      return [inlineSearchText(block.summary), ...(block.children ?? []).map(blockSearchText)].join(" ");
    case "code":
      return block.text;
    case "table":
      return block.rows.map((row) => row.map(inlineSearchText).join(" ")).join(" ");
    case "pageLink":
      return block.title;
    case "image":
      return block.alt ?? "";
    default:
      return "";
  }
};

/** True when any inline `secret` field is in the document. Secrets are the only nodes with this exact type tag. */
export const canonicalHasSecret = (doc?: BlogCanonicalContent | null): boolean => JSON.stringify(doc?.blocks ?? []).includes('"type":"secret"');

/** Every block's text, headings and code included, for search. A password-locked page has none, so search and Iris never see its body. */
export const canonicalToSearchText = (doc?: BlogCanonicalContent | null): string =>
  (doc?.lock ? [] : (doc?.blocks ?? []))
    .map(blockSearchText)
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
