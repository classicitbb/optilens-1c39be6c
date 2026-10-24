/**
 * Slash-menu templates: reusable starting blocks an organisation can edit. Atlas ships a
 * neutral set; add, remove or reword entries here without touching the editor.
 */
export interface AtlasTemplate {
  id: string;
  title: string;
  hint: string;
  keywords: string[];
  /** Tiptap JSON nodes inserted at the cursor. */
  content: unknown[];
}

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

export const ATLAS_TEMPLATES: AtlasTemplate[] = [
  {
    id: "procedure",
    title: "Procedure steps",
    hint: "Numbered procedure",
    keywords: ["procedure", "steps", "process", "sop"],
    content: [{ type: "orderedList", content: [1, 2, 3].map((n) => ({ type: "listItem", content: [paragraph(`Step ${n}`)] })) }],
  },
  {
    id: "warning",
    title: "Warning callout",
    hint: "Orange ⚠️ note",
    keywords: ["warning", "caution", "important"],
    content: [{ type: "callout", attrs: { icon: "⚠️", color: "orange" }, content: [{ type: "text", text: "Warning: " }] }],
  },
  {
    id: "checklist",
    title: "Checklist",
    hint: "Before you finish",
    keywords: ["checklist", "verify", "qa"],
    content: [
      {
        type: "taskList",
        content: ["Check the details", "Confirm who is affected", "Record the outcome"].map((text) => ({
          type: "taskItem",
          attrs: { checked: false },
          content: [paragraph(text)],
        })),
      },
    ],
  },
];
