import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TidySuggestionChip from "@/components/admin/TidySuggestionChip";

const Harness = ({ initial = "", kind }: { initial?: string; kind?: "title" | "sentence" }) => {
  const [value, setValue] = useState(initial);
  return (
    <>
      <textarea aria-label="field" value={value} onChange={(e) => setValue(e.target.value)} />
      <TidySuggestionChip value={value} onApply={setValue} kind={kind} />
    </>
  );
};

const type = (text: string) => fireEvent.change(screen.getByLabelText("field"), { target: { value: text } });
const field = () => (screen.getByLabelText("field") as HTMLTextAreaElement).value;
const pause = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe("TidySuggestionChip", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows nothing until typing has paused, and never edits the field by itself", () => {
    render(<Harness />);
    type("hi ,i dont know");
    pause(2900);
    expect(screen.queryByRole("button")).toBeNull();
    pause(200);
    expect(screen.getByRole("button", { name: /Tidy up/ })).toBeTruthy();
    expect(field()).toBe("hi ,i dont know");
  });

  it("hides at once when the user keeps typing, then re-checks after the next pause", () => {
    render(<Harness />);
    type("hi ,i dont know");
    pause(3100);
    expect(screen.getByRole("button", { name: /Tidy up/ })).toBeTruthy();
    type("hi ,i dont know the");
    expect(screen.queryByRole("button")).toBeNull();
    pause(3100);
    expect(screen.getByRole("button", { name: /Tidy up/ })).toBeTruthy();
  });

  it("shows nothing for text that is already clean", () => {
    render(<Harness />);
    type("Hello Ana, your order has shipped.");
    pause(3100);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("applies the fixes on click and offers an undo that is not offered again", () => {
    render(<Harness />);
    type("hi ,i dont know");
    pause(3100);
    fireEvent.click(screen.getByRole("button", { name: /Tidy up/ }));
    expect(field()).toBe("Hi, I don't know.");

    fireEvent.click(screen.getByRole("button", { name: "Undo tidy" }));
    expect(field()).toBe("hi ,i dont know");
    pause(3100);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("tidies titles without adding a full stop", () => {
    render(<Harness kind="title" />);
    type("cant login");
    pause(3100);
    fireEvent.click(screen.getByRole("button", { name: /Tidy up/ }));
    expect(field()).toBe("Can't login");
  });
});
