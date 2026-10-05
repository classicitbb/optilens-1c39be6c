import type { Editor, Range } from "@tiptap/core";
import {
  Code2,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Lightbulb,
  List,
  ListChecks,
  ListOrdered,
  ListTodo,
  Minus,
  PenLine,
  Quote,
  Sparkles,
  Table2,
  ChevronRight,
  TriangleAlert,
  Type,
  type LucideIcon,
} from "lucide-react";
import { turnInto, type TurnIntoKind } from "./blockOps";
import { ATLAS_TEMPLATES } from "../../templates";
import type { AskIrisRequest } from "./extensions";

export type SlashGroup = "Basic" | "Templates" | "Iris";
export const SLASH_GROUPS: SlashGroup[] = ["Basic", "Templates", "Iris"];

export interface SlashContext {
  editor: Editor;
  range: Range;
  askIris: (request: AskIrisRequest) => void;
  openImageDialog: () => void;
  /** Start a block-level page link: types "@" so the page picker opens. */
  startPageLink: () => void;
}

export interface SlashItem {
  id: string;
  group: SlashGroup;
  title: string;
  hint?: string;
  keywords: string[];
  icon: LucideIcon;
  run: (context: SlashContext) => void;
}

const clear = ({ editor, range }: SlashContext) => editor.chain().focus().deleteRange(range).run();

const convert = (kind: TurnIntoKind) => (context: SlashContext) => {
  clear(context);
  turnInto(context.editor, kind);
};

const insertBlocks = (content: unknown[]) => (context: SlashContext) => {
  const { editor, range } = context;
  editor.chain().focus().deleteRange(range).insertContent(content).run();
};

export const SLASH_ITEMS: SlashItem[] = [
  { id: "text", group: "Basic", title: "Text", hint: "Plain paragraph", keywords: ["paragraph", "plain"], icon: Type, run: convert("paragraph") },
  { id: "h1", group: "Basic", title: "Heading 1", hint: "#", keywords: ["h1", "title"], icon: Heading1, run: convert("h1") },
  { id: "h2", group: "Basic", title: "Heading 2", hint: "##", keywords: ["h2", "subtitle"], icon: Heading2, run: convert("h2") },
  { id: "h3", group: "Basic", title: "Heading 3", hint: "###", keywords: ["h3"], icon: Heading3, run: convert("h3") },
  { id: "bullet", group: "Basic", title: "Bulleted list", hint: "-", keywords: ["ul", "unordered", "list"], icon: List, run: convert("bullet") },
  { id: "number", group: "Basic", title: "Numbered list", hint: "1.", keywords: ["ol", "ordered", "list"], icon: ListOrdered, run: convert("number") },
  { id: "todo", group: "Basic", title: "To-do list", hint: "[]", keywords: ["todo", "to-do", "checkbox", "task", "checklist"], icon: ListTodo, run: convert("todo") },
  { id: "toggle", group: "Basic", title: "Toggle", hint: ">", keywords: ["collapse", "fold", "details"], icon: ChevronRight, run: convert("toggle") },
  { id: "quote", group: "Basic", title: "Quote", hint: '"', keywords: ["blockquote", "cite"], icon: Quote, run: convert("quote") },
  { id: "callout", group: "Basic", title: "Callout", hint: "Highlighted note", keywords: ["note", "tip", "info"], icon: Lightbulb, run: convert("callout") },
  { id: "divider", group: "Basic", title: "Divider", hint: "---", keywords: ["hr", "line", "separator"], icon: Minus, run: (context) => context.editor.chain().focus().deleteRange(context.range).setHorizontalRule().run() },
  { id: "code", group: "Basic", title: "Code", hint: "```", keywords: ["snippet", "pre"], icon: Code2, run: convert("code") },
  {
    id: "image",
    group: "Basic",
    title: "Image",
    hint: "From a URL",
    keywords: ["picture", "photo", "img"],
    icon: ImageIcon,
    run: (context) => {
      clear(context);
      context.openImageDialog();
    },
  },
  {
    id: "table",
    group: "Basic",
    title: "Table",
    hint: "3 × 3 with header",
    keywords: ["grid", "rows", "columns"],
    icon: Table2,
    run: (context) => context.editor.chain().focus().deleteRange(context.range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: "pagelink",
    group: "Basic",
    title: "Page link",
    hint: "@page",
    keywords: ["link", "mention", "page", "reference"],
    icon: FileText,
    run: (context) => {
      clear(context);
      context.startPageLink();
    },
  },

  ...ATLAS_TEMPLATES.map(
    (template): SlashItem => ({
      id: `template-${template.id}`,
      group: "Templates",
      title: template.title,
      hint: template.hint,
      keywords: template.keywords,
      icon: template.id === "warning" ? TriangleAlert : template.id === "checklist" ? ListChecks : ListOrdered,
      run: insertBlocks(template.content),
    }),
  ),

  {
    id: "iris-ask",
    group: "Iris",
    title: "Ask Iris…",
    hint: "Open the Iris panel",
    keywords: ["ai", "assistant", "help"],
    icon: Sparkles,
    run: (context) => {
      clear(context);
      context.askIris({});
    },
  },
  {
    id: "iris-write",
    group: "Iris",
    title: "Write about…",
    hint: "Draft from a topic",
    keywords: ["draft", "generate", "write"],
    icon: PenLine,
    run: (context) => {
      clear(context);
      context.askIris({ prompt: "Write about…" });
    },
  },
  {
    id: "iris-summarize",
    group: "Iris",
    title: "Summarize this page",
    hint: "Short summary",
    keywords: ["summary", "tldr"],
    icon: Sparkles,
    run: (context) => {
      clear(context);
      context.askIris({ prompt: "Summarize this page" });
    },
  },
];

export const filterSlashItems = (query: string): SlashItem[] => {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) => item.title.toLowerCase().includes(q) || item.keywords.some((keyword) => keyword.includes(q)),
  );
};
