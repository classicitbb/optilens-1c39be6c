import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  defaultDraft,
  draftFromFile,
  legacyBillingPayload,
  legacyFilePayload,
} from "@/features/admin/doc-studio/native/types";

describe("native Doc Studio compatibility", () => {
  it("keeps the legacy email payload shape when native files are saved", () => {
    const draft = defaultDraft("email");
    draft.name = "Welcome email";
    draft.content = {
      ...draft.content,
      emHeading: "Welcome",
      emBody: "<p>Hello</p>",
    };

    expect(
      legacyFilePayload(draft, "<article>preview</article>"),
    ).toMatchObject({
      fileType: "email",
      fileName: "Welcome email",
      content: { emHeading: "Welcome", emBody: "<p>Hello</p>" },
      renderedHtml: "<article>preview</article>",
    });
  });

  it("opens legacy billing documents without a data migration", () => {
    const draft = draftFromFile({
      id: "billing-1",
      kind: "billing",
      documentType: "quote",
      documentName: "QTE-0001",
      version: "v1",
      content: { billType: "quote", blNumber: "QTE-0001", blRows: [] },
      totals: {},
    });

    const payload = legacyBillingPayload(draft, "<article>quote</article>", {
      total: 0,
    });
    expect(payload).toMatchObject({
      documentType: "quote",
      documentName: "QTE-0001",
      billingNumber: "QTE-0001",
      version: "v1",
    });
  });

  it("keeps the versioned native gateway isolated behind the established Studio", () => {
    const api = readFileSync(
      resolve(process.cwd(), "src/features/admin/doc-studio/native/api.ts"),
      "utf8",
    );
    const edge = readFileSync(
      resolve(process.cwd(), "supabase/functions/docstudio-api/index.ts"),
      "utf8",
    );
    const page = readFileSync(
      resolve(process.cwd(), "src/pages/admin/website/DocStudioPage.tsx"),
      "utf8",
    );

    expect(api).toContain("docstudio-api/v2/");
    expect(edge).toContain('if (route[0] === "v2") route.shift();');
    expect(page).toContain("DocStudioEmbed");
    expect(page).toContain("exact layout");
  });
});
