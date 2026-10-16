import { describe, expect, it } from "vitest";
import { filterDocFiles, normalizeDocFile, sortDocFiles } from "@/features/admin/doc-studio/files/docFiles";

const files = [
  normalizeDocFile({ id: "1", kind: "file", fileType: "email", fileName: "Welcome Regina", isOwner: true, accessLevel: "owner", updatedAt: "2026-10-16" }),
  normalizeDocFile({ id: "2", kind: "file", fileType: "letter", fileName: "Notice", isOwner: false, accessLevel: "view", updatedAt: "2026-10-01" }),
  normalizeDocFile({ id: "3", kind: "billing", documentName: "QTE-0010", customerName: "Vision Care Plus", isOwner: true, status: "draft", updatedAt: "2026-10-10" }),
];

describe("Doc Studio file list", () => {
  it("names billing documents and files them under Billing", () => {
    expect(files[2]).toMatchObject({ fileName: "QTE-0010", fileType: "billing", kind: "billing" });
  });
  it("filters by type", () => {
    expect(filterDocFiles(files, { type: "billing" }).map((f) => f.id)).toEqual(["3"]);
  });
  it("filters by access", () => {
    expect(filterDocFiles(files, { access: "owner" }).map((f) => f.id)).toEqual(["1", "3"]);
    expect(filterDocFiles(files, { access: "shared" }).map((f) => f.id)).toEqual(["2"]);
    expect(filterDocFiles(files, { access: "view" }).map((f) => f.id)).toEqual(["2"]);
    expect(filterDocFiles(files, { access: "draft" }).map((f) => f.id)).toEqual(["3"]);
  });
  it("searches name and customer", () => {
    expect(filterDocFiles(files, { search: "vision care" }).map((f) => f.id)).toEqual(["3"]);
    expect(filterDocFiles(files, { search: "regina" }).map((f) => f.id)).toEqual(["1"]);
  });
  it("sorts newest first by date", () => {
    expect(sortDocFiles(files, "date", -1).map((f) => f.id)).toEqual(["1", "3", "2"]);
  });
});
