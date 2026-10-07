import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import ContactPickerSelect from "@/components/admin/ContactPickerSelect";

const contacts = [
  { id: "c1", name: "20/20 Optical", is_company: true, parent_id: null, business_name: null, email: null, phone: null },
  { id: "p1", name: "Ana Smith", is_company: false, parent_id: "c1", business_name: "20/20 Optical", email: null, phone: null },
];

const mocks = vi.hoisted(() => ({ filters: [] as string[] }));

vi.mock("@/integrations/supabase/client", () => {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    or: (filter: string) => { mocks.filters.push(filter); return builder; },
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (value: unknown) => unknown) => resolve({ data: contacts, error: null }),
  };
  return { supabase: { from: () => builder } };
});

const setup = () => {
  const onValueChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ContactPickerSelect value="" onValueChange={onValueChange} placeholder="Contact" />
    </QueryClientProvider>,
  );
  const field = screen.getByRole("combobox") as HTMLInputElement;
  return { onValueChange, field };
};

const clickInto = (field: HTMLInputElement) => {
  act(() => field.focus());
  fireEvent.click(field);
};

describe("ContactPickerSelect", () => {
  it("opens when the field is clicked and lets you type into that same field", async () => {
    const { field } = setup();

    clickInto(field);
    expect(await screen.findByText("No contact")).toBeTruthy();
    // Focus stays in the field, so typing needs no second click.
    expect(document.activeElement).toBe(field);

    fireEvent.change(field, { target: { value: "20/20" } });
    expect(field.value).toBe("20/20");
    await waitFor(() => expect(mocks.filters.some((filter) => filter.includes("20/20"))).toBe(true));
  });

  it("picks the top result with Enter after typing, and the arrowed result after arrow keys", async () => {
    const { field, onValueChange } = setup();

    clickInto(field);
    await screen.findByText("Ana Smith", { exact: false });
    fireEvent.change(field, { target: { value: "20" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onValueChange).toHaveBeenLastCalledWith("c1");

    clickInto(field);
    await screen.findByText("Ana Smith", { exact: false });
    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onValueChange).toHaveBeenLastCalledWith("p1");
  });

  it("closes on Escape", async () => {
    const { field } = setup();

    clickInto(field);
    await screen.findByText("No contact");
    fireEvent.keyDown(field, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("No contact")).toBeNull());
  });
});
