import { describe, expect, it } from "vitest";
import { attachmentPreviewKind } from "@/features/admin/email/attachmentPreview";

describe("attachmentPreviewKind", () => {
  it("opens .jpg labelled image/jpg as an image", () => {
    expect(attachmentPreviewKind("~WRD378.jpg", "image/jpg")).toEqual({ kind: "image", type: "image/jpeg" });
  });
  it("opens .jpg labelled as a generic file as an image", () => {
    expect(attachmentPreviewKind("photo.JPG", "application/octet-stream")).toEqual({ kind: "image", type: "image/jpeg" });
  });
  it("opens .pdf as PDF even when labelled generic", () => {
    expect(attachmentPreviewKind("invoice.pdf", "application/octet-stream")).toEqual({ kind: "pdf", type: "application/pdf" });
  });
  it("does not preview html or unknown files", () => {
    expect(attachmentPreviewKind("page.html", "text/plain")).toBeNull();
    expect(attachmentPreviewKind("setup.exe", "application/octet-stream")).toBeNull();
  });
});
