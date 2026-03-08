import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";

const isHtmlLike = (value: string) => /<[a-z][\s\S]*>/i.test(value);

type InlineNode = { type: "text"; text: string };

const textInline = (text: string): InlineNode[] => [{ type: "text", text }];

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

  if (isHtmlLike(raw) && typeof window !== "undefined") {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(raw, "text/html");
    const blocks = Array.from(doc.body.children).map((el) => {
      if (["h1", "h2", "h3", "h4"].includes(el.tagName.toLowerCase())) {
        return { type: "heading", level: Number(el.tagName[1]) as 1 | 2 | 3 | 4, children: textInline(el.textContent ?? "") };
      }
      if (el.tagName.toLowerCase() === "blockquote") return { type: "blockquote", children: textInline(el.textContent ?? "") };
      if (el.tagName.toLowerCase() === "ul" || el.tagName.toLowerCase() === "ol") {
        return {
          type: "list",
          ordered: el.tagName.toLowerCase() === "ol",
          items: Array.from(el.querySelectorAll(":scope > li")).map((li) => textInline(li.textContent ?? "")),
        };
      }
      if (el.tagName.toLowerCase() === "img") return { type: "image", src: el.getAttribute("src") ?? "", alt: el.getAttribute("alt") ?? "" };
      return { type: "paragraph", children: textInline(el.textContent ?? "") };
    });
    return { blocks };
  }

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return {
    blocks: lines.map((line) => {
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) return { type: "heading", level: heading[1].length as 1 | 2 | 3, children: textInline(heading[2]) };
      return { type: "paragraph", children: textInline(line) };
    }),
  } as BlogCanonicalContent;
};

export const validateCanonicalDocument = (doc: BlogCanonicalContent): { valid: boolean; message?: string } => {
  if (!doc || !Array.isArray(doc.blocks)) return { valid: false, message: "Invalid document structure." };
  for (const block of doc.blocks) {
    if (!block || typeof block !== "object" || !("type" in block)) return { valid: false, message: "Invalid block detected." };
    if (block.type === "image" && !(block as any).src) return { valid: false, message: "Image blocks need a source URL." };
  }
  return { valid: true };
};
