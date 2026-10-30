import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import HelpTip from "@/help/HelpTip";
import { TOOLTIPS, type TooltipId } from "@/help/tooltips";

describe("HelpTip", () => {
  it("renders a labelled trigger for a registered tip", () => {
    render(
      <TooltipProvider>
        <HelpTip id="hr.payrollRun.approve" />
      </TooltipProvider>,
    );
    const trigger = screen.getByRole("button", { name: "What is this?" });
    expect(trigger.getAttribute("data-help-tip")).toBe("hr.payrollRun.approve");
  });

  it("only accepts registered ids", () => {
    // @ts-expect-error unknown tooltip keys must not compile
    const bad: TooltipId = "hr.not-a-real-tip";
    expect(bad in TOOLTIPS).toBe(false);
  });

  it("keeps every tip short and non-empty", () => {
    for (const [id, text] of Object.entries(TOOLTIPS)) {
      expect(text.trim().length, id).toBeGreaterThan(0);
      expect(text.length, id).toBeLessThanOrEqual(220);
    }
  });
});
