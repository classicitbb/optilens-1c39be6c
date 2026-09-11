import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, useLocation } from "react-router";
import CompanionAssistant from "@/components/assistant/CompanionAssistant";
import {
  CompanionAssistantProvider,
  useCompanionAssistant,
  useRetailerAssistantPrompt,
} from "@/features/assistant/CompanionAssistantContext";

const assistantMocks = vi.hoisted(() => ({
  createTicket: vi.fn(),
  uploadImages: vi.fn(),
  user: null as null | { id: string; email: string; user_metadata: { full_name: string } },
  identity: null as null | { crmContactId: string; crmCustomerId: string; organizationName: string; customerName: string; portalAccessStatus: string },
}));

vi.mock("@/hooks/useStoreProducts", () => ({
  getStoreProductRoute: (product: { product_type: string; id: string }) => `/store/product/${product.product_type}/${product.id}`,
  useStoreProducts: () => ({
    data: [
      {
        id: "lens-1",
        name: "ZenVue Brilliance Progressive",
        sku: null,
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
    user: assistantMocks.user,
    signUp: vi.fn(),
  }),
}));

vi.mock("@/hooks/usePortalIdentity", () => ({
  usePortalIdentity: () => ({
    identity: assistantMocks.identity,
  }),
}));

vi.mock("@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket", () => ({
  useCreateHelpdeskTicket: () => ({
    mutateAsync: assistantMocks.createTicket,
  }),
}));

vi.mock("@/lib/helpdeskAttachments", () => ({
  uploadHelpdeskImages: assistantMocks.uploadImages,
}));

vi.mock("@/features/assistant/assistantGeneration", () => ({
  generateAssistantAnswer: vi.fn(async () => ({ answer: "AI response from Iris", citations: [] })),
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

const ContactLinkHarness = () => <a href="/#contact">Contact our team</a>;

const InPageAssistantHarness = () => {
  const { openDetachedWindow } = useCompanionAssistant();
  return <button type="button" onClick={openDetachedWindow}>Open in page</button>;
};

const SupportSubmissionHarness = ({ attachmentCount }: { attachmentCount: number }) => {
  const { messages, formState, submitQuery, openForm, submitForm } = useCompanionAssistant();
  const location = useLocation();
  const attachments = Array.from({ length: attachmentCount }, (_, index) => ({
    name: `evidence-${index + 1}.png`,
    previewUrl: `blob:evidence-${index + 1}`,
  }));

  return (
    <div>
      <button type="button" onClick={() => void submitQuery("Shipment arrived damaged", "portal_support", "dispenser", attachments)}>
        Add evidence
      </button>
      <button type="button" onClick={() => openForm("portal_support", {
        kind: "portal_support",
        values: { issueType: "Damaged shipment", summary: "Please review the attached images." },
      })}>
        Prepare request
      </button>
      <button type="button" disabled={!formState} onClick={() => void submitForm()}>
        Submit request
      </button>
      <span data-testid="support-path">{location.pathname}</span>
      <div>{messages.map((message) => "text" in message ? message.text : "").join(" ")}</div>
    </div>
  );
};

describe("CompanionAssistant", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    assistantMocks.createTicket.mockReset();
    assistantMocks.uploadImages.mockReset();
    assistantMocks.user = null;
    assistantMocks.identity = null;
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders starter actions when opened", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <CompanionAssistantProvider>
          <CompanionAssistant />
        </CompanionAssistantProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ask Iris" }));

    expect(await screen.findByText("Find a retailer")).toBeInTheDocument();
    expect(screen.getByText("Find the right lens")).toBeInTheDocument();
    expect(screen.getByText("Get support")).toBeInTheDocument();
  });

  it("opens Iris's disclosed public profile from the assistant portrait", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <CompanionAssistantProvider>
          <CompanionAssistant />
        </CompanionAssistantProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ask Iris" }));
    fireEvent.click(await screen.findByRole("button", { name: "Meet Iris, Classic Visions AI Operations Partner" }));

    expect(screen.getByText("Iris — Classic Visions AI Operations Partner")).toBeInTheDocument();
    expect(screen.getByText("Iris is an AI assistant.", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText(/internal operations workspace is separately authorized/i)).toBeInTheDocument();
  });

  it("keeps compatibility launches in the current page", async () => {
    const popup = vi.spyOn(window, "open");
    render(
      <MemoryRouter initialEntries={["/profile/pricelists"]}>
        <CompanionAssistantProvider>
          <InPageAssistantHarness />
          <CompanionAssistant />
        </CompanionAssistantProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open in page" }));

    expect(await screen.findByPlaceholderText("Ask anything")).toBeInTheDocument();
    expect(popup).not.toHaveBeenCalled();
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

    expect(await screen.findByText("AI response from Iris")).toBeInTheDocument();
    expect(screen.queryByText(/relevant barbados provider match from the website/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Helpful answer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not helpful answer" })).toBeInTheDocument();
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "start" }));
  });

  it("asks an anonymous visitor for audience context with inline choices", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <CompanionAssistantProvider>
          <CompanionAssistant />
        </CompanionAssistantProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ask Iris" }));
    const input = screen.getByPlaceholderText("Ask anything");
    fireEvent.change(input, { target: { value: "Which lens is best for computer use?" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(await screen.findByText(/are you asking as a patient/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I’m a patient" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I’m a dispenser" })).toBeInTheDocument();
  });

  it("starts a new chat with a clean draft and starter actions", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <CompanionAssistantProvider>
          <CompanionAssistant />
        </CompanionAssistantProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ask Iris" }));
    const input = screen.getByPlaceholderText("Ask anything") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Which lens is best for computer use?" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(await screen.findByText(/are you asking as a patient/i)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "A different draft" } });
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));

    expect(input.value).toBe("");
    expect(screen.queryByText(/are you asking as a patient/i)).not.toBeInTheDocument();
    expect(screen.getByText("Find the right lens")).toBeInTheDocument();
  });

  it("turns a public contact route into a contextual assistant interaction", async () => {
    render(
      <MemoryRouter initialEntries={["/lenses/sport"]}>
        <CompanionAssistantProvider>
          <ContactLinkHarness />
          <CompanionAssistant />
        </CompanionAssistantProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Contact our team" }));

    expect(await screen.findByText(/i need help with contact our team/i)).toBeInTheDocument();
  });

  it.each([
    { label: "more than five images", attachmentCount: 6, error: "Add up to five images at a time." },
    { label: "an oversized image", attachmentCount: 1, error: "evidence-1.png is larger than 10 MB." },
    { label: "a storage failure", attachmentCount: 1, error: "Image storage is temporarily unavailable." },
  ])("keeps the single created ticket successful when $label cannot be attached", async ({ attachmentCount, error }) => {
    assistantMocks.user = { id: "user-1", email: "operator@example.test", user_metadata: { full_name: "Optical Operator" } };
    assistantMocks.identity = {
      crmContactId: "contact-1",
      crmCustomerId: "customer-1",
      organizationName: "Example Optical",
      customerName: "Example Optical",
      portalAccessStatus: "active",
    };
    assistantMocks.createTicket.mockResolvedValue("ticket-1");
    assistantMocks.uploadImages.mockRejectedValue(new Error(error));
    vi.stubGlobal("fetch", vi.fn(async () => ({
      blob: async () => new Blob(["image"], { type: "image/png" }),
    })));

    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <CompanionAssistantProvider>
          <SupportSubmissionHarness attachmentCount={attachmentCount} />
        </CompanionAssistantProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add evidence" }));
    await screen.findByText(/shipment arrived damaged/i);
    fireEvent.click(screen.getByRole("button", { name: "Prepare request" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Submit request" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(screen.getByTestId("support-path")).toHaveTextContent("/profile/helpdesk/ticket-1"));
    expect(assistantMocks.createTicket).toHaveBeenCalledTimes(1);
    expect(assistantMocks.uploadImages).toHaveBeenCalledTimes(1);
    expect(screen.getByText(new RegExp(`Your images could not be attached.*${error.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"))).toBeInTheDocument();
  });
});
