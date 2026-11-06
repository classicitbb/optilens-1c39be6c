import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import CrmOutboxPage from "@/pages/admin/crm/CrmOutboxPage";

const state = vi.hoisted(() => ({ update: vi.fn(), status: "approved", generatedBy: "human" }));
vi.mock("@/contexts/AdminRoleContext", () => ({ useAdminRole: () => ({ canEdit: true }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useContacts", () => ({ useContacts: () => ({ data: [{ id: "c1", name: "Test business", email: "test@example.test", phone: "+12465550100" }] }) }));
vi.mock("@/features/admin/crm/hooks/useCadences", () => ({
  useOutbox: () => ({ data: [{ id: "d1", contact_id: "c1", subject: "", body: "Could we discuss your lens needs?", status: state.status, channel: "whatsapp", generated_by: state.generatedBy }] }),
  useUpdateOutbox: () => ({ mutateAsync: state.update }), useGenerateDueSteps: () => ({ mutateAsync: vi.fn() }),
}));
beforeEach(() => { state.status = "approved"; state.generatedBy = "human"; state.update.mockReset().mockResolvedValue(undefined); });
const renderOutbox = () => render(<MemoryRouter><CrmOutboxPage /></MemoryRouter>);

describe("Outbox sending is an explicit recorded outcome", () => {
  it("blocks a practice draft from being sent or recorded as sent", () => {
    state.generatedBy = "practice"; renderOutbox();
    expect(screen.getByRole("button", { name: "WhatsApp" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "I sent it — record send" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue in guided outreach" })).toHaveAttribute("href", expect.stringContaining("practice=1"));
  });
  it("opening WhatsApp never marks a message sent", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderOutbox(); fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(open).toHaveBeenCalledOnce();
    expect(state.update).not.toHaveBeenCalled(); open.mockRestore();
  });
  it("requires explicit confirmation before recording an external send", async () => {
    renderOutbox(); fireEvent.click(screen.getByRole("button", { name: "I sent it — record send" }));
    expect(state.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Yes, record the send" }));
    await waitFor(() => expect(state.update).toHaveBeenCalledWith({ id: "d1", patch: expect.objectContaining({ status: "sent", sent_at: expect.any(String) }) }));
  });
  it("approves the edited text in the same save", async () => {
    state.status = "draft"; renderOutbox();
    fireEvent.change(screen.getByLabelText("Outreach message"), { target: { value: "Could we talk about stock lens availability?" } });
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(state.update).toHaveBeenCalledWith({ id: "d1", patch: { status: "approved", subject: "", body: "Could we talk about stock lens availability?" } }));
  });
});
