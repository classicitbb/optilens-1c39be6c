import type { BlogBlockNode, BlogCanonicalContent, BlogInlineNode } from "@/components/blog/BlogPostRenderer";

const inlineToMarkdown = (nodes: BlogInlineNode[]): string =>
  (Array.isArray(nodes) ? nodes : [])
    .map((node) => {
      switch (node?.type) {
        case "text":
          return node.text;
        case "strong":
          return `**${inlineToMarkdown(node.children)}**`;
        case "emphasis":
          return `*${inlineToMarkdown(node.children)}*`;
        case "strike":
          return `~~${inlineToMarkdown(node.children)}~~`;
        case "code":
          return `\`${inlineToMarkdown(node.children)}\``;
        case "link":
          return `[${inlineToMarkdown(node.children)}](${node.href})`;
        case "underline":
        case "color":
          return inlineToMarkdown(node.children);
        case "mention":
          if (node.kind === "person") return `@${node.label}`;
          if (node.kind === "page" && node.slug) return `[${node.label}](/knowledge/${node.slug})`;
          return node.label;
        default:
          return "";
      }
    })
    .join("");

const cell = (nodes: BlogInlineNode[]) => inlineToMarkdown(nodes).replace(/\|/g, "\\|").replace(/\n/g, " ");

const blockToMarkdown = (block: BlogBlockNode): string => {
  switch (block?.type) {
    case "heading":
      return `${"#".repeat(block.level)} ${inlineToMarkdown(block.children)}`;
    case "paragraph":
      return inlineToMarkdown(block.children);
    case "blockquote":
      return `> ${inlineToMarkdown(block.children)}`;
    case "list":
      return block.items
        .map((item, index) => `${block.ordered ? `${index + 1}.` : "-"} ${inlineToMarkdown(item)}`)
        .join("\n");
    case "image":
      return `![${block.alt ?? ""}](${block.src})`;
    case "callout":
      return `> ${block.icon ? `${block.icon} ` : ""}${inlineToMarkdown(block.children)}`;
    case "toggle": {
      const body = (block.children ?? []).map(blockToMarkdown).filter((chunk) => chunk.trim()).join("\n\n");
      return `<details>\n<summary>${inlineToMarkdown(block.summary)}</summary>\n\n${body}\n\n</details>`;
    }
    case "todo":
      return block.items.map((item) => `- [${item.checked ? "x" : " "}] ${inlineToMarkdown(item.children)}`).join("\n");
    case "code":
      return `\`\`\`${block.language ?? ""}\n${block.text}\n\`\`\``;
    case "divider":
      return "---";
    case "table": {
      if (block.rows.length === 0) return "";
      const columns = Math.max(...block.rows.map((row) => row.length));
      const line = (row: BlogInlineNode[][]) =>
        `| ${Array.from({ length: columns }, (_, index) => cell(row[index] ?? [])).join(" | ")} |`;
      const [first, ...rest] = block.rows;
      const head = block.header ? first : Array.from({ length: columns }, () => [] as BlogInlineNode[]);
      const body = block.header ? rest : block.rows;
      return [line(head), `| ${Array.from({ length: columns }, () => "---").join(" | ")} |`, ...body.map(line)].join("\n");
    }
    case "pageLink":
      return `[${block.title}](${block.slug ? `/knowledge/${block.slug}` : "#"})`;
    default:
      return "";
  }
};

/** Export a canonical wiki document as Markdown, with the page title as H1. */
export const canonicalToMarkdown = (title: string, doc: BlogCanonicalContent): string => {
  const body = doc.blocks.map(blockToMarkdown).filter((chunk) => chunk.trim().length > 0);
  return [`# ${title.trim() || "Untitled"}`, ...body].join("\n\n") + "\n";
};

/** Markdown of the body only (no title). Used to run publish metadata checks on block text. */
export const canonicalBodyToMarkdown = (doc: BlogCanonicalContent): string =>
  doc.blocks
    .map(blockToMarkdown)
    .filter((chunk) => chunk.trim().length > 0)
    .join("\n\n");
