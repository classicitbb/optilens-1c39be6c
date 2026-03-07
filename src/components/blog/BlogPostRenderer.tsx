import { Component, type ErrorInfo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BlogInlineNode =
  | { type: "text"; text: string }
  | { type: "emphasis"; children: BlogInlineNode[] }
  | { type: "strong"; children: BlogInlineNode[] }
  | { type: "link"; href: string; children: BlogInlineNode[] };

export type BlogBlockNode =
  | { type: "heading"; level: 1 | 2 | 3 | 4; children: BlogInlineNode[] }
  | { type: "paragraph"; children: BlogInlineNode[] }
  | { type: "list"; ordered: boolean; items: BlogInlineNode[][] }
  | { type: "blockquote"; children: BlogInlineNode[] }
  | { type: "image"; src: string; alt?: string };

export type BlogCanonicalContent = { blocks: BlogBlockNode[] };
export type BlogContentInput = BlogCanonicalContent | BlogBlockNode[] | string;

interface BlogPostRendererProps {
  content: BlogContentInput;
  className?: string;
  emptyMessage?: string;
}

interface BlogRendererBoundaryState {
  hasError: boolean;
}

class BlogRendererBoundary extends Component<{ children: ReactNode }, BlogRendererBoundaryState> {
  state: BlogRendererBoundaryState = { hasError: false };

  static getDerivedStateFromError(): BlogRendererBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("BlogPostRenderer render failure", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          We couldn’t display this article right now. Please refresh or try again later.
        </div>
      );
    }

    return this.props.children;
  }
}

const isHtmlLike = (value: string) => /<[a-z][\s\S]*>/i.test(value);

const normalizeTextToBlocks = (value: string): BlogBlockNode[] => {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const lines = value.split(/\r?\n/);
  const blocks: BlogBlockNode[] = [];
  let listBuffer: { ordered: boolean; items: BlogInlineNode[][] } | null = null;

  const flushList = () => {
    if (!listBuffer) return;
    blocks.push({ type: "list", ordered: listBuffer.ordered, items: listBuffer.items });
    listBuffer = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);

    if (unorderedMatch || orderedMatch) {
      const ordered = Boolean(orderedMatch);
      const text = (unorderedMatch?.[1] ?? orderedMatch?.[1] ?? "").trim();
      if (!listBuffer || listBuffer.ordered !== ordered) {
        flushList();
        listBuffer = { ordered, items: [] };
      }
      listBuffer.items.push([{ type: "text", text }]);
      continue;
    }

    flushList();
    blocks.push({ type: "paragraph", children: [{ type: "text", text: line }] });
  }

  flushList();
  return blocks;
};

const parseInlineChildren = (node: Node): BlogInlineNode[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    return [{ type: "text", text: node.textContent ?? "" }];
  }

  if (!(node instanceof HTMLElement)) {
    return [];
  }

  const children = Array.from(node.childNodes).flatMap(parseInlineChildren);
  const tag = node.tagName.toLowerCase();

  if (tag === "strong" || tag === "b") return [{ type: "strong", children }];
  if (tag === "em" || tag === "i") return [{ type: "emphasis", children }];
  if (tag === "a") {
    const href = node.getAttribute("href") ?? "#";
    return [{ type: "link", href, children: children.length ? children : [{ type: "text", text: href }] }];
  }
  if (tag === "br") return [{ type: "text", text: "\n" }];

  return children;
};

const parseHtmlToBlocks = (value: string): BlogBlockNode[] => {
  if (typeof window === "undefined") {
    return normalizeTextToBlocks(value.replace(/<[^>]+>/g, " "));
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(value, "text/html");
  const bodyNodes = Array.from(doc.body.childNodes);

  const blocks: BlogBlockNode[] = [];

  const nodesToInline = (elements: ChildNode[]): BlogInlineNode[] =>
    elements.flatMap((child) => parseInlineChildren(child));

  for (const node of bodyNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").trim();
      if (text) blocks.push({ type: "paragraph", children: [{ type: "text", text }] });
      continue;
    }

    if (!(node instanceof HTMLElement)) continue;

    const tag = node.tagName.toLowerCase();
    if (["h1", "h2", "h3", "h4"].includes(tag)) {
      const level = Number(tag[1]) as 1 | 2 | 3 | 4;
      blocks.push({ type: "heading", level, children: nodesToInline(Array.from(node.childNodes)) });
      continue;
    }

    if (tag === "p") {
      blocks.push({ type: "paragraph", children: nodesToInline(Array.from(node.childNodes)) });
      continue;
    }

    if (tag === "blockquote") {
      blocks.push({ type: "blockquote", children: nodesToInline(Array.from(node.childNodes)) });
      continue;
    }

    if (tag === "ul" || tag === "ol") {
      const items = Array.from(node.querySelectorAll(":scope > li")).map((li) => nodesToInline(Array.from(li.childNodes)));
      blocks.push({ type: "list", ordered: tag === "ol", items: items.length ? items : [[{ type: "text", text: node.textContent ?? "" }]] });
      continue;
    }

    if (tag === "img") {
      const src = node.getAttribute("src") ?? "";
      if (src) {
        blocks.push({ type: "image", src, alt: node.getAttribute("alt") ?? "" });
      }
      continue;
    }

    const fallbackInline = nodesToInline(Array.from(node.childNodes));
    if (fallbackInline.length) {
      blocks.push({ type: "paragraph", children: fallbackInline });
    }
  }

  return blocks;
};

