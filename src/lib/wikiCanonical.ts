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
  switch (node.type) {
    case "text":
      return escapeHtml(node.text).replace(/\n/g, "<br />");
    case "strong":
      return `<strong>${node.children.map(inlineToHtml).join("")}</strong>`;
    case "emphasis":
      return `<em>${node.children.map(inlineToHtml).join("")}</em>`;
    case "link":
      return `<a href="${escapeHtml(node.href)}">${node.children.map(inlineToHtml).join("")}</a>`;
  }
};

export const canonicalToHtml = (doc: BlogCanonicalContent): string => {
  return doc.blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `<h${block.level}>${block.children.map(inlineToHtml).join("")}</h${block.level}>`;
        case "paragraph":
          return `<p>${block.children.map(inlineToHtml).join("")}</p>`;
        case "blockquote":
          return `<blockquote>${block.children.map(inlineToHtml).join("")}</blockquote>`;
        case "list": {
          const tag = block.ordered ? "ol" : "ul";
          return `<${tag}>${block.items
            .map((item) => `<li>${item.map(inlineToHtml).join("")}</li>`)
            .join("")}</${tag}>`;
        }
        case "image":
          return `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt ?? "")}" />`;
      }
    })
    .join("\n");
};

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

export const validateCanonicalDocument = (doc: BlogCanonicalContent): { valid: boolean; message?: string } => {
  if (!doc || !Array.isArray(doc.blocks)) return { valid: false, message: "Invalid document structure." };
  for (const block of doc.blocks) {
    if (!block || typeof block !== "object" || !('type' in block)) return { valid: false, message: "Invalid block detected." };
    if (block.type === "image" && !block.src) return { valid: false, message: "Image blocks need a source URL." };
  }
  return { valid: true };
};
