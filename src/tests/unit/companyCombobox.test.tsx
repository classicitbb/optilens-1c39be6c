import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CompanyCombobox } from "@/features/admin/crm/CompanyCombobox";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
const companies = [{ id: "alpha", name: "Alpha Optical" }, { id: "beta", name: "Beta Vision" }];

describe("Parent company search", () => {
  it("filters while typing in the field and Enter chooses the first match", () => {
    const onChange = vi.fn();
    render(<CompanyCombobox companies={companies} value="alpha" onChange={onChange} />);
    const input = screen.getByRole("combobox");
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: "vision" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("beta");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
  it("keeps the saved selection when search has no match or is cancelled", () => {
    const onChange = vi.fn();
    render(<CompanyCombobox companies={companies} value="alpha" onChange={onChange} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: "missing" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("Alpha Optical");
  });
  it("allows keyboard navigation and clearing the company", () => {
    const onChange = vi.fn();
    render(<CompanyCombobox companies={companies} value="alpha" onChange={onChange} />);
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("beta");
    fireEvent.click(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
