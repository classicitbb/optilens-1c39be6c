import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { RootContent, PhrasingContent, List } from "mdast";
import type { BlogBlockNode, BlogInlineNode, BlogTodoItem } from "@/components/blog/BlogPostRenderer";
import { canonicalToSearchText } from "@/lib/wikiCanonical";

const parser = unified().use(remarkParse).use(remarkGfm);
const inline = (nodes: PhrasingContent[]): BlogInlineNode[] => nodes.flatMap((node): BlogInlineNode[] => {
  switch (node.type) {
    case "text": return [{ type: "text", text: node.value }];
    case "break": return [{ type: "text", text: "\n" }];
    case "strong": return [{ type: "strong", children: inline(node.children) }];
    case "emphasis": return [{ type: "emphasis", children: inline(node.children) }];
    case "delete": return [{ type: "strike", children: inline(node.children) }];
    case "inlineCode": return [{ type: "code", children: [{ type: "text", text: node.value }] }];
    case "link": return [{ type: "link", href: node.url, children: inline(node.children) }];
    case "image": return [{ type: "text", text: node.alt ?? "" }];
    default: return "children" in node ? inline(node.children as PhrasingContent[]) : [];
  }
});
const listBlocks = (list: List): BlogBlockNode[] => {
  const blocks: BlogBlockNode[] = [];
  const visit = (current: List, depth: number) => {
    for (const item of current.children) {
      const children = item.children.flatMap((child) => child.type === "paragraph" ? inline(child.children) : []);
      const previous = blocks.at(-1);
      if (typeof item.checked === "boolean") {
        const todo: BlogTodoItem = { checked: item.checked, children, ...(depth ? { depth } : {}) };
        if (previous?.type === "todo") previous.items.push(todo);
        else blocks.push({ type: "todo", items: [todo] });
      } else if (previous?.type === "list" && previous.ordered === Boolean(current.ordered)) {
        previous.items.push(children);
        previous.depths!.push(depth);
      } else blocks.push({ type: "list", ordered: Boolean(current.ordered), items: [children], depths: [depth] });
      for (const child of item.children) if (child.type === "list") visit(child, depth + 1);
    }
  };
  visit(list, 0);
  return blocks;
};
const convert = (nodes: RootContent[]): BlogBlockNode[] => nodes.flatMap((node): BlogBlockNode[] => {
  switch (node.type) {
    case "heading": return [{ type: "heading", level: Math.min(node.depth, 4) as 1 | 2 | 3 | 4, children: inline(node.children) }];
    case "paragraph":
      if (node.children.length === 1 && node.children[0].type === "image") {
        const image = node.children[0];
        return [{ type: "image", src: image.url, alt: image.alt ?? "" }];
      }
      return [{ type: "paragraph", children: inline(node.children) }];
    case "list": return listBlocks(node);
    case "blockquote": return node.children.flatMap((child) => child.type === "paragraph" ? [{ type: "blockquote" as const, children: inline(child.children) }] : convert([child]));
    case "thematicBreak": return [{ type: "divider" }];
    case "code": return [{ type: "code", text: node.value, ...(node.lang ? { language: node.lang } : {}) }];
    case "table": return [{ type: "table", header: true, rows: node.children.map((row) => row.children.map((cell) => inline(cell.children))) }];
    default: return [];
  }
});
/** One conversion for the reply, proposal preview and accepted editor content. */
export const textToBlocks = (text: string): BlogBlockNode[] => convert(parser.parse(text).children);
export const toInlineText = (text: string): string => canonicalToSearchText({ blocks: textToBlocks(text) }).replace(/\s+/g, " ").trim();
