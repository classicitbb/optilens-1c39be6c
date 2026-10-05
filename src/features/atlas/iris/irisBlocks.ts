import type { BlogBlockNode } from "@/components/blog/BlogPostRenderer";
import { toCanonicalDocument } from "@/lib/wikiCanonical";

const TODO_LINE = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/;

/**
 * Turns Iris's reply (plain text or Markdown) into canonical blocks. Checklist lines become a
 * to-do block; everything else goes through the canonical Markdown parser. Nothing here touches a
 * page: a proposal only becomes real once the user accepts it.
 */
export const textToBlocks = (text: string): BlogBlockNode[] => {
  const blocks: BlogBlockNode[] = [];
  let prose: string[] = [];
  let todos: { text: string; checked: boolean }[] = [];

  const flushProse = () => {
    const joined = prose.join("\n").trim();
    prose = [];
    if (joined) blocks.push(...toCanonicalDocument(joined).blocks);
  };
  const flushTodos = () => {
    if (todos.length === 0) return;
    blocks.push({ type: "todo", items: todos.map((item) => ({ checked: item.checked, children: [{ type: "text", text: item.text }] })) } as BlogBlockNode);
    todos = [];
  };

  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const todo = TODO_LINE.exec(line);
    if (todo) {
      flushProse();
      todos.push({ text: todo[2].trim(), checked: todo[1].toLowerCase() === "x" });
    } else {
      flushTodos();
      prose.push(line);
    }
  }
  flushProse();
  flushTodos();
  return blocks;
};

/** Plain text of a reply for replacing a selection inline: Markdown emphasis and list markers removed. */
export const toInlineText = (text: string): string =>
  text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, "")
    .replace(/\s*\n\s*/g, " ")
    .trim();
