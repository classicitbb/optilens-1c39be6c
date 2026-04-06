import { useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "react-router";
import {
  Bot,
  Check,
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";

const AssistantForm = () => {
  const { formState, updateForm, closeForm, submitForm, isSubmitting } = useCompanionAssistant();

  if (!formState) return null;

  const showMarket = formState.kind === "retailer_help";
  const showIssueType = formState.kind === "portal_support" || formState.kind === "customer_support";
  const showProductTopic = formState.kind === "product_help";

  return (
    <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Request help</p>
          <p className="text-xs text-muted-foreground">
            This stays inside the assistant and includes the current page and conversation context.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={formState.name}
          onChange={(event) => updateForm({ name: event.target.value })}
          placeholder="Full name"
        />
        <Input
          value={formState.email}
          onChange={(event) => updateForm({ email: event.target.value })}
          placeholder="Email address"
          type="email"
        />
      </div>

      <Input
        value={formState.phone}
        onChange={(event) => updateForm({ phone: event.target.value })}
        placeholder="Phone (optional)"
        type="tel"
      />

      {showMarket ? (
        <Input
          value={formState.market}
          onChange={(event) => updateForm({ market: event.target.value })}
          placeholder="Island or market"
        />
      ) : null}

      {showIssueType ? (
        <Input
          value={formState.issueType}
          onChange={(event) => updateForm({ issueType: event.target.value })}
          placeholder={formState.kind === "portal_support" ? "Issue type or account concern" : "What do you need help with?"}
        />
      ) : null}

      {showProductTopic ? (
        <Input
          value={formState.productTopic}
          onChange={(event) => updateForm({ productTopic: event.target.value })}
          placeholder="Product or topic"
        />
      ) : null}

      <Textarea
        value={formState.summary}
        onChange={(event) => updateForm({ summary: event.target.value })}
        placeholder={
          formState.kind === "retailer_help"
            ? "Tell us what kind of retailer, clinic, or help you need."
            : formState.kind === "portal_support"
              ? "Describe the issue, account context, and what you already tried."
              : "Tell us what you need help with."
        }
        rows={4}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void submitForm()} disabled={isSubmitting || !formState.name.trim() || !formState.email.trim() || !formState.summary.trim()}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Submit request
        </Button>
        <Button type="button" variant="outline" onClick={closeForm}>
          Keep chatting
        </Button>
      </div>
    </div>
  );
};

const AssistantResultCard = ({
  messageId,
  result,
  feedback,
}: {
  messageId: string;
  result: Extract<ReturnType<typeof useCompanionAssistant>["messages"][number], { kind: "result" }>["result"];
  feedback?: "helpful" | "not_helpful";
}) => {
  const { markFeedback, openForm } = useCompanionAssistant();
  const firstLink = result.topLinks[0];

  return (
    <div className="space-y-3 rounded-2xl bg-muted/50 p-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="capitalize">{result.intent}</Badge>
        <Badge variant="outline" className="capitalize">{result.confidence} confidence</Badge>
      </div>

      {result.topLinks.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Top website results</p>
          {result.topLinks.map((link) => (
            <div key={link.path} className="rounded-xl border bg-background p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{link.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{link.description}</p>
                </div>
                <Badge variant="outline">{link.label}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {link.external ? (
                  <Button size="sm" asChild>
                    <a href={link.website || link.path} target="_blank" rel="noopener noreferrer">
                      Visit website
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <Button size="sm" asChild>
                    <Link to={link.path}>Open page</Link>
                  </Button>
                )}
                {link.phone ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`tel:${link.phone.replace(/[^+\d]/g, "")}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      Call
                    </a>
                  </Button>
                ) : null}
                {link.kind === "retailer" ? (
                  <Button size="sm" variant="outline" onClick={() => openForm("retailer_help")}>
                    Request help
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Answer from Classic Visions website</p>
        <p className="text-sm leading-6 text-foreground">{result.answer}</p>
      </div>

      <div className="space-y-2 border-t pt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Next actions</p>
        <div className="flex flex-wrap gap-2">
          {firstLink ? (
            firstLink.external ? (
              <Button size="sm" variant="outline" asChild>
                <a href={firstLink.website || firstLink.path} target="_blank" rel="noopener noreferrer">
                  Open source page
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" asChild>
                <Link to={firstLink.path}>Open source page</Link>
              </Button>
            )
          ) : null}

          <Button
            size="sm"
            variant={feedback === "helpful" ? "default" : "outline"}
            onClick={() => markFeedback(messageId, "helpful")}
          >
            {feedback === "helpful" ? <Check className="mr-2 h-4 w-4" /> : <ThumbsUp className="mr-2 h-4 w-4" />}
            This was useful
          </Button>

          <Button
            size="sm"
            variant={feedback === "not_helpful" ? "default" : "outline"}
            onClick={() => markFeedback(messageId, "not_helpful")}
          >
            <ThumbsDown className="mr-2 h-4 w-4" />
            This was not helpful
          </Button>

          {result.suggestsHumanHelp ? (
            <>
              <Button size="sm" variant="outline" asChild>
                <a href="tel:+12464334928">
                  <Phone className="mr-2 h-4 w-4" />
                  Call
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href="mailto:russell@classicvisions.net">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </a>
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const AssistantMessageList = () => {
  const { messages, submitQuickAction } = useCompanionAssistant();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  return (
    <ScrollArea className="flex-1 px-4 py-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
          >
            {message.role === "assistant" ? (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
            ) : null}

            <div className={cn("max-w-[88%]", message.role === "user" ? "items-end" : "items-start")}>
              {message.kind === "user" ? (
                <div className="rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm">
                  {message.text}
                </div>
              ) : null}

              {message.kind === "text" ? (
                <div className="space-y-3 rounded-2xl bg-muted px-4 py-3 text-sm text-foreground shadow-sm">
                  <p className="leading-6">{message.text}</p>
                  {message.quickActions?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {message.quickActions.map((action) => (
                        <Button
                          key={`${message.id}-${action.label}`}
                          size="sm"
                          variant="outline"
                          onClick={() => submitQuickAction(action)}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {message.kind === "result" ? (
                <AssistantResultCard messageId={message.id} result={message.result} feedback={message.feedback} />
              ) : null}

              {message.kind === "confirmation" ? (
                <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm">
                  <div>
                    <p className="font-semibold">{message.title}</p>
                    <p className="mt-1 leading-6">{message.text}</p>
                  </div>
                  {message.quickActions?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {message.quickActions.map((action) => (
                        <Button
                          key={`${message.id}-${action.label}`}
                          size="sm"
                          variant="outline"
                          onClick={() => submitQuickAction(action)}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
};

const CompanionAssistant = () => {
  const location = useLocation();
  const {
    isOpen,
    currentQuery,
    setCurrentQuery,
    openAssistant,
    closeAssistant,
    submitQuery,
    nudge,
    dismissNudge,
    isSubmitting,
    formState,
  } = useCompanionAssistant();

  const title = useMemo(
    () => (location.pathname.startsWith("/profile") ? "Search and support assistant" : "Search and help assistant"),
    [location.pathname],
  );

  return (
    <>
      {nudge ? (
        <div className="fixed bottom-24 right-4 z-40 max-w-xs rounded-2xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur sm:right-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Need a hand?</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{nudge.message}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={dismissNudge}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => openAssistant({ query: nudge.query, autoSubmit: Boolean(nudge.query) })}>
              <Sparkles className="mr-2 h-4 w-4" />
              Open assistant
            </Button>
            <Button size="sm" variant="outline" onClick={dismissNudge}>
              Not now
            </Button>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={() => (isOpen ? closeAssistant() : openAssistant())}
        className="fixed bottom-4 right-4 z-50 h-14 rounded-full px-4 shadow-2xl sm:bottom-6 sm:right-6"
      >
        {isOpen ? <X className="mr-2 h-5 w-5" /> : <MessageCircle className="mr-2 h-5 w-5" />}
        {isOpen ? "Close" : "Search & help"}
      </Button>

      {isOpen ? (
        <div className="fixed inset-x-3 bottom-20 z-50 flex max-h-[78vh] flex-col overflow-hidden rounded-[28px] border border-border bg-background shadow-2xl sm:inset-x-auto sm:right-6 sm:w-[28rem]">
          <div className="flex items-start justify-between gap-3 border-b bg-muted/40 px-4 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">Links first, grounded answers second, help paths when needed.</p>
                </div>
              </div>
            </div>
            <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={closeAssistant}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <AssistantMessageList />

          <div className="space-y-3 border-t bg-background px-4 py-4">
            {formState ? <AssistantForm /> : null}

            <div className="flex items-center gap-2">
              <Input
                value={currentQuery}
                onChange={(event) => setCurrentQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitQuery();
                  }
                }}
                placeholder="Ask about retailers, products, support, or the portal"
                disabled={isSubmitting}
                className="h-11"
              />
              <Button type="button" size="icon" className="h-11 w-11 shrink-0" disabled={!currentQuery.trim() || isSubmitting} onClick={() => void submitQuery()}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default CompanionAssistant;
