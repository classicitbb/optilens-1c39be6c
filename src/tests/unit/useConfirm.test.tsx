import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useConfirm } from "@/hooks/useConfirm";

let result: Promise<boolean> | null = null;

function Harness() {
  const { confirm, confirmDialog } = useConfirm();
  return (
    <>
      {confirmDialog}
      <button onClick={() => { result = confirm({ title: "Delete it?", confirmLabel: "Delete", destructive: true }); }}>ask</button>
    </>
  );
}

describe("useConfirm", () => {
  it("resolves true when the action is clicked", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("ask"));
    expect(await screen.findByText("Delete it?")).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByText("Delete")); });
    await expect(result).resolves.toBe(true);
  });

  it("resolves false when cancelled", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("ask"));
    await screen.findByText("Delete it?");
    await act(async () => { fireEvent.click(screen.getByText("Cancel")); });
    await expect(result).resolves.toBe(false);
  });
});
