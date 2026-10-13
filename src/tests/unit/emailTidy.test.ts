import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { charEdits, tidyDoc } from "@/features/admin/email/emailTidy";

const apply = (a: string, edits: NonNullable<ReturnType<typeof charEdits>>) =>
  [...edits].reverse().reduce((text, edit) => text.slice(0, edit.at) + edit.insert + text.slice(edit.at + edit.remove), a);

describe("email tidy", () => {
  it("finds minimal character edits", () => {
    const a = "i dont  know";
    const b = "I don't know.";
    const edits = charEdits(a, b)!;
    expect(apply(a, edits)).toBe(b);
    expect(edits.length).toBeLessThanOrEqual(4);
  });

  it("tidies paragraphs without disturbing bold text or links", () => {
    const editor = new Editor({
      extensions: [StarterKit],
      content: `<p>hi <strong>ann</strong> ,thanks for the order</p><p>i will check the <a href="https://cv.bb">tracking page</a> today</p><h2>Next steps.</h2>`,
    });
    const result = tidyDoc(editor.state)!;
    expect(result.total).toBeGreaterThan(0);
    editor.view.dispatch(result.tr);
    expect(editor.getHTML()).toBe(
      `<p>Hi <strong>ann</strong>, thanks for the order.</p>` +
        `<p>I will check the <a target="_blank" rel="noopener noreferrer nofollow" href="https://cv.bb">tracking page</a> today.</p>` +
        // StarterKit keeps an empty paragraph after a final heading.
        `<h2>Next steps</h2><p></p>`,
    );
    expect(tidyDoc(editor.state)).toBeNull();
    editor.destroy();
  });
});
