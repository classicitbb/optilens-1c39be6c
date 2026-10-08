import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import type { LeadRecord } from "@/features/admin/leads/types";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  finderData: null as any,
  finderPending: false,
  mutateAsync: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mocks.rpc(...args),
    auth: { getUser: async () => ({ data: { user: { id: "me" } } }) },
    from: () => ({}),
  },
}));

vi.mock("@/features/admin/leads/hooks/useLeadFinder", () => ({
  useLeadFinder: () => ({ data: mocks.finderData, isPending: mocks.finderPending, mutateAsync: mocks.mutateAsync }),
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import LeadFinderPage from "@/pages/admin/leads/LeadFinderPage";
import { useSaveLeadToCrm } from "@/features/admin/leads/hooks/useLeadActions";
import { renderHook } from "@testing-library/react";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

const baseLead = (overrides: Partial<LeadRecord> = {}): LeadRecord => ({
  id: "l1", name: "Vision Plus", country: "Barbados", city: "Bridgetown", website: null,
  instagram_handle: null, facebook_page: null, google_rating: 4.5, google_reviews_count: 10,
  ai_intent_score: 80, status: "lead", score: 80, notes: null, search_run_id: "run-1",
  identity_key: "name:vision plus|bridgetown",
  crm: {
    identityKey: "name:vision plus|bridgetown", normalizedName: "vision plus", status: "none",
    match: null, suggestions: [], isCurrentCustomer: false, customerSource: null,
  },
  ...overrides,
});

const diagnostics = (overrides: Record<string, unknown> = {}) => ({
  pipeline: "brief", brief: "b",
  plan: { interpretation: "i", businessTypes: [], locations: [], searchQueries: [], mustHave: [], exclude: [], aiPlanned: true },
  aiStatus: { plannerUsed: true, qualifierUsed: true, error: null },
  providerStatus: { googlePlacesConfigured: true, firecrawlSearchConfigured: true, aiConfigured: true },
  providersUsed: [], providerTelemetry: {}, candidatesFound: 1, qualifiedCount: 0, rejected: [],
  emptyReason: null, searchRunId: "run-1", fetchedAt: "now",
  excludedCustomerCount: 0, showCurrentCustomers: false, crmLookup: { ok: true, error: null },
  ...overrides,
});

beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.rpc.mockImplementation(async (name: string) => (name === "list_staff_names" ? { data: [], error: null } : { data: null, error: null }));
  mocks.mutateAsync.mockReset();
  mocks.finderPending = false;
  mocks.finderData = null;
});

describe("LeadFinderPage CRM states", () => {
  it("shows a specific empty state and the excluded count when every match is a current customer", () => {
    mocks.finderData = {
      leads: [],
      warning: null,
      diagnostics: diagnostics({ emptyReason: "only_current_customers", excludedCustomerCount: 3 }),
    };
    render(<LeadFinderPage />, { wrapper });
    expect(screen.getByText(/Every match is already a current customer/)).toBeInTheDocument();
    expect(screen.getByText("3 current customers excluded")).toBeInTheDocument();
    expect(screen.getByLabelText("Show current customers")).not.toBeChecked();
  });

  it("re-runs the search including customers when the toggle is turned on", async () => {
    mocks.finderData = { leads: [], warning: null, diagnostics: diagnostics({ emptyReason: "only_current_customers", excludedCustomerCount: 1 }) };
    mocks.mutateAsync.mockResolvedValue(undefined);
    render(<LeadFinderPage />, { wrapper });
    fireEvent.change(screen.getByLabelText("Describe the leads you want"), { target: { value: "opticians in Bridgetown" } });
    fireEvent.click(screen.getByRole("button", { name: /find leads/i }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ brief: "opticians in Bridgetown", showCurrentCustomers: false }));
    fireEvent.click(screen.getByLabelText("Show current customers"));
    await waitFor(() =>
      expect(mocks.mutateAsync).toHaveBeenCalledWith({ brief: "opticians in Bridgetown", showCurrentCustomers: true }),
    );
  });

  it("warns on CRM lookup failure and pauses saving", () => {
    mocks.finderData = {
      leads: [baseLead({ crm: { ...baseLead().crm!, status: "unavailable" } })],
      warning: null,
      diagnostics: diagnostics({ qualifiedCount: 1, crmLookup: { ok: false, error: "boom" } }),
    };
    render(<LeadFinderPage />, { wrapper });
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(/CRM matching failed \(boom\)/);
    expect(screen.getByRole("button", { name: /save to crm/i })).toBeDisabled();
  });

  it("keeps a linked prospect visible and persists the link through the RPC", async () => {
    mocks.finderData = { leads: [baseLead()], warning: null, diagnostics: diagnostics({ qualifiedCount: 1 }) };
    render(<LeadFinderPage />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /mark current customer/i }));
    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith("lead_finder_mark_customer", {
        p_identity: expect.objectContaining({ identity_key: "name:vision plus|bridgetown", display_name: "Vision Plus" }),
      }),
    );
    // Marking is a customer decision; no contact is created and the lead stays on screen for correction.
    expect(await screen.findByRole("button", { name: /unmark customer/i })).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalledWith("lead_finder_save_lead", expect.anything());

    fireEvent.click(screen.getByRole("button", { name: /unmark customer/i }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("lead_finder_clear_link", { p_identity_key: "name:vision plus|bridgetown" }));
    expect(await screen.findByRole("button", { name: /mark current customer/i })).toBeInTheDocument();
  });
});

