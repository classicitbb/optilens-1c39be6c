import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-assistant`;

const AdminChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your OptiPricing assistant. Ask me anything about lenses, imports, pricing, or how to use the admin tool.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = { role: "user", content: input.trim() };
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
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok || !response.body) throw new Error("Failed to get response");

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
      console.error("Admin chat error:", error);
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
      {/* Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-colors",
          isOpen ? "bg-[hsl(215_25%_20%)]" : "bg-[hsl(215_65%_50%)]"
        )}
        title="Admin Assistant"
      >
        {isOpen ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <MessageCircle className="h-5 w-5 text-white" />
        )}
      </button>

      {/* Window */}
      {isOpen && (
        <div
          className="fixed bottom-[4.5rem] right-5 z-50 flex h-[440px] w-[340px] flex-col overflow-hidden rounded-xl border shadow-xl"
          style={{
            background: "hsl(215 25% 11%)",
            borderColor: "hsl(215 25% 20%)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5 border-b"
            style={{ borderColor: "hsl(215 25% 20%)", background: "hsl(215 25% 14%)" }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: "hsl(215 65% 50% / 0.2)" }}
            >
              <Bot className="h-4 w-4" style={{ color: "hsl(215 65% 65%)" }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "hsl(0 0% 100%)" }}>
                Admin Assistant
              </h3>
              <p className="text-[11px]" style={{ color: "hsl(210 15% 55%)" }}>
                Powered by AI
              </p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn("flex gap-2.5", message.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    message.role === "user"
                      ? "bg-[hsl(215_65%_50%)]"
                      : "bg-[hsl(215_65%_50%_/_0.15)]"
                  )}
                >
                  {message.role === "user" ? (
                    <User className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" style={{ color: "hsl(215 65% 65%)" }} />
                  )}
                </div>
                <div
                  className="max-w-[75%] rounded-xl px-3 py-2 text-[13px] leading-relaxed"
                  style={{
                    background:
                      message.role === "user" ? "hsl(215 65% 50%)" : "hsl(215 25% 16%)",
                    color:
                      message.role === "user" ? "hsl(0 0% 100%)" : "hsl(210 20% 88%)",
                  }}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2.5">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "hsl(215 65% 50% / 0.15)" }}
                >
                  <Bot className="h-3.5 w-3.5" style={{ color: "hsl(215 65% 65%)" }} />
                </div>
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{ background: "hsl(215 25% 16%)" }}
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "hsl(210 15% 55%)" }} />
                  <span className="text-[13px]" style={{ color: "hsl(210 15% 55%)" }}>
                    Thinking…
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3" style={{ borderColor: "hsl(215 25% 20%)" }}>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the tool…"
                disabled={isLoading}
                className="flex-1 h-8 text-[13px]"
                style={{
                  background: "hsl(215 25% 15%)",
                  borderColor: "hsl(215 25% 22%)",
                  color: "hsl(0 0% 100%)",
                }}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-8 w-8 shrink-0"
                style={{ background: "hsl(215 65% 50%)" }}
              >
                <Send className="h-3.5 w-3.5 text-white" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminChatbot;
