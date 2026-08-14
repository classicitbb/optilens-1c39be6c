import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortalCopilotPage from "@/pages/admin/PortalCopilotPage";
import type { CopilotState } from "@/features/admin/copilot/api";

const { loadCopilotState, createCopilotConversation } = vi.hoisted(() => ({
  loadCopilotState: vi.fn(),
  createCopilotConversation: vi.fn(),
}));

vi.mock("@/features/admin/copilot/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/features/admin/copilot/api")>();
  return {
    ...original,
    loadCopilotState,
    createCopilotConversation,
  };
});

vi.mock("@/features/admin/copilot/usePushToTalk", () => ({
  usePushToTalk: () => ({
    activeDeviceLabel: "System default microphone",
    devices: [],
    error: null,
    isListening: false,
    isTranscribing: false,
    level: 0,
    settings: {
      confidenceThreshold: 0.7,
      deviceId: "default",
      language: "en-BB",
      silenceTimeoutMs: 1500,
      vocabulary: "",
    },
    setSettings: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));

const conversationA = { id: "chat-a", title: "First chat", created_by: "admin", created_at: "2026-08-14T00:00:00Z", updated_at: "2026-08-14T00:00:00Z" };
const conversationB = { id: "chat-b", title: "Second chat", created_by: "admin", created_at: "2026-08-14T01:00:00Z", updated_at: "2026-08-14T01:00:00Z" };

const stateFor = (selectedConversationId: string): CopilotState => ({
  conversations: [conversationB, conversationA],
  selectedConversationId,
  messages: [{
    id: `message-${selectedConversationId}`,
    conversation_id: selectedConversationId,
    role: "assistant",
    content: selectedConversationId === "chat-a" ? "First chat answer" : "Second chat answer",
    attachments: [],
    created_at: "2026-08-14T01:00:00Z",
  }],
  runs: [],
  selectedRunId: null,
  actions: [],
  auditEvents: [],
  settings: null,
});

describe("Portal Copilot multi-chat workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadCopilotState.mockImplementation(async (conversationId?: string) => stateFor(conversationId ?? "chat-a"));
    createCopilotConversation.mockResolvedValue({
      ...stateFor("chat-new"),
      conversations: [
        { id: "chat-new", title: "New chat", created_by: "admin", created_at: "2026-08-14T02:00:00Z", updated_at: "2026-08-14T02:00:00Z" },
        conversationB,
        conversationA,
      ],
      messages: [],
    });
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("switches between independent persisted conversations", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><PortalCopilotPage /></QueryClientProvider>);

    expect(await screen.findByText("First chat answer")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Second chat/i }));

    expect(await screen.findByText("Second chat answer")).toBeInTheDocument();
    expect(screen.queryByText("First chat answer")).not.toBeInTheDocument();
    expect(loadCopilotState).toHaveBeenCalledWith("chat-b");
  });

  it("starts a separate blank chat without removing existing chats", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><PortalCopilotPage /></QueryClientProvider>);
    await screen.findByText("First chat answer");

    fireEvent.click(screen.getAllByRole("button", { name: "New chat" })[0]);

    await waitFor(() => expect(createCopilotConversation).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: "What should I take care of?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /First chat/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Second chat/i })).toBeInTheDocument();
  });
});
