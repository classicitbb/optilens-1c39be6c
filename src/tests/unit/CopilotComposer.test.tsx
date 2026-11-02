import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopilotComposer } from "@/features/admin/copilot/CopilotComposer";
import type { usePushToTalk } from "@/features/admin/copilot/usePushToTalk";

const makeSpeech = (overrides: Partial<ReturnType<typeof usePushToTalk>> = {}) => ({
  activeDeviceLabel: "USB microphone",
  devices: [{ deviceId: "usb", label: "Microphone (USB CAMERA)", kind: "audioinput", groupId: "g", toJSON: () => ({}) }] as MediaDeviceInfo[],
  error: null,
  interim: "",
  isListening: false,
  isStarting: false,
  isTranscribing: false,
  level: 0,
  settings: { confidenceThreshold: 0.7, deviceId: "default", language: "en-BB", vocabulary: "" },
  setSettings: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  ...overrides,
}) as ReturnType<typeof usePushToTalk>;

const renderComposer = (speech: ReturnType<typeof usePushToTalk>, holdToRecord = true, value = "") =>
  render(
    <CopilotComposer
      value={value}
      onChange={vi.fn()}
      onSubmit={vi.fn()}
      canSend={Boolean(value)}
      isSending={false}
      placeholder="Ask anything"
      textareaRef={createRef<HTMLTextAreaElement>()}
      attachments={[]}
      maxAttachments={4}
      onAddFiles={vi.fn()}
      onRemoveAttachment={vi.fn()}
      speech={speech}
      holdToRecord={holdToRecord}
      onHoldToRecordChange={vi.fn()}
      switchId="test-hold"
    />,
  );

describe("CopilotComposer", () => {
  it("opens the microphone list on right-click without starting a recording", () => {
    const speech = makeSpeech();
    renderComposer(speech);

    fireEvent.pointerDown(screen.getByRole("button", { name: /Hold to talk/ }), { button: 2 });
    fireEvent.contextMenu(screen.getByRole("button", { name: /Hold to talk/ }));

    expect(speech.start).not.toHaveBeenCalled();
    expect(screen.getByText("Microphone (USB CAMERA)")).toBeInTheDocument();
    expect(screen.getByText("Hold to record")).toBeInTheDocument();
  });

  it("records while the microphone is held and stops on release", () => {
    const speech = makeSpeech();
    renderComposer(speech);
    const mic = screen.getByRole("button", { name: /Hold to talk/ });
    mic.setPointerCapture = vi.fn();

    fireEvent.pointerDown(mic, { button: 0 });
    fireEvent.pointerUp(mic, { button: 0 });

    expect(speech.start).toHaveBeenCalledTimes(1);
    expect(speech.stop).toHaveBeenCalledTimes(1);
  });

  it("shows the live transcript and level meter while recording", () => {
    renderComposer(makeSpeech({ isListening: true, interim: "order two pairs", level: 40 }), false, "hello");

    expect(screen.getByLabelText("Message the Copilot")).toHaveValue("hello\norder two pairs");
    expect(screen.getByLabelText("Message the Copilot")).toHaveAttribute("readonly");
    expect(screen.getByRole("img", { name: "Microphone level" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop recording" })).toBeInTheDocument();
  });

  it("offers the send arrow only when there is something to send", () => {
    const { unmount } = renderComposer(makeSpeech());
    expect(screen.queryByRole("button", { name: "Send message" })).toBeNull();
    unmount();

    renderComposer(makeSpeech(), true, "hi");
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });
});
