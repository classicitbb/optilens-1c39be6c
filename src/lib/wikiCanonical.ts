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

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return {
    blocks: lines.map((line) => {
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) return { type: "heading", level: heading[1].length as 1 | 2 | 3, children: [asText(heading[2])] };
      return { type: "paragraph", children: [asText(line)] };
    }),
  };
};

export const validateCanonicalDocument = (doc: BlogCanonicalContent): { valid: boolean; message?: string } => {
  if (!doc || !Array.isArray(doc.blocks)) return { valid: false, message: "Invalid document structure." };
  for (const block of doc.blocks) {
    if (!block || typeof block !== "object" || !('type' in block)) return { valid: false, message: "Invalid block detected." };
    if (block.type === "image" && !block.src) return { valid: false, message: "Image blocks need a source URL." };
  }
  return { valid: true };
};
