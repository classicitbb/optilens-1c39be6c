import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import LeadCrmPanel from "@/features/admin/leads/components/LeadCrmPanel";
import LinkContactDialog from "@/features/admin/leads/components/LinkContactDialog";
const user = {
  click: async (el: Element) => { fireEvent.click(el); },
  selectOptions: async (el: Element, value: string) => { fireEvent.change(el, { target: { value } }); },
  type: async (el: Element, text: string) => { fireEvent.change(el, { target: { value: text } }); },
};

import type { LeadCrmState, LeadRecord } from "@/features/admin/leads/types";

const crmState = (overrides: Partial<LeadCrmState> = {}): LeadCrmState => ({
  identityKey: "name:vision plus|bridgetown",
  normalizedName: "vision plus",
  status: "none",
  match: null,
  suggestions: [],
  isCurrentCustomer: false,
  customerSource: null,
  ...overrides,
});

const lead = (crm: LeadCrmState): LeadRecord => ({
  id: "lead-1",
  name: "Vision Plus",
  country: "Barbados",
  city: "Bridgetown",
  website: null,
  instagram_handle: null,
  facebook_page: null,
  google_rating: null,
  google_reviews_count: null,
  ai_intent_score: 80,
  status: "lead",
  score: 80,
  notes: null,
  identity_key: crm.identityKey,
  crm,
});

const staff = [
  { user_id: "me", name: "Russell" },
  { user_id: "ana", name: "Ana" },
];

const renderPanel = (crm: LeadCrmState, props: Partial<React.ComponentProps<typeof LeadCrmPanel>> = {}) => {
  const handlers = {
    onLinkContact: vi.fn(),
    onMarkCustomer: vi.fn(),
    onClearLink: vi.fn(),
    onSave: vi.fn(),
  };
  render(
    <LeadCrmPanel
      lead={lead(crm)}
      staff={staff}
      currentUserId="me"
      busy={false}
      saved={null}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

describe("LeadCrmPanel", () => {
  it("starts Unclassified with follow-up off, and saves that default", async () => {
    const { onSave } = renderPanel(crmState());
    expect(screen.getByLabelText("Connection strength")).toHaveValue("unclassified");
    expect(screen.getByLabelText("Needs follow-up")).not.toBeChecked();
    expect(screen.queryByLabelText("Owner")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save to crm/i }));
    expect(onSave).toHaveBeenCalledWith({
      contactId: null,
      connectionStrength: "unclassified",
      followUp: { needsFollowUp: false, ownerId: "me", dueDate: null },
    });
  });

  it("captures classification, owner defaulting to me, and a due date", async () => {
    const { onSave } = renderPanel(crmState());
    await user.selectOptions(screen.getByLabelText("Connection strength"), "strong");
    await user.click(screen.getByLabelText("Needs follow-up"));
    expect(screen.getByLabelText("Owner")).toHaveValue("me");
    await user.type(screen.getByLabelText("Due"), "2026-10-20");
    await user.click(screen.getByRole("button", { name: /save to crm/i }));
    expect(onSave).toHaveBeenCalledWith({
      contactId: null,
      connectionStrength: "strong",
      followUp: { needsFollowUp: true, ownerId: "me", dueDate: "2026-10-20" },
    });
  });

  it("saves to the matched contact and shows the match reason", async () => {
    const { onSave } = renderPanel(crmState({
      status: "matched",
      match: {
        contactId: "c1", contactName: "Vision Plus Ltd", businessName: null, isCustomer: false,
        basis: "name_location", confirmed: false, reason: "Same business name in the same city.",
      },
    }));
    expect(screen.getByText(/Vision Plus Ltd/)).toBeInTheDocument();
    expect(screen.getByText(/Same business name in the same city/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /save to contact/i }));
    expect(onSave.mock.calls[0][0].contactId).toBe("c1");
  });

  it("offers suggestions as a review, linking only on click", async () => {
    const { onLinkContact } = renderPanel(crmState({
      status: "suggested",
      suggestions: [{ contactId: "c9", contactName: "VP Optical", businessName: null, isCustomer: false, reason: "Similar business name." }],
    }));
    expect(onLinkContact).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Link" }));
    expect(onLinkContact).toHaveBeenCalledWith(expect.objectContaining({ id: "c9" }));
  });

  it("lets a manual customer marking be corrected", async () => {
    const { onClearLink } = renderPanel(crmState({ status: "customer_marked", isCurrentCustomer: true, customerSource: "manual_mark" }));
    expect(screen.getByText(/Current customer/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark current customer/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /unmark customer/i }));
    expect(onClearLink).toHaveBeenCalled();
  });

  it("lets a confirmed link be removed", async () => {
    const { onClearLink } = renderPanel(crmState({
      status: "matched",
      match: { contactId: "c1", contactName: "X", businessName: null, isCustomer: false, basis: "confirmed_link", confirmed: true, reason: "r" },
    }));
    await user.click(screen.getByRole("button", { name: /unlink contact/i }));
    expect(onClearLink).toHaveBeenCalled();
  });

  it("blocks saving, linking and marking while CRM matching is unavailable", () => {
    renderPanel(crmState({ status: "unavailable" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/can.t be saved/i);
    expect(screen.getByRole("button", { name: /save to crm/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /link existing contact/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /mark current customer/i })).toBeDisabled();
  });

  it("disables actions and shows progress while busy, and confirms a finished save", () => {
    renderPanel(crmState(), { busy: true });
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
  });

  it("announces the saved result including the follow-up task", () => {
    renderPanel(crmState(), { saved: { createdContact: true, taskCreated: true } });
    expect(screen.getByRole("status")).toHaveTextContent("Saved — new contact created with follow-up task.");
  });
});

describe("LinkContactDialog", () => {
  const rows = [
    { id: "c1", name: "Vision Plus Ltd", business_name: "VP Opticians", city: "Bridgetown", is_customer: false, linked_customer_id: null },
    { id: "c2", name: "Optical Hub", business_name: null, city: null, is_customer: true, linked_customer_id: null },
  ];
  beforeEach(() => vi.useRealTimers());

  it("selects a differently named contact entirely from the keyboard", async () => {
    const search = vi.fn().mockResolvedValue(rows);
    const onSelect = vi.fn();
    render(<LinkContactDialog open leadName="VP Eyes" onOpenChange={() => {}} onSelect={onSelect} search={search} />);

    const input = screen.getByRole("combobox", { name: /search contacts/i });
    await user.type(input, "vision");
    const list = await screen.findByRole("listbox", { name: /matching contacts/i });
    await waitFor(() => expect(within(list).getAllByRole("option")).toHaveLength(2));
    expect(search).toHaveBeenLastCalledWith("vision");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(within(list).getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(rows[1]);
  });

  it("shows loading then an empty message", async () => {
    render(<LinkContactDialog open leadName="X" onOpenChange={() => {}} onSelect={() => {}} search={() => Promise.resolve([])} />);
    await user.type(screen.getByRole("combobox"), "zz");
    expect(await screen.findByText("No contacts found.")).toBeInTheDocument();
  });

  it("surfaces a search failure", async () => {
    render(<LinkContactDialog open leadName="X" onOpenChange={() => {}} onSelect={() => {}} search={() => Promise.reject(new Error("down"))} />);
    await user.type(screen.getByRole("combobox"), "zz");
    expect(await screen.findByText(/contact search failed/i)).toBeInTheDocument();
  });
});
