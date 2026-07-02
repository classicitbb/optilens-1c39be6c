import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "What lenses do I need?",
  "Find lenses for my frame",
  "Compare lens coatings & upgrades",
  "Shipping, returns & warranty",
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAT_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/lens-assistant` : null;

export const LensChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your Classic Visions assistant. I can help you choose the right lenses and answer any technical questions about our products. What can I help you with today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > 1 && prev[prev.length - 2]?.role === "user") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      if (!CHAT_URL) throw new Error("Chat service is not configured.");

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-glow",
          isOpen ? "bg-muted" : "bg-gradient-accent"
        )}
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Window — frosted glass */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-24 right-6 z-50 flex h-[560px] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] animate-fade-in",
            "border border-white/40 shadow-elegant",
            "bg-gradient-to-b from-white/70 to-white/40 backdrop-blur-2xl backdrop-saturate-150"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold tracking-wide text-foreground">
                Lens Assistant
              </h3>
              <p className="text-[11px] text-foreground/50">AI-powered for faster assistance</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/60 text-foreground/70 shadow-soft transition hover:bg-white/90 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="space-y-3 py-2">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-3xl px-4 py-2.5 text-sm shadow-soft",
                      message.role === "user"
                        ? "rounded-br-lg bg-primary text-primary-foreground"
                        : "rounded-bl-lg border border-white/50 bg-white/70 text-foreground backdrop-blur-sm"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-3xl rounded-bl-lg border border-white/50 bg-white/70 px-4 py-2.5 backdrop-blur-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-foreground/50" />
                    <span className="text-sm text-foreground/60">Just a moment…</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggestion bubbles — only before the visitor's first message */}
          {messages.length === 1 && !isLoading && (
            <div className="flex flex-col items-start gap-2 px-5 pb-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-white/50 bg-white/60 px-4 py-2 text-sm text-foreground/80 shadow-soft transition hover:bg-white/90 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 pb-4 pt-1">
            <div className="flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-2 py-1.5 shadow-soft backdrop-blur-sm focus-within:border-ring/60">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything"
                disabled={isLoading}
                className="flex-1 bg-transparent px-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full bg-gradient-accent text-accent-foreground shadow-soft"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
