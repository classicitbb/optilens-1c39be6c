import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import CompanionAssistant from "@/components/assistant/CompanionAssistant";
import {
  CompanionAssistantProvider,
  useRetailerAssistantPrompt,
} from "@/features/assistant/CompanionAssistantContext";

vi.mock("@/hooks/useStoreProducts", () => ({
  getStoreProductRoute: (product: { product_type: string; id: string }) => `/store/product/${product.product_type}/${product.id}`,
  useStoreProducts: () => ({
    data: [
      {
        id: "lens-1",
        name: "ZenVue Brilliance Progressive",
        description: "Premium progressive lens for all-day wear.",
        quantity_label: "pair",
        sell_price: 100,
        sell_price_usd: 50,
        is_vat_taxable: true,
        product_type: "lens",
        category: "Progressive",
        subcategory: "Freeform",
        tags: ["premium", "progressive"],
        image_url: null,
        image_urls: [],
        has_variants: false,
      },
    ],
  }),
}));

vi.mock("@/hooks/useContentArticles", () => ({
  usePublicKnowledge: () => ({
    data: [
      {
        id: "article-1",
        title: "Why Choose Progressive Lenses?",
        content: "Progressive lenses support all-distance vision in a single pair.",
        description: "Patient-friendly progressive lens article.",
        page_slug: "why-choose-progressive-lenses",
        category: "Progressives",
        content_type: "knowledge",
        visibility: "public",
        sort_order: 0,
        is_active: true,
        created_at: "",
        updated_at: "",
        status: "published",
      },
    ],
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
  }),
}));

vi.mock("@/hooks/usePortalIdentity", () => ({
  usePortalIdentity: () => ({
    identity: null,
  }),
}));

vi.mock("@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket", () => ({
  useCreateHelpdeskTicket: () => ({
    mutateAsync: vi.fn(),
  }),
}));

vi.mock("@/features/assistant/assistantGeneration", () => ({
  generateAssistantAnswer: vi.fn(async () => null),
}));

vi.mock("@/lib/cookieConsent", () => ({
  hasGivenConsent: () => true,
  COOKIE_PREFERENCES_EVENT: "cookie-preferences-changed",
}));

const RetailerPromptHarness = () => {
  const openRetailerPrompt = useRetailerAssistantPrompt();

  return (
    <button
      type="button"
      onClick={() => openRetailerPrompt({ marketSlug: "barbados", marketName: "Barbados" })}
    >
      Open retailer prompt
    </button>
  );
};

describe("CompanionAssistant", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders starter actions when opened", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <CompanionAssistantProvider>
          <CompanionAssistant />
        </CompanionAssistantProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /search & help/i }));

    expect(await screen.findByText("Find a retailer")).toBeInTheDocument();
    expect(screen.getByText("Compare lenses")).toBeInTheDocument();
    expect(screen.getByText("Get support")).toBeInTheDocument();
  });

  it("opens with a contextual retailer prompt and returns results", async () => {
    render(
      <MemoryRouter initialEntries={["/find-a-retailer"]}>
        <CompanionAssistantProvider>
          <RetailerPromptHarness />
          <CompanionAssistant />
        </CompanionAssistantProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /open retailer prompt/i }));

    await waitFor(() => {
      expect(screen.getByText(/help me find a retailer in barbados/i)).toBeInTheDocument();
    });

    expect(await screen.findByText(/assistant response/i)).toBeInTheDocument();
  });
});
