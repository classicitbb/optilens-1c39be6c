import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RxStickyLayout } from "@/features/rx-order/form/RxStickyLayout";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Rx form sticky geometry", () => {
  it("keeps the quote below wrapped controls and inside the resized frame, including bottom padding", () => {
    let frameHeight = 800;
    let controlsHeight = 112;
    let resized: () => void = () => undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { resized = callback; }
      observe = observe;
      disconnect = disconnect;
    });
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(() => frameHeight);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ height: controlsHeight } as DOMRect));
    const { container, unmount } = render(
      <div style={{ paddingBottom: 32 }}>
        <RxStickyLayout />
        <div data-rx-sticky-controls>Order toolbar and steps</div>
      </div>,
    );
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.style.getPropertyValue("--rx-quote-top")).toBe("112px");
    expect(frame.style.getPropertyValue("--rx-quote-max-height")).toBe("648px");
    expect(observe).toHaveBeenCalledTimes(2);

    frameHeight = 520;
    controlsHeight = 180;
    act(() => resized());
    expect(frame.style.getPropertyValue("--rx-controls-height")).toBe("180px");
    expect(frame.style.getPropertyValue("--rx-quote-max-height")).toBe("300px");

    frameHeight = 100;
    act(() => resized());
    expect(frame.style.getPropertyValue("--rx-quote-max-height")).toBe("0px");
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
