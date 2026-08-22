import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import AliasMappingPage from "@/pages/admin/AliasMappingPage";

// Covers the two things this screen must never get wrong: the cloud cannot run
// the office sync itself (it queues a request), and no proposal reaches
// lens_alias_map without a deliberate Save.
const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  inserts: [] as any[],
  upserts: [] as any[],
  deletes: 0,
  aliases: [] as any[],
  lenses: [] as any[],
  mappings: [] as any[],
  lastRun: null as any,
  lastRequest: null as any,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin-1" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/hooks/useLenses", () => ({ useLenses: () => ({ data: mocks.lenses }) }));

vi.mock("@/integrations/supabase/client", () => {
  const chain = (resolve: () => any) => {
    const c: any = {};
    for (const m of ["select", "eq", "order", "limit", "contains", "not", "range", "in", "neq", "update"]) c[m] = vi.fn(() => c);
    c.insert = vi.fn((row: any) => { mocks.inserts.push(row); return c; });
    c.upsert = vi.fn((rows: any) => { mocks.upserts.push(rows); return c; });
    c.delete = vi.fn(() => { mocks.deletes++; return c; });
    c.maybeSingle = vi.fn(async () => resolve());
    c.then = (ok: any, err: any) => Promise.resolve(resolve()).then(ok, err);
    return c;
  };
  return {
    supabase: {
      from: (table: string) => {
        if (table === "innovations_lens_aliases") return chain(() => ({ data: mocks.aliases, error: null }));
        if (table === "lens_alias_map") return chain(() => ({ data: mocks.mappings, error: null }));
        if (table === "innovations_sync_runs") return chain(() => ({ data: mocks.lastRun, error: null }));
        if (table === "innovations_sync_requests") return chain(() => ({ data: mocks.lastRequest, error: null }));
        return chain(() => ({ data: null, error: null }));
      },
    },
  };
});

const lens = (id: string, name: string, option: string, lenstype = "Regular") => ({
  id, name, is_active: true, show_on_website: true, sell_price: 100,
  material: { name: "Plastic 1.50" }, mftype: { name: "Single Vision" },
  lenstype: { name: lenstype }, finishtype: { name: "Lab Uncut" },
  lens_lens_options: [{ lens_option_id: `opt-${option}`, lens_option: { name: option } }],
});

const alias = (aliasCode: string, colour: string, styleCode = "02262") => ({
  alias: aliasCode,
  style_code: styleCode,
  style_description: "Regular",
  material_description: "Plastic 1.50",
  color_description: colour,
  color_code: aliasCode.slice(-5),
  mf_type: "Single Vision",
  pricing_key: "Plastic 1.50 | Single Vision | Regular",
});

