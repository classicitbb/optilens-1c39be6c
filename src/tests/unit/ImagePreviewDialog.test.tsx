import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImagePreviewDialog } from "@/components/account/ImagePreviewDialog";
import { HelpdeskImageAttachments } from "@/components/account/HelpdeskImageAttachments";

vi.mock("@/lib/helpdeskAttachments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/helpdeskAttachments")>()),
  getHelpdeskAttachmentUrls: () => Promise.resolve([]),
}));

const transform = () => (screen.getByRole("img", { name: "photo.png" }) as HTMLImageElement).style.transform;
const percent = () => screen.getByText(/%$/).textContent;

describe("ImagePreviewDialog", () => {
  it("zooms in and out, rotates both ways and resets", () => {
    render(<ImagePreviewDialog image={{ src: "blob:photo", name: "photo.png" }} onClose={() => undefined} />);
    expect(percent()).toBe("100%");

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(percent()).toBe("125%");
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(percent()).toBe("80%");

    fireEvent.click(screen.getByRole("button", { name: "Rotate right" }));
    expect(transform()).toContain("rotate(90deg)");
    fireEvent.click(screen.getByRole("button", { name: "Rotate left" }));
    fireEvent.click(screen.getByRole("button", { name: "Rotate left" }));
    expect(transform()).toContain("rotate(-90deg)");

    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    expect(percent()).toBe("100%");
    expect(transform()).toContain("rotate(0deg)");
  });

  it("supports keyboard shortcuts and the mouse wheel", () => {
    render(<ImagePreviewDialog image={{ src: "blob:photo", name: "photo.png" }} onClose={() => undefined} />);
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });

    fireEvent.keyDown(zoomIn, { key: "+" });
    expect(percent()).toBe("125%");
    fireEvent.keyDown(zoomIn, { key: "r" });
    expect(transform()).toContain("rotate(90deg)");
    fireEvent.keyDown(zoomIn, { key: "R" });
    expect(transform()).toContain("rotate(0deg)");
    fireEvent.wheel(screen.getByRole("img", { name: "photo.png" }), { deltaY: -100 });
    expect(percent()).toBe("156%");
    fireEvent.keyDown(zoomIn, { key: "0" });
    expect(percent()).toBe("100%");
  });

  it("stops zooming at the limits", () => {
    render(<ImagePreviewDialog image={{ src: "blob:photo", name: "photo.png" }} onClose={() => undefined} />);
    for (let i = 0; i < 30; i += 1) fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(percent()).toBe("800%");
    expect((screen.getByRole("button", { name: "Zoom in" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders nothing when there is no image and closes through the close button", () => {
    const onClose = vi.fn();
    const { rerender } = render(<ImagePreviewDialog image={null} onClose={onClose} />);
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<ImagePreviewDialog image={{ src: "blob:photo", name: "photo.png" }} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("HelpdeskImageAttachments", () => {
  beforeEach(() => {
    let count = 0;
    URL.createObjectURL = () => `blob:test-${(count += 1)}`;
    URL.revokeObjectURL = () => undefined;
    Element.prototype.scrollIntoView = vi.fn();
  });

  const pasteImage = (target: Element) => {
    const file = new File([new Uint8Array(4)], "photo.png", { type: "image/png" });
    fireEvent.paste(target, { clipboardData: { files: [file] } });
  };

  it("shows a pasted image directly under the field, above the drop box, with a cue", () => {
    render(
      <div role="dialog">
        <textarea aria-label="body" />
        <HelpdeskImageAttachments ticketId="" attachments={[]} onFilesChange={() => undefined} />
      </div>,
    );
    pasteImage(screen.getByLabelText("body"));

    const cue = screen.getByRole("status");
    expect(cue.textContent).toContain("1 file attached");
    const thumb = screen.getByRole("button", { name: "Preview photo.png" });
    const dropBox = screen.getByText(/Paste or drag files here/);
    // Thumbnail strip precedes the drop box in the document.
    expect(thumb.compareDocumentPosition(dropBox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("opens the preview dialog when an image is clicked", () => {
    render(
      <div role="dialog">
        <textarea aria-label="body" />
        <HelpdeskImageAttachments ticketId="" attachments={[]} onFilesChange={() => undefined} />
      </div>,
    );
    pasteImage(screen.getByLabelText("body"));
    fireEvent.click(screen.getByRole("button", { name: "Preview photo.png" }));

    expect(screen.getByRole("button", { name: "Zoom in" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rotate right" })).toBeTruthy();
  });
});
