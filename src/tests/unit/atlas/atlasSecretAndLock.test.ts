import { describe, expect, it } from "vitest";
import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";
import { canonicalHasSecret, canonicalToHtml, canonicalToSearchText, canonicalToTiptapDoc, tiptapDocToCanonical } from "@/lib/wikiCanonical";
import { canonicalToMarkdown } from "@/lib/wikiMarkdown";
import { checkPassword, createLock } from "@/features/atlas/lock";
import { validateForSave } from "@/features/atlas/publishValidation";

const withSecret: BlogCanonicalContent = {
  blocks: [
    { type: "paragraph", children: [{ type: "text", text: "Inbox login: " }, { type: "secret", value: "hunter2" }] },
    { type: "table", header: false, rows: [[[{ type: "text", text: "Mail" }], [{ type: "secret", value: "p@ss" }]]] },
  ],
};

describe("secret field", () => {
  it("survives the editor round trip, including inside a table cell", () => {
    expect(tiptapDocToCanonical(canonicalToTiptapDoc(withSecret))).toEqual(withSecret);
  });

  it("never reaches HTML, Markdown or search text", () => {
    for (const output of [canonicalToHtml(withSecret), canonicalToMarkdown("Mail", withSecret), canonicalToSearchText(withSecret)]) {
      expect(output).not.toContain("hunter2");
      expect(output).not.toContain("p@ss");
    }
  });

  it("is detected so public publishing can be refused", () => {
    expect(canonicalHasSecret(withSecret)).toBe(true);
    expect(canonicalHasSecret({ blocks: [{ type: "paragraph", children: [{ type: "text", text: 'a "type":"secret" mention' }] }] })).toBe(false);
  });
});

describe("page lock", () => {
  it("accepts the right password and rejects others", async () => {
    const lock = await createLock("correct horse");
    expect(await checkPassword(lock, "correct horse")).toBe(true);
    expect(await checkPassword(lock, "wrong")).toBe(false);
    expect(JSON.stringify(lock)).not.toContain("correct horse");
  });

  it("gives a locked page no search text", async () => {
    const doc = { ...withSecret, blocks: [{ type: "paragraph" as const, children: [{ type: "text" as const, text: "visible words" }] }], lock: await createLock("x") };
    expect(canonicalToSearchText(doc)).toBe("");
    expect(canonicalToSearchText({ blocks: doc.blocks })).toBe("visible words");
  });

  it("cannot be published to a public page, but can to an internal one", async () => {
    const doc: BlogCanonicalContent = { blocks: [], lock: await createLock("x") };
    expect(validateForSave("article", doc, "published", "public").valid).toBe(false);
    expect(validateForSave("article", withSecret, "published", "public").valid).toBe(false);
    expect(validateForSave("article", doc, "published", "internal").valid).toBe(true);
    expect(validateForSave("article", doc, "draft", "public").valid).toBe(true);
  });
});

describe("secret node view", () => {
  it("masks by default, reveals with the eye, and writes typing back to the document", async () => {
    const { Editor } = await import("@tiptap/core");
    const { buildBaseExtensions } = await import("@/features/atlas/components/editor/extensions");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const editor = new Editor({ element: host, extensions: buildBaseExtensions({}), content: canonicalToTiptapDoc(withSecret) });

    const input = host.querySelector<HTMLInputElement>(".ws-secret-input")!;
    expect(input.type).toBe("password");
    expect(input.value).toBe("hunter2");

    host.querySelector<HTMLButtonElement>(".ws-secret-eye")!.click();
    expect(input.type).toBe("text");
    host.querySelector<HTMLButtonElement>(".ws-secret-eye")!.click();
    expect(input.type).toBe("password");

    input.value = "changed!";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(JSON.stringify(tiptapDocToCanonical(editor.getJSON()))).toContain('"value":"changed!"');
    expect(editor.getText()).not.toContain("changed!");

    editor.destroy();
    host.remove();
  });
});
