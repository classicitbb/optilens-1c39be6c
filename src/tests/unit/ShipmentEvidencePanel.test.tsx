import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ShipmentEvidencePanel from "@/pages/admin/costings/ShipmentEvidencePanel";

const mocks = vi.hoisted(() => ({
  documents: [] as Array<{ id: string; original_file_name: string; mime_type: string; storage_path: string }>,
  links: [] as Array<{ id: string; document_id: string; target_key: string }>,
  signedUrl: "https://files.example.test/document.pdf",
  signedError: null as { message: string } | null,
  deletedLinkIds: [] as string[],
  storageRemove: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "editor-1" } }) }));
vi.mock("@/components/pdf/PdfViewer", () => ({
  default: ({ url, title }: { url: string; title: string }) => <div data-testid="pdf-viewer">{title} {url}</div>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      let deleting = false;
      const chain: Record<string, any> = {};
      for (const method of ["select", "order", "in", "limit"]) chain[method] = vi.fn(() => chain);
      chain.delete = vi.fn(() => { deleting = true; return chain; });
      chain.eq = vi.fn((column: string, value: string) => {
        if (deleting && column === "id") {
          mocks.deletedLinkIds.push(value);
          mocks.links = mocks.links.filter((link) => link.id !== value);
        }
        return chain;
      });
      chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve({
        data: table === "shipment_documents" ? mocks.documents : table === "shipment_evidence_links" ? mocks.links : null,
        error: null,
      }).then(resolve, reject);
      return chain;
    },
    storage: {
      from: () => ({
        createSignedUrl: vi.fn(async () => mocks.signedError ? { data: null, error: mocks.signedError } : { data: { signedUrl: mocks.signedUrl }, error: null }),
        remove: mocks.storageRemove,
      }),
    },
  },
}));

const targets = [{ key: "invoice_total_foreign", label: "Supplier invoice", value: "US$ 340.35", category: "invoice" as const }];

describe("ShipmentEvidencePanel", () => {
  beforeEach(() => {
    mocks.documents = [{ id: "doc-1", original_file_name: "INVOICE & AWB.pdf", mime_type: "application/pdf", storage_path: "shipment/doc-1.pdf" }];
    mocks.links = [{ id: "link-1", document_id: "doc-1", target_key: "invoice_total_foreign" }];
    mocks.signedUrl = "https://files.example.test/document.pdf";
    mocks.signedError = null;
    mocks.deletedLinkIds = [];
    mocks.storageRemove.mockClear();
  });

  it("uses the bundled PDF reader for a signed document URL", async () => {
    render(<ShipmentEvidencePanel shipmentId="shipment-1" targets={targets} />);

    fireEvent.click(await screen.findByRole("button", { name: "INVOICE & AWB.pdf" }));
    expect(await screen.findByTestId("pdf-viewer")).toHaveTextContent("INVOICE & AWB.pdf https://files.example.test/document.pdf");
    expect(screen.getByText("PDF reader")).toBeInTheDocument();
  });

  it("minimizes document review without losing the selected source", async () => {
    render(<ShipmentEvidencePanel shipmentId="shipment-1" targets={targets} />);

    fireEvent.click(await screen.findByRole("button", { name: "INVOICE & AWB.pdf" }));
    expect(await screen.findByTestId("pdf-viewer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Minimize document review" }));
    expect(screen.getByText("Selected: INVOICE & AWB.pdf")).toBeInTheDocument();
    expect(screen.queryByTestId("pdf-viewer")).not.toBeInTheDocument();
    expect(screen.queryByText("Reviewed sources")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand document review" }));
    expect(await screen.findByTestId("pdf-viewer")).toHaveTextContent("INVOICE & AWB.pdf");
  });

  it("reports collapse to a parent workbench that owns vertical layout", async () => {
    const onExpandedChange = vi.fn();
    render(<ShipmentEvidencePanel shipmentId="shipment-1" targets={targets} expanded onExpandedChange={onExpandedChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Minimize document review" }));

    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it("unlinks reviewed evidence without deleting its source document", async () => {
    render(<ShipmentEvidencePanel shipmentId="shipment-1" targets={targets} />);

    fireEvent.click(await screen.findByRole("button", { name: "Unlink Supplier invoice" }));

    await waitFor(() => expect(mocks.deletedLinkIds).toEqual(["link-1"]));
    expect(screen.getAllByText("INVOICE & AWB.pdf")).not.toHaveLength(0);
    expect(mocks.storageRemove).not.toHaveBeenCalled();
  });

  it("shows image previews and reports signed-link failures", async () => {
    mocks.documents = [{ id: "doc-1", original_file_name: "invoice.png", mime_type: "image/png", storage_path: "shipment/doc-1.png" }];
    mocks.signedUrl = "https://files.example.test/invoice.png";
    const { rerender } = render(<ShipmentEvidencePanel shipmentId="shipment-1" targets={targets} />);

    fireEvent.click(await screen.findByRole("button", { name: "invoice.png" }));
    expect(await screen.findByAltText("invoice.png")).toHaveAttribute("src", mocks.signedUrl);

    mocks.signedError = { message: "Storage denied" };
    rerender(<ShipmentEvidencePanel key="new-preview" shipmentId="shipment-2" targets={targets} />);
    fireEvent.click(await screen.findByRole("button", { name: "invoice.png" }));
    expect(await screen.findByText("Storage denied")).toBeInTheDocument();
  });
});
