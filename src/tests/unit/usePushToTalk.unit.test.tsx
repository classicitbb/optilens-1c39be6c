import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePushToTalk } from "@/features/admin/copilot/usePushToTalk";

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));

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

  class MediaRecorderMock {
    state: RecordingState = "inactive";
    mimeType = "audio/webm";
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;

    start() {
      this.state = "recording";
    }

    stop() {
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob([new Uint8Array(2500)], { type: this.mimeType }) });
      this.onstop?.();
    }
  }

  beforeEach(() => {
    gestureActive = false;
    recognitionStartCount = 0;
    mocks.invoke.mockReset();
    mocks.invoke.mockResolvedValue({ data: { transcript: "this is a portal test" }, error: null });

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
          return { fftSize: 0, frequencyBinCount: 1, getByteFrequencyData: (values: Uint8Array) => values.fill(64) };
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
    Object.defineProperty(window, "MediaRecorder", { configurable: true, value: MediaRecorderMock });
    Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: MediaRecorderMock });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts recording without depending on the browser speech-recognition service", async () => {
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

    expect(recognitionStartCount).toBe(0);
    expect(result.current.isListening).toBe(true);
    expect(result.current.error).toBeNull();

    act(() => result.current.stop());
  });

  it("keeps recording until an explicit stop and returns a formatted transcript", async () => {
    class EndingRecognitionMock extends RecognitionMock {
      start() {
        recognitionStartCount += 1;
        queueMicrotask(() => this.onend?.());
      }
    }
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: EndingRecognitionMock,
    });
    const onTranscript = vi.fn();
    const { result } = renderHook(() => usePushToTalk(onTranscript));

    await act(async () => {
      await result.current.start();
      await Promise.resolve();
    });

    expect(result.current.isListening).toBe(true);

    act(() => result.current.stop());

    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("voice-transcribe", expect.any(Object)));
    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith("This is a portal test.", 0.9));
    expect(result.current.isListening).toBe(false);
  });

  it("rejects a vocabulary hint echoed back for a silent recording", async () => {
    mocks.invoke.mockResolvedValue({
      data: { transcript: "Domain terms: Innovations, ERP, Classic Visions, portal access, pricelist, lens." },
      error: null,
    });
    const onTranscript = vi.fn();
    const { result } = renderHook(() => usePushToTalk(onTranscript));

    await act(async () => result.current.start());
    act(() => result.current.stop());

    await waitFor(() => expect(result.current.error).toMatch(/No speech was detected/i));
    expect(onTranscript).not.toHaveBeenCalled();
  });
});
