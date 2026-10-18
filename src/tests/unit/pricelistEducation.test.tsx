import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { PricelistDesignInfo } from "@/components/account/PricelistDesignInfo";
import { designEducation, treatmentEducation } from "@/components/account/pricelistEducation";
import { progressiveProducts } from "@/data/progressiveProducts";
import { photochromicProfiles } from "@/data/photochromicProfiles";

describe("pricelist education", () => {
  it("opens design traits with their public guide and dismisses with Escape", () => {
    render(<MemoryRouter><PricelistDesignInfo categoryKey="progressive_best" name="Progressive - Best" /></MemoryRouter>);
    const trigger = screen.getByRole("button", { name: "About Progressive - Best" });
    fireEvent.click(trigger);
    expect(screen.getByText(/Endless Steady: Fully personalized/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Read the lens guide" });
    expect(link).toHaveAttribute("href", "/lenses/progressive");
    fireEvent.keyDown(link, { key: "Escape" });
    expect(screen.queryByRole("link", { name: "Read the lens guide" })).not.toBeInTheDocument();
  });

  it("shares progressive traits and the polarized blurb with public page content", () => {
    expect(designEducation.progressive_best.summary).toContain(progressiveProducts[0].description);
    expect(designEducation.progressive_better.summary).toContain(progressiveProducts[1].description);
    expect(designEducation.progressive_good.summary).toContain(progressiveProducts[2].description);
    expect(treatmentEducation.transitions_xtractive_polarized.summary).toBe(
      photochromicProfiles.find((profile) => profile.name === "Transitions® XTRActive® Polarized")?.summary,
    );
  });

  it("leaves an unknown design as plain text rather than making up traits", () => {
    render(<MemoryRouter><PricelistDesignInfo categoryKey="unconfigured" name="New design" /></MemoryRouter>);
    expect(screen.getByText("New design")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
