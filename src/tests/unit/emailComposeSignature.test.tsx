import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { EmailAccount, EmailSignature } from "@/lib/emailBridge";
import { EMPTY_DRAFT } from "@/features/admin/email/format";

const signatures: EmailSignature[] = [
  { signature_id: 7, account_code: "russell", name: "Standard", body_html: "<p><b>Russell Hunte</b><br>Classic Visions</p>", is_default: true, updated_at: "2026-10-13" },
];

vi.mock("@/features/admin/email/useEmail", () => ({
  useSendEmail: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSignatures: () => ({ data: signatures }),
  useContactSearch: () => ({ data: [], isFetching: false }),
}));

const { ComposeDialog } = await import("@/features/admin/email/ComposeDialog");

const account = { code: "russell", address: "russell@cv.bb", displayName: "Russell", canSend: true, canManage: true } as EmailAccount;

describe("Compose signature", () => {
  it("shows the mailbox default signature inside the message box, under the text", async () => {
    render(<ComposeDialog draft={{ ...EMPTY_DRAFT, account: "russell", text: "Hello" }} accounts={[account]} onClose={() => undefined} onManageSignatures={() => undefined} />);
    const message = await screen.findByRole("textbox", { name: "Message" });
    const signature = screen.getByLabelText("Signature");
    expect(signature).toHaveTextContent("Russell Hunte");
    const box = message.closest(".email-editor")!;
    expect(box).toContainElement(signature);
    // The signature follows the editable text in the box.
    expect(message.compareDocumentPosition(signature) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector("#compose-signature")).toHaveTextContent("Standard (default)");
  });
});
