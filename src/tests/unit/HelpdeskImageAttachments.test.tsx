import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HelpdeskImageAttachments } from "@/components/account/HelpdeskImageAttachments";

vi.mock("@/lib/helpdeskAttachments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/helpdeskAttachments")>()),
  getHelpdeskAttachmentUrls: async (items: unknown[]) => items,
}));

const pdf = (name: string) => new File(["%PDF"], name, { type: "application/pdf" });

describe("HelpdeskImageAttachments drop and paste", () => {
  it("accepts a file dropped anywhere in the surrounding dialog and keeps earlier picks", () => {
    const onFilesChange = vi.fn();
    render(
      <div role="dialog">
        <input aria-label="Title" />
        <HelpdeskImageAttachments ticketId="" attachments={[]} onFilesChange={onFilesChange} />
      </div>,
    );

    fireEvent.drop(screen.getByLabelText("Title"), { dataTransfer: { types: ["Files"], files: [pdf("a.pdf")] } });
    fireEvent.drop(screen.getByRole("dialog"), { dataTransfer: { types: ["Files"], files: [pdf("b.pdf")] } });

    expect(onFilesChange).toHaveBeenLastCalledWith([expect.objectContaining({ name: "a.pdf" }), expect.objectContaining({ name: "b.pdf" })]);
  });

  it("accepts a file pasted from a field in the dialog", () => {
    const onFilesChange = vi.fn();
    render(
      <div role="dialog">
        <textarea aria-label="Description" />
        <HelpdeskImageAttachments ticketId="" attachments={[]} onFilesChange={onFilesChange} />
      </div>,
    );

    fireEvent.paste(screen.getByLabelText("Description"), { clipboardData: { files: [pdf("pasted.pdf")] } });

    expect(onFilesChange).toHaveBeenCalledWith([expect.objectContaining({ name: "pasted.pdf" })]);
  });
});
