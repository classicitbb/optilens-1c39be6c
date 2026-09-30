import { describe, expect, it } from "vitest";
import { validateHelpdeskFiles } from "@/lib/helpdeskAttachments";

const image = (name: string, size: number) => new File([new Uint8Array(size)], name, { type: "image/png" });

describe("helpdesk attachment validation", () => {
  it("rejects more than five files before upload", () => {
    expect(validateHelpdeskFiles(Array.from({ length: 6 }, (_, index) => image(`${index}.png`, 1))))
      .toBe("Add up to five files at a time.");
  });

  it("accepts photos, documents and audio", () => {
    const file = (name: string, type: string) => new File([new Uint8Array(1)], name, { type });
    expect(validateHelpdeskFiles([file("a.png", "image/png"), file("b.pdf", "application/pdf"), file("c.mp3", "audio/mpeg")])).toBeNull();
  });

  it("rejects unsupported file types", () => {
    expect(validateHelpdeskFiles([new File([new Uint8Array(1)], "run.exe", { type: "application/x-msdownload" })]))
      .toBe("run.exe is not a supported photo, document or audio file.");
  });

  it("rejects a file larger than 10 MB before upload", () => {
    expect(validateHelpdeskFiles([image("large.png", 10 * 1024 * 1024 + 1)]))
      .toBe("large.png is larger than 10 MB.");
  });
});
