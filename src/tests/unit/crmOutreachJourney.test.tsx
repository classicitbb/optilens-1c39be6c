import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { OutreachWorkspace } from "@/features/admin/crm/OutreachWorkspace";
import { formatOutreachPlan, readOutreachPlan, nextJourneyStep } from "@/features/admin/crm/outreachJourney";

const mocks = vi.hoisted(() => ({
  savePlan: vi.fn(), saveDraft: vi.fn(), createActivity: vi.fn(), classify: vi.fn(),
  plan: null as any, draft: null as any, canEdit: true,
}));
const DRAFT_ID = "00000000-0000-4000-8000-000000000001";
const contact = { id: "contact-1", name: "Test Optical", business_name: null, email: "buyer@example.test", country: "Barbados", city: "Bridgetown", is_customer: false, linked_customer_id: null, parent_id: null, pipeline: null };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("@/contexts/AdminRoleContext", () => ({ useAdminRole: () => ({ canEdit: mocks.canEdit, isAdmin: true }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/features/admin/crm/hooks/useActivities", () => ({
  useCreateActivity: () => ({ mutateAsync: mocks.createActivity }),
  useStaffDirectory: () => ({ data: [{ user_id: "me", name: "Me" }, { user_id: "colleague", name: "A colleague" }] }),
}));
vi.mock("@/features/admin/crm/hooks/useOutreachJourney", () => ({
  useOutreachContacts: () => ({ data: [contact] }), useOutreachQueue: () => ({ data: [] }),
  useOutreachPlan: () => ({ data: mocks.plan }), useJourneyDraft: () => ({ data: mocks.draft }),
  useSaveOutreachPlan: () => ({ mutateAsync: mocks.savePlan }), useSaveJourneyDraft: () => ({ mutateAsync: mocks.saveDraft }),
}));
vi.mock("@/features/admin/crm/hooks/usePipeline", async (original) => ({
  ...await original<typeof import("@/features/admin/crm/hooks/usePipeline")>(), useClassifyContact: () => ({ mutateAsync: mocks.classify }),
}));
vi.mock("@/features/admin/email/useEmail", () => ({ useEmailStatus: () => ({ data: { accounts: [{ code: "test", isEnabled: true, canSend: true }] } }) }));
vi.mock("@/features/admin/email/ContactEmailHistory", () => ({ ContactEmailHistory: () => <p>Conversation history</p> }));
vi.mock("@/features/admin/email/ComposeDialog", () => ({ ComposeDialog: ({ onSent }: any) => <button onClick={() => onSent({ subject: "Final subject", text: "Actual edited email?", to: "buyer@example.test" })}>Simulate confirmed send</button> }));

const renderJourney = (practice = false) => render(<MemoryRouter initialEntries={[`/admin/crm/dashboard?contact=contact-1${practice ? "&practice=1" : ""}`]}><OutreachWorkspace /></MemoryRouter>);
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
beforeEach(() => {
  vi.clearAllMocks(); mocks.canEdit = true;
  mocks.plan = { id: "plan-1", contact_id: contact.id, content: "Ask about their stock lens needs.", owner_id: "me", due_at: "2026-11-12T12:00:00Z", status: "planned", updated_at: "2026-11-06T12:00:00Z" };
  mocks.draft = null;
  mocks.savePlan.mockImplementation(async (input: any) => ({ ...mocks.plan, ...input, id: "plan-1", contact_id: input.contactId }));
  mocks.saveDraft.mockImplementation(async (input: any) => ({ ...input, id: input.id ?? DRAFT_ID, contact_id: input.contactId, channel: "email" }));
  mocks.createActivity.mockResolvedValue("note-1");
  mocks.classify.mockResolvedValue(undefined);
});

describe("outreach journey", () => {
  it("opens without creating a task, draft, sequence or send", () => {
    renderJourney();
    expect(screen.getByLabelText("Subject *")).toBeInTheDocument();
    expect(mocks.savePlan).not.toHaveBeenCalled(); expect(mocks.saveDraft).not.toHaveBeenCalled(); expect(mocks.createActivity).not.toHaveBeenCalled();
  });

  it("requires a real brief, owner and date, and saves delegation on the existing task", async () => {
    renderJourney(); click("Plan outreach");
    fireEvent.change(screen.getByLabelText("Who owns the next step? *"), { target: { value: "colleague" } });
    click("Save plan & write email");
    await waitFor(() => expect(mocks.savePlan).toHaveBeenCalledWith(expect.objectContaining({ id: "plan-1", ownerId: "colleague", content: "Ask about their stock lens needs." })));
  });

  it("blocks approval of unresolved placeholders and missing asks", async () => {
    renderJourney();
    fireEvent.change(screen.getByLabelText("Subject *"), { target: { value: "Hello [name]" } });
    fireEvent.change(screen.getByLabelText("Email message *"), { target: { value: "Our company sells lenses." } });
    click("Approve email");
    await screen.findByText("Resolve the draft quality warnings before approval.");
    expect(mocks.saveDraft).not.toHaveBeenCalled();
  });

  it("saves and approves the exact edited email before exposing the composer", async () => {
    renderJourney();
    expect(screen.queryByRole("button", { name: "Review in company email" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Subject *"), { target: { value: "Stock lens needs" } });
    fireEvent.change(screen.getByLabelText("Email message *"), { target: { value: "Could we discuss the stock lenses you need most?" } });
    click("Approve email");
    await screen.findByRole("button", { name: "Review in company email" });
    expect(mocks.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ subject: "Stock lens needs", body: "Could we discuss the stock lenses you need most?", status: "approved" }));
    expect(mocks.savePlan).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining(`Outreach draft: ${DRAFT_ID}`) }));
    expect(mocks.saveDraft).not.toHaveBeenCalledWith(expect.objectContaining({ status: "sent" }));
  });

  it("opening the company composer does not record a send", async () => {
    mocks.draft = { id: DRAFT_ID, contact_id: contact.id, subject: "Lens discussion", body: "Could we discuss your lens needs?", status: "approved", channel: "email" };
    renderJourney(); click("Review in company email");
    await screen.findByRole("button", { name: "Simulate confirmed send" });
    expect(mocks.saveDraft).not.toHaveBeenCalled();
  });

  it("retains actual sent content and offers recording-only recovery after a database failure", async () => {
    mocks.draft = { id: DRAFT_ID, contact_id: contact.id, subject: "Lens discussion", body: "Could we discuss your lens needs?", status: "approved", channel: "email" };
    mocks.saveDraft.mockRejectedValueOnce(new Error("CRM offline"));
    renderJourney(); click("Review in company email");
    fireEvent.click(await screen.findByRole("button", { name: "Simulate confirmed send" }));
    await screen.findByText("CRM offline");
    expect(screen.queryByRole("button", { name: "Review in company email" })).not.toBeInTheDocument();
    click("Retry CRM recording only");
    await screen.findByText("Waiting for a response");
    expect(mocks.saveDraft).toHaveBeenLastCalledWith(expect.objectContaining({ id: DRAFT_ID, subject: "Final subject", body: "Actual edited email?", status: "sent" }));
    expect(mocks.savePlan).toHaveBeenCalledWith(expect.objectContaining({ status: "waiting" }));
  });

  it("records a reply and schedules the chosen next stage without creating an ERP account", async () => {
    mocks.plan.status = "waiting";
    mocks.draft = { id: DRAFT_ID, contact_id: contact.id, subject: "Lens discussion", body: "Could we discuss your lens needs?", status: "sent", channel: "email" };
    renderJourney(); click("Record reply or decide next action");
    fireEvent.change(screen.getByLabelText("What happened, and what is the next action? *"), { target: { value: "They requested a proposal; prepare a quote for review." } });
    fireEvent.change(screen.getByLabelText("Move this contact to"), { target: { value: "presenting" } });
    click("Save outcome & next action");
    await waitFor(() => expect(mocks.classify).toHaveBeenCalledWith({ id: contact.id, pipeline: "opticals", stage: "presenting" }));
    expect(mocks.createActivity).toHaveBeenCalledWith(expect.objectContaining({ activityType: "Outreach outcome", content: "They requested a proposal; prepare a quote for review." }));
    expect(mocks.savePlan).toHaveBeenLastCalledWith(expect.objectContaining({ status: "in_progress", content: expect.stringContaining("prepare a quote for review") }));
  });

  it("keeps editing actions disabled for a viewer", () => {
    mocks.canEdit = false; renderJourney();
    expect(screen.getByLabelText("Subject *")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Approve email" })).toBeDisabled();
    expect(mocks.saveDraft).not.toHaveBeenCalled();
  });

  it("rehearses sending, a sample reply and an outcome repeatedly without sending or changing a customer", async () => {
    mocks.plan.activity_type = "Outreach practice";
    mocks.draft = { id: DRAFT_ID, contact_id: contact.id, subject: "Practice introduction", body: "Could we discuss your lens needs?", status: "approved", channel: "email", generated_by: "practice" };
    renderJourney(true);
    expect(screen.getByText("Practice mode: nothing will be sent")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review in company email" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open my email app" })).not.toBeInTheDocument();
    click("Practise send & follow-up"); click("Use a sample practice reply");
    click("Save outcome & next action");
    await screen.findByText("Practice complete");
    expect(mocks.saveDraft).not.toHaveBeenCalled(); expect(mocks.savePlan).not.toHaveBeenCalled();
    expect(mocks.createActivity).not.toHaveBeenCalled(); expect(mocks.classify).not.toHaveBeenCalled();
    click("Reset practice"); click("Save plan & write email");
    await screen.findByRole("button", { name: "Practise send & follow-up" });
    expect(mocks.savePlan).toHaveBeenCalledWith(expect.objectContaining({ practice: true }));
    click("Practise send & follow-up");
    expect(screen.getByText("Practice: waiting for a response")).toBeInTheDocument();
    expect(mocks.saveDraft).not.toHaveBeenCalled();
  });
});

describe("journey resumption", () => {
  it("keeps ordinary brief text intact and associates one exact draft", () => {
    const brief = "Goal: talk about lenses.\n\nUse evidence, not assumptions.";
    expect(readOutreachPlan(formatOutreachPlan(brief, DRAFT_ID))).toEqual({ brief, draftId: DRAFT_ID });
    expect(readOutreachPlan(brief)).toEqual({ brief, draftId: null });
  });
  it("resumes from confirmed actions, never from an approved draft alone", () => {
    expect(nextJourneyStep(null)).toBe(1);
    expect(nextJourneyStep({ status: "planned" }, { status: "approved" })).toBe(2);
    expect(nextJourneyStep({ status: "waiting" }, { status: "sent" })).toBe(3);
    expect(nextJourneyStep({ status: "in_progress" }, { status: "sent" })).toBe(4);
    expect(nextJourneyStep({ status: "cancelled" }, { status: "sent" })).toBe(4);
  });
});
