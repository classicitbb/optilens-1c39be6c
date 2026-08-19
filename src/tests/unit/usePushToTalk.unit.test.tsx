import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePushToTalk } from "@/features/admin/copilot/usePushToTalk";

describe("usePushToTalk", () => {
  let gestureActive = false;
  let recognitionStartCount = 0;

  class RecognitionMock {
    continuous = false;
    interimResults = false;
    lang = "";
    grammars?: unknown;
    onresult: ((event: Event) => void) | null = null;
    onerror: ((event: Event & { error?: string }) => void) | null = null;
    onend: (() => void) | null = null;

    start() {
      recognitionStartCount += 1;
      if (!gestureActive) {
        queueMicrotask(() => this.onerror?.(Object.assign(new Event("error"), { error: "not-allowed" })));
      }
    }

    stop() {}
    abort() {}
  }

  beforeEach(() => {
    gestureActive = false;
    recognitionStartCount = 0;

    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: RecognitionMock,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        enumerateDevices: vi.fn().mockResolvedValue([]),
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
      },
    });
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: class {
        createAnalyser() {
          return { fftSize: 0, frequencyBinCount: 1, getByteFrequencyData: vi.fn() };
        }
        createMediaStreamSource() {
          return { connect: vi.fn() };
        }
        close() {
          return Promise.resolve();
        }
      },
    });
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts recognition inside the initiating press instead of losing browser permission activation", async () => {
    const { result } = renderHook(() => usePushToTalk(vi.fn()));

    gestureActive = true;
    let startPromise: Promise<void> | undefined;
    act(() => {
      startPromise = result.current.start();
    });
    gestureActive = false;

    await act(async () => {
      await startPromise;
    });

    await waitFor(() => expect(recognitionStartCount).toBe(1));
    expect(result.current.error).toBeNull();
  });
});