const renderPage = (route = "/admin/pricing/alias-mapping") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <AliasMappingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("alias mapping manual sync", () => {
  beforeEach(() => {
    mocks.toast.mockClear();
    mocks.inserts = [];
    mocks.upserts = [];
    mocks.deletes = 0;
    mocks.aliases = [];
    mocks.lenses = [];
    mocks.mappings = [];
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

    expect(await screen.findByRole("button", { name: /sync requested/i })).toBeDisabled();
    expect(await screen.findByText(/waiting for the office agent/i)).toBeInTheDocument();
  });

  it("recheck reports what landed once the local push has run", async () => {
    renderPage();
    expect(await screen.findByText(/no aliases synced yet/i)).toBeInTheDocument();

    mocks.aliases = [alias("0000226200000", "UNCoated"), alias("0000226200001", "SRCoated")];
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

describe("alias mapping curation", () => {
  beforeEach(() => {
    mocks.toast.mockClear();
    mocks.inserts = [];
    mocks.upserts = [];
    mocks.deletes = 0;
    mocks.lenses = [];
    mocks.mappings = [];
    mocks.lastRun = null;
    mocks.lastRequest = null;
    // "TGNS" is a header covering three colours; SRCoated is a separate option.
    mocks.aliases = [
      alias("0000226201370", "TGNS Gray"),
      alias("0000226201374", "TGNS Brown"),
      alias("0000226201376", "TGNS Green"),
      alias("0000226200001", "SRCoated"),
    ];
  });

  it("proposes the whole colour family behind a header option", async () => {
    mocks.lenses = [lens("lens-a", "1.50 FIN SV Regular TGNS", "TGNS")];
    renderPage();

    expect(await screen.findByText("Matched (1)")).toBeInTheDocument();
    // Three TGNS colours proposed, SRCoated left out.
    expect(await screen.findByText("3 proposed")).toBeInTheDocument();
  });

  it("does not treat a proposal as a pending change until it is confirmed", async () => {
    mocks.lenses = [lens("lens-a", "1.50 FIN SV Regular TGNS", "TGNS")];
    renderPage();

    // Pre-ticked for review, but Save stays empty — nothing is staged yet.
    expect(await screen.findByText("3 proposed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save \(0\)/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /confirm all matched \(1\)/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /save \(1\)/i })).toBeEnabled());
  });

  it("writes the matched family with the option that produced it", async () => {
    mocks.lenses = [lens("lens-a", "1.50 FIN SV Regular TGNS", "TGNS")];
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /confirm all matched/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /save \(1\)/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /save \(1\)/i }));

    await waitFor(() => expect(mocks.upserts).toHaveLength(1));
    const written = mocks.upserts[0];
    expect(written.map((r: any) => r.innovations_alias).sort())
      .toEqual(["0000226201370", "0000226201374", "0000226201376"]);
    // lens_option_id records WHY each alias was linked.
    expect(written.every((r: any) => r.lens_option_id === "opt-TGNS")).toBe(true);
    expect(written.every((r: any) => r.lens_id === "lens-a" && r.confirmed_at)).toBe(true);
  });

  it("expands a row to show each colour with its code and 13-digit alias", async () => {
    mocks.lenses = [lens("lens-a", "1.50 FIN SV Regular TGNS", "TGNS")];
    renderPage();

    fireEvent.click(await screen.findByText("1.50 FIN SV Regular TGNS"));

    expect(await screen.findByText("TGNS Gray")).toBeInTheDocument();
    expect(screen.getByText("01370 · 0000226201370")).toBeInTheDocument();
    expect(screen.getByText(/is the header for 3 colours/i)).toBeInTheDocument();
  });

  it("splits the expanded row by Innovations sub-design", async () => {
    mocks.aliases = [
      alias("0000226200001", "SRCoated", "02262"),
      alias("0000228500001", "SRCoated", "02285"),
    ];
    mocks.lenses = [lens("lens-a", "1.50 FIN SV Regular SRCoated", "SRCoated")];
    renderPage();

    fireEvent.click(await screen.findByText("1.50 FIN SV Regular SRCoated"));

    expect(await screen.findByText(/style 02262/)).toBeInTheDocument();
    expect(screen.getByText(/style 02285/)).toBeInTheDocument();
    expect(screen.getByText(/across 2 sub-designs/i)).toBeInTheDocument();
  });

  it("flags a confirmed colour that has left the active alias catalogue", async () => {
    // A mapping confirmed against an alias the office no longer sends. The feed
    // is upsert-only, so the row lingers and the order form quietly drops it.
    mocks.lenses = [lens("lens-a", "1.50 FIN SV Regular TGNS", "TGNS")];
    mocks.mappings = [
      { id: "m1", lens_id: "lens-a", innovations_alias: "0000226201370", is_primary: true, confirmed_at: "2026-08-01T00:00:00.000Z" },
      { id: "m2", lens_id: "lens-a", innovations_alias: "0000000000999", is_primary: false, confirmed_at: "2026-08-01T00:00:00.000Z" },
    ];
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /deactivated upstream \(1\)/i }));
    expect(await screen.findByText("1 gone")).toBeInTheDocument();
    expect(screen.getByText(/no longer in the active alias catalogue/i)).toBeInTheDocument();
  });

  it("jumps a deep link from the catalog to the tab holding that lens", async () => {
    mocks.lenses = [
      lens("lens-a", "1.50 FIN SV Regular TGNS", "TGNS"),
      lens("lens-b", "1.50 FIN SV Regular Drivewear", "Drivewear"),
    ];
    renderPage("/admin/pricing/alias-mapping?lens=" + encodeURIComponent("1.50 FIN SV Regular Drivewear"));

    // Lands on "Needs a decision" rather than the default Matched tab.
    expect(await screen.findByText("1.50 FIN SV Regular Drivewear")).toBeInTheDocument();
    expect(screen.queryByText("1.50 FIN SV Regular TGNS")).not.toBeInTheDocument();
  });

  it("separates lenses with no group from those whose option finds no colour", async () => {
    mocks.lenses = [
      lens("lens-a", "1.50 FIN SV Endless", "TGNS", "Endless SV"), // no group at all
      lens("lens-b", "1.50 FIN SV Regular Drivewear", "Drivewear"), // group, no colour
    ];
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /no innovations match \(1\)/i }));
    expect(await screen.findByText("1.50 FIN SV Endless")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /needs a decision \(1\)/i }));
    expect(await screen.findByText("1.50 FIN SV Regular Drivewear")).toBeInTheDocument();
  });
});
