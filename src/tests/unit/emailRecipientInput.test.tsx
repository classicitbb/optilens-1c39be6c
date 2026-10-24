import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { invalidRecipients, joinRecipients, splitRecipients } from "@/features/admin/email/recipients";
import type { ContactSuggestion } from "@/features/admin/email/useEmail";

const contacts: ContactSuggestion[] = [
  { id: "1", name: "Ailyn Campiz", business_name: "Essilor USA", email: "ailyn@example.com", linked_customer_id: 42, contact_tag_links: [{ contact_tags: { name: "Supplier" } }] },
  { id: "2", name: "David Xu", business_name: null, email: "sales@example.com; david@example.com", linked_customer_id: null, contact_tag_links: [] },
];

vi.mock("@/features/admin/email/useEmail", () => ({
  useContactSearch: (term: string) => ({ data: term.trim().length >= 2 ? contacts : [], isFetching: false }),
}));

const { RecipientInput } = await import("@/features/admin/email/RecipientInput");

function Harness({ initial = "", onValue }: { initial?: string; onValue: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return <RecipientInput id="to" label="To" value={value} onChange={(next) => { setValue(next); onValue(next); }} />;
}

async function typeAndWait(input: HTMLElement, text: string) {
  fireEvent.change(input, { target: { value: text } });
  // Search is debounced by 200 ms.
  await new Promise((resolve) => setTimeout(resolve, 250));
}

describe("recipient strings", () => {
  it("splits on comma, semicolon and whitespace, dedupes case-insensitively and joins with '; '", () => {
    expect(splitRecipients("a@x.com, b@y.com;A@X.com  c@z.com")).toEqual(["a@x.com", "b@y.com", "c@z.com"]);
    expect(joinRecipients(["a@x.com", "b@y.com", "A@x.com"])).toBe("a@x.com; b@y.com");
    expect(invalidRecipients("a@x.com; nope")).toEqual(["nope"]);
  });
});

describe("RecipientInput", () => {
  it("picks a CRM contact with the keyboard and shows the name on the chip", async () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByRole("combobox", { name: "To" });
    fireEvent.focus(input);
    await typeAndWait(input, "ai");
    expect(screen.getByRole("option", { name: "Ailyn Campiz, ailyn@example.com" })).toBeInTheDocument();
    expect(screen.getByText("Account #42")).toBeInTheDocument();
    expect(screen.getByText("Supplier")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onValue).toHaveBeenLastCalledWith("ailyn@example.com");
    expect(screen.getByText("Ailyn Campiz")).toBeInTheDocument();
  });

  it("lists every address of a multi-address contact and arrow keys select the second one", async () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByRole("combobox", { name: "To" });
    fireEvent.focus(input);
    await typeAndWait(input, "da");
    // Options: ailyn, sales@, david@ — ArrowUp from the first wraps to the last.
    expect(screen.getAllByRole("option")).toHaveLength(3);
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onValue).toHaveBeenLastCalledWith("david@example.com");
  });

  it("adds a typed external address on separator keys and removes the last chip with Backspace", () => {
    const onValue = vi.fn();
    render(<Harness initial="first@example.com" onValue={onValue} />);
    const input = screen.getByRole("combobox", { name: "To" });
    fireEvent.change(input, { target: { value: "shipping@external.com" } });
    fireEvent.keyDown(input, { key: ";" });
    expect(onValue).toHaveBeenLastCalledWith("first@example.com; shipping@external.com");
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(onValue).toHaveBeenLastCalledWith("first@example.com");
  });

  it("turns a pasted list into chips and flags invalid entries", () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByRole("combobox", { name: "To" });
    fireEvent.change(input, { target: { value: "a@x.com; wrong, b@y.com" } });
    expect(onValue).toHaveBeenLastCalledWith("a@x.com; wrong");
    expect(input).toHaveValue("b@y.com");
    fireEvent.blur(input);
    expect(onValue).toHaveBeenLastCalledWith("a@x.com; wrong; b@y.com");
    expect(screen.getByTitle("wrong is not a valid email address")).toBeInTheDocument();
  });
});
