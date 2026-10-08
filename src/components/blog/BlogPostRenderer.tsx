import { Component, type ErrorInfo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { nestByDepth, type DepthNode } from "@/lib/listDepth";
import SecretField from "./SecretField";

export const BLOG_COLOR_NAMES = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"] as const;
export type BlogColorName = (typeof BLOG_COLOR_NAMES)[number];
export const isBlogColorName = (value: unknown): value is BlogColorName =>
  typeof value === "string" && (BLOG_COLOR_NAMES as readonly string[]).includes(value);

export type BlogInlineNode =
  | { type: "text"; text: string }
  | { type: "emphasis"; children: BlogInlineNode[] }
  | { type: "strong"; children: BlogInlineNode[] }
  | { type: "link"; href: string; children: BlogInlineNode[] }
  | { type: "code"; children: BlogInlineNode[] }
  | { type: "strike"; children: BlogInlineNode[] }
  | { type: "underline"; children: BlogInlineNode[] }
  | { type: "color"; color?: BlogColorName; background?: BlogColorName; children: BlogInlineNode[] }
  | { type: "mention"; kind: "page" | "person" | "date"; label: string; id?: string; slug?: string }
  /** A value hidden behind a show/hide toggle. Never written to HTML, Markdown or search text. */
  | { type: "secret"; value: string };

export interface BlogTodoItem {
  checked: boolean;
  children: BlogInlineNode[];
  /** Nesting level, 0 = top level. Omitted when the list is not nested. */
  depth?: number;
}

export type BlogBlockNode =
  | { type: "heading"; level: 1 | 2 | 3 | 4; children: BlogInlineNode[] }
  | { type: "paragraph"; children: BlogInlineNode[] }
  | { type: "list"; ordered: boolean; items: BlogInlineNode[][]; /** Nesting level per item, parallel to `items`. */ depths?: number[] }
  | { type: "blockquote"; children: BlogInlineNode[] }
  | { type: "image"; src: string; alt?: string }
  | { type: "callout"; icon?: string; color?: BlogColorName; children: BlogInlineNode[] }
  | { type: "toggle"; summary: BlogInlineNode[]; children: BlogBlockNode[] }
  | { type: "todo"; items: BlogTodoItem[] }
  | { type: "code"; language?: string; text: string }
  | { type: "divider" }
  | { type: "table"; header: boolean; spacing?: "compact" | "spacious"; colWidths?: (number | null)[]; rows: BlogInlineNode[][][] }
  | { type: "pageLink"; articleId: string; title: string; slug?: string };

export interface BlogPageRef {
  id?: string;
  slug?: string;
  title: string;
}

/** Salted password hash for a soft page lock. The body stays readable in storage; this only gates the UI. */
export interface PageLock {
  salt: string;
  hash: string;
  iterations: number;
}

export type BlogCanonicalContent = { blocks: BlogBlockNode[]; lock?: PageLock; layout?: { fullWidth?: boolean } };
export type BlogContentInput = BlogCanonicalContent | BlogBlockNode[] | string;

interface BlogPostRendererProps {
  content: BlogContentInput;
  className?: string;
  /** Where page links and @page mentions point. Defaults to /knowledge/<slug>. */
  resolvePageHref?: (page: BlogPageRef) => string | undefined;
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

type ResolveHref = (page: BlogPageRef) => string | undefined;

const defaultResolvePageHref: ResolveHref = (page) => (page.slug ? `/knowledge/${page.slug}` : undefined);

const colorClasses = (color?: unknown, background?: unknown) =>
  cn(isBlogColorName(color) && `ws-color-${color}`, isBlogColorName(background) && `ws-bg-${background}`);

/** Like the editor, a table whose every column has a width is exactly that wide; otherwise it fills the page. */
const fixedTableWidth = (colWidths?: (number | null)[]) =>
  colWidths && colWidths.length > 0 && colWidths.every((width) => typeof width === "number" && width > 0) ? `${colWidths.reduce<number>((sum, width) => sum + (width ?? 0), 0)}px` : undefined;

const renderInlineNode = (node: BlogInlineNode, key: string, resolve: ResolveHref): ReactNode => {
  const kids = (children: BlogInlineNode[]) =>
    (Array.isArray(children) ? children : []).map((child, index) => renderInlineNode(child, `${key}-${index}`, resolve));

  switch (node?.type) {
    case "text":
      return <span key={key}>{node.text}</span>;
    case "emphasis":
      return <em key={key} className="italic">{kids(node.children)}</em>;
    case "strong":
      return <strong key={key} className="font-semibold text-foreground">{kids(node.children)}</strong>;
    case "link":
      return (
        <a key={key} href={node.href} className="text-primary underline underline-offset-2 break-words" target="_blank" rel="noreferrer noopener">
          {kids(node.children)}
        </a>
      );
    case "code":
      return <code key={key} className="ws-inline-code">{kids(node.children)}</code>;
    case "strike":
      return <s key={key}>{kids(node.children)}</s>;
    case "underline":
      return <u key={key}>{kids(node.children)}</u>;
    case "color":
      return <span key={key} className={cn("rounded-[3px]", colorClasses(node.color, node.background))}>{kids(node.children)}</span>;
    case "mention": {
      if (node.kind === "date") {
        return <time key={key} className="ws-mention">{node.label}</time>;
      }
      const href = node.kind === "page" ? resolve({ id: node.id, slug: node.slug, title: node.label }) : undefined;
      const label = node.kind === "person" ? `@${node.label}` : node.label;
      return href ? (
        <a key={key} href={href} className="ws-mention">{label}</a>
      ) : (
        <span key={key} className="ws-mention">{label}</span>
      );
    }
    case "secret":
      return <SecretField key={key} value={node.value} />;
    default:
      return (
        <span key={key} data-unknown-inline={String((node as { type?: unknown } | null)?.type ?? "unknown")} className="ws-unknown-inline">
          [unsupported text]
        </span>
      );
  }
};

const renderBlockNode = (block: BlogBlockNode, key: string, resolve: ResolveHref): ReactNode => {
  const inline = (children: BlogInlineNode[]) =>
    (Array.isArray(children) ? children : []).map((child, index) => renderInlineNode(child, `${key}-${index}`, resolve));

  switch (block?.type) {
    case "heading": {
      const headingClass = {
        1: "text-xl font-semibold mt-6 mb-2 text-foreground",
        2: "text-lg font-semibold mt-5 mb-2 text-foreground",
        3: "text-base font-semibold mt-4 mb-1.5 text-foreground",
        4: "text-sm font-semibold mt-4 mb-1 text-foreground",
      }[block.level];
      const Tag = `h${block.level}` as "h1" | "h2" | "h3" | "h4";
      return <Tag key={key} className={headingClass}>{inline(block.children)}</Tag>;
    }
    case "paragraph":
      return <p key={key} className="my-2 leading-relaxed text-muted-foreground">{inline(block.children)}</p>;
    case "blockquote":
      return <blockquote key={key} className="my-4 border-l-2 border-primary/30 pl-4 italic text-muted-foreground">{inline(block.children)}</blockquote>;
    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      const renderNodes = (nodes: DepthNode<BlogInlineNode[]>[], root: boolean): ReactNode => (
        <ListTag key={root ? key : undefined} className={cn(root ? "my-3" : "mt-1", "pl-5 space-y-1 text-muted-foreground", block.ordered ? "list-decimal" : "list-disc")}>
          {nodes.map((node) => (
            <li key={`${key}-${node.index}`} className="leading-relaxed marker:text-primary">
              {node.item.map((child, childIndex) => renderInlineNode(child, `${key}-${node.index}-${childIndex}`, resolve))}
              {node.children.length > 0 ? renderNodes(node.children, false) : null}
            </li>
          ))}
        </ListTag>
      );
      return renderNodes(nestByDepth(block.items, block.depths), true);
    }
    case "image":
      return (
        <figure key={key} className="my-4">
          <img src={block.src} alt={block.alt ?? ""} className="w-full rounded-lg border border-border object-cover" loading="lazy" />
          {block.alt ? <figcaption className="mt-2 text-xs text-muted-foreground">{block.alt}</figcaption> : null}
        </figure>
      );
    case "callout":
      return (
        <aside key={key} role="note" data-block="callout" className={cn("ws-callout my-3 flex gap-3 rounded-[4px] border border-border p-3 text-foreground", isBlogColorName(block.color) ? `ws-bg-${block.color}` : "bg-muted/40")}>
          <span aria-hidden className="shrink-0 leading-relaxed">{block.icon || "💡"}</span>
          <div className="min-w-0 flex-1 leading-relaxed">{inline(block.children)}</div>
        </aside>
      );
    case "toggle":
      return (
        <details key={key} data-block="toggle" className="ws-toggle my-2">
          <summary className="cursor-pointer font-medium text-foreground">{inline(block.summary)}</summary>
          <div className="ml-5 border-l border-border pl-3">
            {(Array.isArray(block.children) ? block.children : []).map((child, index) => renderBlockNode(child, `${key}-${index}`, resolve))}
          </div>
        </details>
      );
    case "todo": {
      const nodes = nestByDepth(block.items, block.items.map((item) => item.depth ?? 0));
      const renderNodes = (list: typeof nodes, root: boolean): ReactNode => (
        <ul key={root ? key : undefined} {...(root ? { "data-block": "todo" } : {})} className={cn("ws-todo space-y-1 text-muted-foreground", root ? "my-3" : "mt-1 pl-6")}>
          {list.map((node) => (
            <li key={`${key}-${node.index}`} className="leading-relaxed">
              <div className="flex items-start gap-2">
                <input type="checkbox" checked={Boolean(node.item.checked)} readOnly disabled aria-label={node.item.checked ? "Done" : "Not done"} className="mt-1.5" />
                <span className={cn(node.item.checked && "line-through opacity-70")}>
                  {node.item.children.map((child, childIndex) => renderInlineNode(child, `${key}-${node.index}-${childIndex}`, resolve))}
                </span>
              </div>
              {node.children.length > 0 ? renderNodes(node.children, false) : null}
            </li>
          ))}
        </ul>
      );
      return renderNodes(nodes, true);
    }
    case "code":
      return (
        <pre key={key} data-block="code" data-language={block.language || undefined} className="ws-code my-3 overflow-x-auto rounded-[4px] border border-border bg-muted/40 p-3 text-[13px] leading-relaxed">
          <code>{block.text}</code>
        </pre>
      );
    case "divider":
      return <hr key={key} data-block="divider" className="my-6 border-border" />;
    case "table":
      return (
        <div key={key} data-block="table" className="my-4 overflow-x-auto">
          <table
            className="ws-table w-full border-collapse text-sm"
            data-spacing={block.spacing}
            style={fixedTableWidth(block.colWidths) ? { width: fixedTableWidth(block.colWidths) } : undefined}
          >
            {block.colWidths?.some((width) => width) ? (
              <colgroup>
                {block.colWidths.map((width, index) => (
                  <col key={`${key}-col-${index}`} style={width ? { width: `${width}px` } : undefined} />
                ))}
              </colgroup>
            ) : null}
            <tbody>
              {block.rows.map((row, rowIndex) => {
                const Cell = block.header && rowIndex === 0 ? "th" : "td";
                return (
                  <tr key={`${key}-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <Cell key={`${key}-${rowIndex}-${cellIndex}`} className={`border border-border text-left align-top ${block.spacing === "compact" ? "px-2 py-1" : block.spacing === "spacious" ? "px-4 py-4" : "px-3 py-2"}`}>
                        {cell.map((child, childIndex) => renderInlineNode(child, `${key}-${rowIndex}-${cellIndex}-${childIndex}`, resolve))}
                      </Cell>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    case "pageLink": {
      const href = resolve({ id: block.articleId, slug: block.slug, title: block.title });
      const body = (
        <>
          <span aria-hidden>📄</span> <span className="underline underline-offset-2">{block.title}</span>
        </>
      );
      return (
        <div key={key} data-block="pageLink" className="ws-page-link my-2">
          {href ? <a href={href} className="inline-flex items-center gap-2 text-foreground">{body}</a> : <span className="inline-flex items-center gap-2 text-foreground">{body}</span>}
        </div>
      );
    }
    default:
      return (
        <div key={key} role="note" data-unknown-block={String((block as { type?: unknown } | null)?.type ?? "unknown")} className="ws-unknown-block my-3 rounded-[4px] border border-dashed border-destructive/60 p-3 text-sm text-destructive">
          Unsupported block type “{String((block as { type?: unknown } | null)?.type ?? "unknown")}”. It is kept in the document but cannot be shown.
        </div>
      );
  }
};

const BlogPostRenderer = ({ content, className, emptyMessage = "Nothing to display yet.", resolvePageHref }: BlogPostRendererProps) => {
  const resolve = resolvePageHref ?? defaultResolvePageHref;
  const blocks = normalizeContent(content).filter((block) => {
    if (!block || typeof block !== "object") return false;
    if (block.type === "image") return Boolean(block.src?.trim());
    if (block.type === "list") return block.items.length > 0;
    return true;
  });

  return (
    <BlogRendererBoundary>
      <div className={cn("max-w-none", className)}>
        {blocks.length > 0 ? (
          blocks.map((block, index) => renderBlockNode(block, `${block.type}-${index}`, resolve))
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </div>
    </BlogRendererBoundary>
  );
};

export default BlogPostRenderer;
