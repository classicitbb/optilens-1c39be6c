import { useRef } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopyMessageButton } from "@/features/admin/copilot/CopyMessageButton";
import { useAutoGrowTextarea } from "@/features/admin/copilot/useAutoGrowTextarea";

describe("CopyMessageButton", () => {
  it("copies the message text and confirms", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<CopyMessageButton text="Hello Iris" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy message" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument());
    expect(writeText).toHaveBeenCalledWith("Hello Iris");
  });

  it("stays unchanged when the clipboard is blocked", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<CopyMessageButton text="Hello" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy message" }));

    await Promise.resolve();
    expect(screen.getByRole("button", { name: "Copy message" })).toBeInTheDocument();
  });
});

describe("useAutoGrowTextarea", () => {
  const Harness = ({ value }: { value: string }) => {
    const ref = useRef<HTMLTextAreaElement | null>(null);
    useAutoGrowTextarea(ref, value, 4);
    return <textarea ref={ref} aria-label="box" defaultValue={value} style={{ lineHeight: "20px" }} />;
  };

  it("resizes to content on every value change and caps at the max lines", () => {
    const scrollHeight = vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get");
    scrollHeight.mockReturnValue(40);
    const { rerender } = render(<Harness value="one" />);
    const box = screen.getByLabelText("box") as HTMLTextAreaElement;
    expect(box.style.height).toBe("40px");

    scrollHeight.mockReturnValue(400);
    rerender(<Harness value="many lines" />);
    expect(box.style.height).toBe("80px");
    expect(box.style.overflowY).toBe("auto");
    scrollHeight.mockRestore();
  });
});
