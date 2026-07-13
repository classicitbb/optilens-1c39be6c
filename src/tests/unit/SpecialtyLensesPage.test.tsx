import { fireEvent, screen } from "@testing-library/dom";
import { render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import SpecialtyLensesPage from "@/pages/lenses/SpecialtyLensesPage";

vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

describe("SpecialtyLensesPage", () => {
  it("expands one specialty lens at a time and preserves its action context", () => {
    render(<MemoryRouter><SpecialtyLensesPage /></MemoryRouter>);

    const endlessTrigger = screen.getByRole("button", { name: /endless pilot progressive/i });
    const omniLuxTrigger = screen.getByRole("button", { name: /omnilux nal/i });
    expect(endlessTrigger).toHaveAttribute("aria-expanded", "false");
    expect(omniLuxTrigger).toHaveAttribute("aria-expanded", "false");
    expect(endlessTrigger).toHaveAttribute("aria-controls");
    expect(omniLuxTrigger).toHaveAttribute("aria-controls");

    fireEvent.click(endlessTrigger);
    expect(endlessTrigger).toHaveAttribute("aria-expanded", "true");
    const endlessDetails = document.getElementById("endless-pilot-progressive-details");
    expect(endlessDetails).not.toBeNull();
    expect(within(endlessDetails!).getByRole("link", { name: "View My Price" })).toHaveAttribute("href", "/professionals/price-list-request?selectedLens=endless-pilot-progressive");
    expect(within(endlessDetails!).getByRole("link", { name: "Order This Lens" })).toHaveAttribute("href", "/rx-order?selectedLens=endless-pilot-progressive");

    fireEvent.click(omniLuxTrigger);
    expect(endlessTrigger).toHaveAttribute("aria-expanded", "false");
    expect(omniLuxTrigger).toHaveAttribute("aria-expanded", "true");
    const omniLuxDetails = document.getElementById("omnilux-nal-details");
    expect(omniLuxDetails).not.toBeNull();
    expect(within(omniLuxDetails!).getByRole("link", { name: "View My Price" })).toHaveAttribute("href", "/professionals/price-list-request?selectedLens=omnilux-nal");
  });
});
