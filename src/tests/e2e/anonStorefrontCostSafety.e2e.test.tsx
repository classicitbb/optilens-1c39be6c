import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Store from "@/pages/Store";

const anonymousProduct = {
  id: "lens-safe-1",
  name: "Safe Storefront Lens",
  description: "Public product description",
  quantity_label: "pair",
  sell_price: 40,
  sell_price_usd: 20,
  is_vat_taxable: false,
  product_type: "lens" as const,
  category: "Lens",
  subcategory: "",
  tags: [],
  image_url: null,
  image_urls: [],
  has_variants: false,
  // This models an accidental backend regression. The public component must
  // never render unapproved cost-shaped fields even if they reach its input.
  base_price: 7.25,
  cost: 9.5,
};

vi.mock("@/components/Header", () => ({ default: () => <header>Header</header> }));
vi.mock("@/components/Footer", () => ({ default: () => <footer>Footer</footer> }));
vi.mock("@/components/LensChatbot", () => ({ LensChatbot: () => null }));
vi.mock("@/components/StorageImage", () => ({ default: () => null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/contexts/CartContext", () => ({ useCartContext: () => ({ addToCart: vi.fn() }) }));
vi.mock("@/hooks/useStoreProducts", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useStoreProducts")>("@/hooks/useStoreProducts");
  return {
    ...actual,
    useStoreProducts: () => ({ data: [anonymousProduct], isLoading: false }),
  };
});

describe("anonymous storefront cost safety (e2e)", () => {
  it("renders the public price without rendering cost fields", () => {
    render(
      <MemoryRouter initialEntries={["/store"]}>
        <Store />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Safe Storefront Lens" })).toBeInTheDocument();
    expect(screen.getByText("$20.00")).toBeInTheDocument();
    expect(screen.queryByText(/base price|\bcost\b/i)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("7.25");
    expect(document.body).not.toHaveTextContent("9.5");
  });
});
