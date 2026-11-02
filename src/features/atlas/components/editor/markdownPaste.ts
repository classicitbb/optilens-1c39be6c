import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Slice } from "@tiptap/pm/model";
import { canonicalToTiptapDoc } from "@/lib/wikiCanonical";
import { textToBlocks } from "../../iris/irisBlocks";

/** Convert Markdown copied as text; rich HTML and literal/code pastes keep native handling. */
export const MarkdownPaste = Extension.create({
  name: "markdownPaste",
  addProseMirrorPlugins() {
    let literalPaste = false;
    return [new Plugin({
      props: {
        handleKeyDown(_view, event) {
          literalPaste = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "v";
          return false;
        },
        handleDOMEvents: {
          keyup() { literalPaste = false; return false; },
        },
        handlePaste(view, event) {
          const clipboard = event.clipboardData;
          const literal = literalPaste;
          literalPaste = false;
          if (!clipboard || literal || view.state.selection.$from.parent.type.spec.code || clipboard.getData("text/html")) return false;
          const text = clipboard.getData("text/plain");
          if (!text.trim()) return false;
          const blocks = textToBlocks(text);
          // Ordinary prose should retain the browser's existing paste semantics.
          const formatted = blocks.some((block) => block.type !== "paragraph" || block.children.some((node) => node.type !== "text"));
          if (!formatted) return false;
          const doc = view.state.schema.nodeFromJSON(canonicalToTiptapDoc({ blocks }));
          view.dispatch(view.state.tr.replaceSelection(new Slice(doc.content, 0, 0)).scrollIntoView());
          return true;
        },
      },
    })];
  },
});