describe("useSaveLeadToCrm", () => {
  const input = {
    lead: baseLead(),
    connectionStrength: "strong" as const,
    followUp: { needsFollowUp: true, ownerId: "ana", dueDate: "2026-10-20" },
  };

  it("sends one explicit RPC with classification, follow-up and the selected contact", async () => {
    mocks.rpc.mockResolvedValue({ data: { contact_id: "c1", created_contact: false, task_id: "t1", already_saved: false }, error: null });
    const { result } = renderHook(() => useSaveLeadToCrm(), { wrapper });
    await result.current.mutateAsync({ ...input, contactId: "c1" });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    const [name, args] = mocks.rpc.mock.calls[0];
    expect(name).toBe("lead_finder_save_lead");
    expect(args.p_payload).toMatchObject({
      contact_id: "c1",
      connection_strength: "strong",
      needs_follow_up: true,
      follow_up_owner: "ana",
      identity: { identity_key: "name:vision plus|bridgetown" },
    });
    expect(args.p_payload.follow_up_due_at).toMatch(/^2026-10-20T/);
  });

  it("never writes tables directly and omits follow-up fields when off", async () => {
    mocks.rpc.mockResolvedValue({ data: { contact_id: "c2", created_contact: true, task_id: null, already_saved: false }, error: null });
    const { result } = renderHook(() => useSaveLeadToCrm(), { wrapper });
    await result.current.mutateAsync({ ...input, followUp: { needsFollowUp: false, ownerId: "me", dueDate: null } });
    expect(mocks.rpc.mock.calls[0][1].p_payload).toMatchObject({ needs_follow_up: false, follow_up_owner: null, follow_up_due_at: null });
  });

  it("refuses to save while CRM matching is unavailable", async () => {
    const lead = baseLead({ crm: { ...baseLead().crm!, status: "unavailable" } });
    const { result } = renderHook(() => useSaveLeadToCrm(), { wrapper });
    await expect(result.current.mutateAsync({ ...input, lead })).rejects.toThrow(/unavailable/i);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("surfaces a transactional failure without a partial client-side write", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("A CRM contact named \"Vision Plus\" already exists.") });
    const { result } = renderHook(() => useSaveLeadToCrm(), { wrapper });
    await expect(result.current.mutateAsync(input)).rejects.toThrow(/already exists/);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});

// A real Postgres is not available in this environment (no Docker), so the
// transactional guarantees are pinned structurally here and must be exercised
// against a database before release. See the Lead Finder CONTEXT.md.
describe("lead_finder migration contract", () => {
  const sql = readFileSync(
    path.resolve(__dirname, "../../../supabase/migrations/20261007150000_lead_finder_crm_matching.sql"),
    "utf8",
  );

  it("serialises concurrent saves per business and checks the CRM edit role", () => {
    expect(sql).toMatch(/pg_advisory_xact_lock\(hashtext\('lead_finder:'/g);
    expect((sql.match(/has_edit_role\(/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it("allows only one live decision per identity and one review per identity", () => {
    expect(sql).toMatch(/UNIQUE INDEX IF NOT EXISTS lead_discovery_links_active_identity_key[\s\S]*WHERE revoked_at IS NULL/);
    expect(sql).toMatch(/identity_id uuid NOT NULL UNIQUE REFERENCES public\.lead_discovery_identities/);
  });

  it("gives the browser read access only; writes go through the RPCs", () => {
    expect(sql).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.lead_discovery_links FROM anon, authenticated/);
    expect(sql).not.toMatch(/GRANT (INSERT|UPDATE|DELETE)[^;]*lead_discovery/);
  });

  it("does not overwrite populated contact fields or change status on an existing contact", () => {
    const update = sql.slice(sql.indexOf("-- Existing record: fill only blanks"), sql.indexOf("PERFORM public.lead_finder_apply_link(v_identity_id, 'contact', v_contact_id)"));
    expect(update).not.toMatch(/status\s*=/);
    expect(update).toMatch(/CASE WHEN NULLIF\(BTRIM\(c\.website\), ''\) IS NULL/);
  });

  it("makes repeat saves idempotent for opportunity, note and task", () => {
    expect(sql).toMatch(/ON CONFLICT \(contact_id, title\) DO NOTHING/);
    expect(sql).toMatch(/v_note_id := v_review\.note_id/);
    expect(sql).toMatch(/v_task_id := v_review\.task_id/);
  });
});
