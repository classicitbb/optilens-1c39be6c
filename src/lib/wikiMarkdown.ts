import type { BlogBlockNode, BlogCanonicalContent, BlogInlineNode } from "@/components/blog/BlogPostRenderer";

const inlineToMarkdown = (nodes: BlogInlineNode[]): string =>
  nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return node.text;
        case "strong":
          return `**${inlineToMarkdown(node.children)}**`;
        case "emphasis":
          return `*${inlineToMarkdown(node.children)}*`;
        case "link":
          return `[${inlineToMarkdown(node.children)}](${node.href})`;
        default:
          return "";
      }
    })
    .join("");

const blockToMarkdown = (block: BlogBlockNode): string => {
  switch (block.type) {
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
    default:
      return "";
  }
};

/** Export a canonical wiki document as Markdown, with the page title as H1. */
export const canonicalToMarkdown = (title: string, doc: BlogCanonicalContent): string => {
  const body = doc.blocks.map(blockToMarkdown).filter((chunk) => chunk.trim().length > 0);
  return [`# ${title.trim() || "Untitled"}`, ...body].join("\n\n") + "\n";
};
