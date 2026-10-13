import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { EmailAccount, EmailSignature } from "@/lib/emailBridge";

const save = vi.fn(async () => ({ signature_id: 1 }));
const remove = vi.fn(async () => ({ ok: true }));
const signatures: EmailSignature[] = [
  {
    signature_id: 1,
    account_code: "russell",
    name: "Standard",
    body_html: `<table><tr><td><img src="https://cv.bb/logo.png" onerror="x()"></td><td><b>Russell</b></td></tr></table>`,
    is_default: true,
    updated_at: "2026-10-13",
  },
];

vi.mock("@/features/admin/email/useEmail", () => ({
  useSignatures: () => ({ data: signatures, isError: false }),
  useSignatureMutations: () => ({ save: { mutateAsync: save, isPending: false }, remove: { mutateAsync: remove, isPending: false } }),
}));

const { SignatureManager } = await import("@/features/admin/email/SignatureManager");

const account = { code: "russell", address: "russell@cv.bb", displayName: "Russell", canManage: true } as EmailAccount;

describe("SignatureManager", () => {
  it("lists signatures with the default marked", () => {
    render(<SignatureManager account={account} />);
    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("opens a table signature in HTML mode and saves it sanitised", async () => {
    render(<SignatureManager account={account} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Standard" }));
    expect(screen.getByRole("tab", { name: /HTML/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Signature preview").innerHTML).not.toContain("onerror");
    fireEvent.change(screen.getByLabelText("Signature name"), { target: { value: "Main" } });
    fireEvent.click(screen.getByRole("button", { name: "Save signature" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const [body] = save.mock.calls[0] as unknown as [{ signature_id: number; name: string; html: string; is_default: boolean }];
    expect(body).toMatchObject({ signature_id: 1, name: "Main", is_default: true });
    expect(body.html).toContain(`<img src="https://cv.bb/logo.png">`);
    expect(body.html).not.toContain("onerror");
  });
});
