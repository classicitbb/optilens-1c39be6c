import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AliasMappingPage from "@/pages/admin/AliasMappingPage";

// The cloud cannot call the office, so "Sync aliases" must queue a request the
// OptiLens Local agent claims — not pretend to run one. These cover the queue
// write, the pending lock-out, and the recheck that pulls in a completed push.
const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  inserts: [] as any[],
  aliases: [] as any[],
  lastRun: null as any,
  lastRequest: null as any,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin-1" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/hooks/useLenses", () => ({ useLenses: () => ({ data: [] }) }));

vi.mock("@/integrations/supabase/client", () => {
  const chain = (resolve: () => any) => {
    const c: any = {};
    for (const m of ["select", "eq", "order", "limit", "contains", "not"]) c[m] = vi.fn(() => c);
    c.insert = vi.fn((row: any) => { mocks.inserts.push(row); return c; });
    c.upsert = vi.fn(() => c);
    c.maybeSingle = vi.fn(async () => resolve());
    c.then = (ok: any, err: any) => Promise.resolve(resolve()).then(ok, err);
    return c;
  };
  return {
    supabase: {
      from: (table: string) => {
        if (table === "innovations_lens_aliases") return chain(() => ({ data: mocks.aliases, error: null }));
        if (table === "lens_alias_map") return chain(() => ({ data: [], error: null }));
        if (table === "innovations_sync_runs") return chain(() => ({ data: mocks.lastRun, error: null }));
        if (table === "innovations_sync_requests") return chain(() => ({ data: mocks.lastRequest, error: null }));
        return chain(() => ({ data: null, error: null }));
      },
    },
  };
});

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AliasMappingPage />
    </QueryClientProvider>,
  );
};

describe("alias mapping manual sync", () => {
  beforeEach(() => {
    mocks.toast.mockClear();
    mocks.inserts = [];
    mocks.aliases = [];
    mocks.lastRun = null;
    mocks.lastRequest = null;
  });

  it("queues a lens_aliases sync request rather than claiming to run one", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /sync aliases/i }));

    await waitFor(() => expect(mocks.inserts).toHaveLength(1));
    expect(mocks.inserts[0]).toEqual({ entities: ["lens_aliases"], status: "pending" });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Alias sync requested" }),
    ));
  });

  it("locks the button out while a request is still pending with the office", async () => {
    mocks.lastRequest = { id: "req-1", status: "claimed", requested_at: "2026-08-02T10:00:00.000Z", finished_at: null };
    renderPage();

    const button = await screen.findByRole("button", { name: /sync requested/i });
    expect(button).toBeDisabled();
    expect(await screen.findByText(/waiting for the office agent/i)).toBeInTheDocument();
  });

  it("recheck reports what landed once the local push has run", async () => {
    renderPage();
    expect(await screen.findByText(/no aliases synced yet/i)).toBeInTheDocument();

    // The office push lands between the first load and the recheck.
    mocks.aliases = [
      { alias: "1", material_description: "Poly", style_description: "SV", color_description: "Clear", color_code: "01", mf_type: "SV", pricing_key: "k", is_active: true },
      { alias: "2", material_description: "Poly", style_description: "SV", color_description: "Grey", color_code: "02", mf_type: "SV", pricing_key: "k", is_active: true },
    ];
    fireEvent.click(screen.getByRole("button", { name: /recheck/i }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Alias catalog rechecked", description: "2 aliases in the cloud catalog." }),
    ));
    expect(await screen.findByText("2 aliases synced")).toBeInTheDocument();
  });

  it("recheck says so plainly when nothing has landed yet", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /recheck/i }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringMatching(/local push has not landed/i) }),
    ));
  });

  it("shows the last alias push so the operator can tell if a sync is needed", async () => {
    mocks.lastRun = { status: "success", received: 120, upserted: 118, failed: 2, dry_run: false, started_at: "2026-08-02T09:00:00.000Z" };
    renderPage();

    expect(await screen.findByText(/118\/120 upserted/)).toBeInTheDocument();
    expect(screen.getByText(/2 failed/)).toBeInTheDocument();
  });
});
