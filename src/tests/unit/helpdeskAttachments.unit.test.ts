import { describe, expect, it } from "vitest";
import { validateHelpdeskImages } from "@/lib/helpdeskAttachments";

const image = (name: string, size: number) => new File([new Uint8Array(size)], name, { type: "image/png" });

describe("helpdesk image validation", () => {
  it("rejects more than five images before upload", () => {
    expect(validateHelpdeskImages(Array.from({ length: 6 }, (_, index) => image(`${index}.png`, 1))))
      .toBe("Add up to five images at a time.");
  });

  it("rejects an image larger than 10 MB before upload", () => {
    expect(validateHelpdeskImages([image("large.png", 10 * 1024 * 1024 + 1)]))
      .toBe("large.png is larger than 10 MB.");
  });
});
