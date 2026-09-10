import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TreatmentMatricesAccordion from "@/components/admin/TreatmentMatricesAccordion";

// CustomerPickerModal (Save As New, BS1-05 task 7) calls useQuery directly
// (unlike every other hook in this component, which is mocked below) — it
// needs a real QueryClientProvider in the tree even though its query is
// gated by enabled:false until the modal opens.
const renderAccordion = (props: React.ComponentProps<typeof TreatmentMatricesAccordion>) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TreatmentMatricesAccordion {...props} />
    </QueryClientProvider>
  );
};

const mockUseAdminRole = vi.fn();
const mockToast = vi.fn();
const pricingMocks = vi.hoisted(() => ({
  buildCombos: vi.fn(),
  bulkSetAnchorExclusion: vi.fn(),
  upsertPricingItems: vi.fn(),
  pricedMatrix: vi.fn(),
}));

vi.mock("@/lib/pricing/combos", () => ({
  buildCombos: pricingMocks.buildCombos,
  bulkSetAnchorExclusion: pricingMocks.bulkSetAnchorExclusion,
  lensIdFor: (combo: { provenance: Record<string, { sourceLensId?: string }> }, supplier: string) => combo.provenance[supplier]?.sourceLensId ?? null,
  upsertPricingItems: pricingMocks.upsertPricingItems,
}));

vi.mock("@/lib/pricing/engine", () => ({
  pricedMatrix: pricingMocks.pricedMatrix,
}));

vi.mock("@/contexts/AdminRoleContext", () => ({
  useAdminRole: () => mockUseAdminRole(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/useMatrixAllocations", () => ({
  MATERIAL_COLUMNS: [{ key: "1.50", label: "1.50" }],
  useMatrixAllocations: () => ({
    data: [],
    isLoading: false,
    upsertMutation: { isPending: false, mutateAsync: vi.fn() },
    deleteMutation: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

vi.mock("@/hooks/usePricelistCatalogRows", () => ({
  usePricelistCatalogRows: () => ({ data: [] }),
}));

vi.mock("@/hooks/usePricelistCatalogRowUpsert", () => ({
  usePricelistCatalogRowUpsert: () => ({
    upsertRow: { mutateAsync: vi.fn(), isPending: false },
    deleteRow: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

vi.mock("@/hooks/useLenses", () => ({
  useLenses: () => ({
    data: [],
    isLoading: false,
    refetch: vi.fn(),
    createMutation: { isPending: false, mutateAsync: vi.fn() },
    updateMutation: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

vi.mock("@/hooks/usePriceHierarchy", () => ({
  usePriceHierarchy: () => ({
    lineOverrides: [],
    hasOverride: () => false,
  }),
}));

vi.mock("@/hooks/useRxPricingStructure", () => ({
  useRxPricingStructure: () => ({
    structure: [
      {
        id: 1,
        key: "clear",
        name: "Clear",
        categories: [{ id: 10, key: "single_vision_regular", name: "Single Vision" }],
      },
      {
        id: 2,
        key: "photo",
        name: "Photochromic",
        categories: [{ id: 11, key: "single_vision_regular", name: "Single Vision" }],
      },
    ],
    isLoading: false,
    createGrouping: { isPending: false, mutateAsync: vi.fn() },
    createCategory: { isPending: false, mutateAsync: vi.fn() },
    renameGrouping: { isPending: false, mutateAsync: vi.fn() },
    renameCategory: { isPending: false, mutateAsync: vi.fn() },
    bumpGrouping: { isPending: false, mutate: vi.fn() },
    bumpCategory: { isPending: false, mutate: vi.fn() },
    archiveGrouping: { isPending: false, mutateAsync: vi.fn() },
    archiveCategory: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

vi.mock("@/components/admin/LensFormDialog", () => ({
  default: () => null,
}));

describe("TreatmentMatricesAccordion", () => {
  beforeEach(() => {
    mockToast.mockReset();
    pricingMocks.buildCombos.mockReset();
    pricingMocks.bulkSetAnchorExclusion.mockReset();
    pricingMocks.upsertPricingItems.mockReset();
    pricingMocks.pricedMatrix.mockReset();
    pricingMocks.upsertPricingItems.mockResolvedValue(undefined);
    pricingMocks.bulkSetAnchorExclusion.mockResolvedValue(2);
  });

  it("keeps structure controls collapsed until an admin unlocks them", () => {
    mockUseAdminRole.mockReturnValue({
      isAdmin: true,
    });

    renderAccordion({ versionId: 1, showUSD: false, fxRate: 1 });

    expect(screen.getByRole("button", { name: /unlock structure editing/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add group/i })).not.toBeInTheDocument();
    expect(screen.queryByTitle("Move grouping up")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /unlock structure editing/i }));

    expect(screen.getByRole("button", { name: /lock structure editing/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add group/i })).toBeInTheDocument();
    expect(screen.getAllByTitle("Move grouping up").length).toBeGreaterThan(0);
  });

  it("hides the lock and structure controls for operators", () => {
    mockUseAdminRole.mockReturnValue({
      isAdmin: false,
    });

    renderAccordion({ versionId: 1, showUSD: false, fxRate: 1 });

    expect(screen.queryByRole("button", { name: /unlock structure editing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add group/i })).not.toBeInTheDocument();
    expect(screen.queryByTitle("Move grouping up")).not.toBeInTheDocument();
  });

  it("excludes every matching anchor-supplier row before recomputing", async () => {
    mockUseAdminRole.mockReturnValue({ isAdmin: true });
    const combo = {
      key: "Clear||Single Vision - Regular||1.50",
      provenance: {
        SkyLab: {
          sourceLensId: "sky-cheapest",
          sourceName: "SkyLab clear",
          lensIds: ["sky-cheapest", "sky-next"],
        },
        "TOG Rx Lab": { sourceLensId: "tog", sourceName: "TOG clear", lensIds: ["tog"] },
      },
    };
    pricingMocks.buildCombos.mockResolvedValue({ combos: [combo] });
    pricingMocks.pricedMatrix.mockReturnValue([{
      available: true,
      safe: true,
      key: combo.key,
      treatment: "Clear",
      tier: "Single Vision - Regular",
      material: "1.50",
      preferredSupplier: "TOG Rx Lab",
      anchorSupplier: "SkyLab",
      anchorCost: 55,
      priceUSD: 70,
    }]);

    renderAccordion({ versionId: 1, showUSD: false, fxRate: 1 });
    fireEvent.click(screen.getByRole("button", { name: /auto price/i }));
    await screen.findByRole("button", { name: "Exclude" });
    fireEvent.click(screen.getByRole("button", { name: "Exclude" }));

    await waitFor(() => {
      expect(pricingMocks.bulkSetAnchorExclusion).toHaveBeenCalledWith(
        ["sky-cheapest", "sky-next"],
        true,
        expect.stringContaining("SkyLab anchor")
      );
    });
  });
});