const normalizeContent = (content: BlogContentInput): BlogBlockNode[] => {
  if (typeof content === "string") {
    if (!content.trim()) return [];
    return isHtmlLike(content) ? parseHtmlToBlocks(content) : normalizeTextToBlocks(content);
  }

  if (Array.isArray(content)) return content;
  return content.blocks;
};

const renderInlineNode = (node: BlogInlineNode, key: string): ReactNode => {
  switch (node.type) {
    case "text":
      return <span key={key}>{node.text}</span>;
    case "emphasis":
      return <em key={key} className="italic">{node.children.map((child, index) => renderInlineNode(child, `${key}-${index}`))}</em>;
    case "strong":
      return <strong key={key} className="font-semibold text-foreground">{node.children.map((child, index) => renderInlineNode(child, `${key}-${index}`))}</strong>;
    case "link":
      return (
        <a key={key} href={node.href} className="text-primary underline underline-offset-2 break-words" target="_blank" rel="noreferrer noopener">
          {node.children.map((child, index) => renderInlineNode(child, `${key}-${index}`))}
        </a>
      );
  }
};

const renderBlockNode = (block: BlogBlockNode, key: string): ReactNode => {
  switch (block.type) {
    case "heading": {
      const headingClass = {
        1: "text-xl font-semibold mt-6 mb-2 text-foreground",
        2: "text-lg font-semibold mt-5 mb-2 text-foreground",
        3: "text-base font-semibold mt-4 mb-1.5 text-foreground",
        4: "text-sm font-semibold mt-4 mb-1 text-foreground",
      }[block.level];
      const Tag = `h${block.level}` as "h1" | "h2" | "h3" | "h4";
      return <Tag key={key} className={headingClass}>{block.children.map((child, index) => renderInlineNode(child, `${key}-${index}`))}</Tag>;
    }
    case "paragraph":
      return <p key={key} className="my-2 leading-relaxed text-muted-foreground">{block.children.map((child, index) => renderInlineNode(child, `${key}-${index}`))}</p>;
    case "blockquote":
      return <blockquote key={key} className="my-4 border-l-2 border-primary/30 pl-4 italic text-muted-foreground">{block.children.map((child, index) => renderInlineNode(child, `${key}-${index}`))}</blockquote>;
    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag key={key} className={cn("my-3 pl-5 space-y-1 text-muted-foreground", block.ordered ? "list-decimal" : "list-disc")}>
          {block.items.map((item, index) => (
            <li key={`${key}-${index}`} className="leading-relaxed marker:text-primary">
              {item.map((child, childIndex) => renderInlineNode(child, `${key}-${index}-${childIndex}`))}
            </li>
          ))}
        </ListTag>
      );
    }
    case "image":
      return (
        <figure key={key} className="my-4">
          <img src={block.src} alt={block.alt ?? ""} className="w-full rounded-lg border border-border object-cover" loading="lazy" />
          {block.alt ? <figcaption className="mt-2 text-xs text-muted-foreground">{block.alt}</figcaption> : null}
        </figure>
      );
  }
};

const BlogPostRenderer = ({ content, className, emptyMessage = "Nothing to display yet." }: BlogPostRendererProps) => {
  const blocks = normalizeContent(content).filter((block) => {
    if (block.type === "image") return Boolean(block.src.trim());
    if (block.type === "list") return block.items.length > 0;
    return true;
  });

  return (
    <BlogRendererBoundary>
      <div className={cn("max-w-none", className)}>
        {blocks.length > 0 ? (
          blocks.map((block, index) => renderBlockNode(block, `${block.type}-${index}`))
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </div>
    </BlogRendererBoundary>
  );
};

export default BlogPostRenderer;
