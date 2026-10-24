import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import StoreProductImage from "@/components/StoreProductImage";

vi.mock("@/hooks/useSignedDataFileUrl", () => ({
  extractDataFilePath: (url: string) => url.startsWith("private/") ? url : null,
  useSignedDataFileUrl: () => undefined,
}));
afterEach(cleanup);

describe("store product images", () => {
  it("shows an explicitly generic image when a photo is missing", () => {
    render(<StoreProductImage name="Lens" productType="lens" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/images/store/lenses.svg");
    expect(screen.getByText("Category illustration")).toBeInTheDocument();
  });
  it("recovers from a broken photo and accepts a replacement photo", () => {
    const { rerender } = render(<StoreProductImage name="Cleaner" productType="supply" imageUrl="/broken.jpg" />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("img")).toHaveAttribute("src", "/images/store/supplies.svg");
    rerender(<StoreProductImage name="Cleaner" productType="supply" imageUrl="/new.jpg" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/new.jpg");
    expect(screen.queryByText("Category illustration")).not.toBeInTheDocument();
  });
  it("does not expose an unresolved private path to the image element", () => {
    render(<StoreProductImage name="Coating" productType="addon" imageUrl="private/photo.jpg" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/images/store/services.svg");
  });
});
