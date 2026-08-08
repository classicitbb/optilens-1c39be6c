import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useLocation } from "react-router";
import { Expand, ExternalLink, Loader2, MessageCircle, Search, Send, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import type { AssistantQuickAction } from "@/features/assistant/CompanionAssistantContext";
import { COOKIE_PREFERENCES_EVENT, hasGivenConsent } from "@/lib/cookieConsent";

const MessageQuickActions = ({
  quickActions,
  onAction,
}: {
  quickActions: AssistantQuickAction[];
  onAction: (action: AssistantQuickAction) => void;
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {quickActions.map((action) => (
        <span key={action.label}>
          {action.type === "link" ? (
            action.external ? (
              <a
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/80 px-3 py-1.5 text-xs text-secondary shadow-soft hover:bg-muted"
              >
                {action.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <Link to={action.href} className="inline-flex items-center rounded-full border border-border/50 bg-card/80 px-3 py-1.5 text-xs text-secondary shadow-soft hover:bg-muted">
                {action.label}
              </Link>
            )
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-auto rounded-full border-border/50 bg-card/80 px-3 py-1.5 text-xs font-normal text-secondary shadow-soft hover:bg-muted"
              onClick={() => onAction(action)}
            >
              {action.label}
            </Button>
          )}
        </span>
      ))}
    </div>
  );
};

const AssistantResultCard = ({
  result,
  isEnhancing,
  messageId,
  feedback,
}: {
  result: Extract<ReturnType<typeof useCompanionAssistant>["messages"][number], { kind: "result" }>["result"];
  isEnhancing?: boolean;
  messageId: string;
  feedback?: "helpful" | "not_helpful";
}) => {
  const { markFeedback } = useCompanionAssistant();
  const renderLink = (path: string, title: string, external?: boolean, website?: string) => {
    if (external) {
      return (
        <a href={website || path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-secondary underline underline-offset-2 hover:text-secondary/80">
          {title}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      );
    }

    return (
      <Link to={path} className="text-secondary underline underline-offset-2 hover:text-secondary/80">
        {title}
      </Link>
    );
  };

  return (
    <div className="space-y-3 rounded-[22px] border border-border/50 bg-card/80 p-4 shadow-soft backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="border border-secondary/20 bg-secondary/10 capitalize text-secondary">{result.intent}</Badge>
        <Badge variant="outline" className="border-foreground/20 capitalize text-foreground/60">{result.confidence} confidence{result.errorState ? " · controlled fallback" : ""}</Badge>
        {isEnhancing ? (
          <Badge variant="outline" className="border-amber-400/30 bg-amber-400/10 text-amber-100">
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Refining
          </Badge>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/40">Assistant response</p>
        <div className="rounded-[20px] border border-secondary/15 bg-secondary/5 px-4 py-3">
          <div className="prose prose-sm max-w-none text-foreground leading-relaxed [&_p]:mb-2 [&_ul]:mt-1 [&_li]:my-0.5">
            <ReactMarkdown>{result.answer}</ReactMarkdown>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
        <span className="text-xs text-foreground/50">Was this helpful?</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={feedback === "helpful" ? "secondary" : "ghost"}
            className="h-8 gap-1.5 text-xs"
            aria-label="Helpful answer"
            aria-pressed={feedback === "helpful"}
            onClick={() => markFeedback(messageId, "helpful")}
          >
            <ThumbsUp className="h-3.5 w-3.5" /> Helpful
          </Button>
          <Button
            type="button"
            size="sm"
            variant={feedback === "not_helpful" ? "secondary" : "ghost"}
            className="h-8 gap-1.5 text-xs"
            aria-label="Not helpful answer"
            aria-pressed={feedback === "not_helpful"}
            onClick={() => markFeedback(messageId, "not_helpful")}
          >
            <ThumbsDown className="h-3.5 w-3.5" /> Not helpful
          </Button>
        </div>
      </div>

      {(result.citations ?? result.topLinks).length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/40">Sources</p>
          <ul className="space-y-1.5">
            {(result.citations ?? result.topLinks).map((link, i) => (
              <li key={link.path}>
                {link.external ? (
                  <a href={link.website || link.path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-secondary/80">
                    <span className="text-foreground/40">[{i + 1}]</span>
                    {link.title}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <Link to={link.path} className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-secondary/80">
                    <span className="text-foreground/40">[{i + 1}]</span>
                    {link.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-t border-border/50 pt-3 text-xs leading-5 text-foreground/50">
        Ask a follow-up in plain language for a tighter answer or a different topic.
      </div>
    </div>
  );
};

const AssistantMessageList = () => {
  const { messages, submitQuickAction } = useCompanionAssistant();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const wasNearBottomRef = useRef(true);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const lastMessage = messages[messages.length - 1];
    if (!container || !lastMessage || !wasNearBottomRef.current) return;

    const target = container.querySelector<HTMLElement>(`[data-assistant-message-id="${lastMessage.id}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: lastMessage.role === "assistant" ? "start" : "end" });
  }, [messages]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        onScroll={(event) => {
          const element = event.currentTarget;
          wasNearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 96;
        }}
      >
        <div className="space-y-4 pb-2">
          {messages.map((message, index) => (
            <div
              key={message.id}
              data-assistant-message-id={message.id}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div className={cn("max-w-[88%]", message.role === "user" ? "items-end" : "items-start")}>
                {message.kind === "user" ? (
                  <div className="rounded-[20px] rounded-br-lg bg-primary px-4 py-3 text-sm text-primary-foreground shadow-soft">
                    {message.text}
                  </div>
                ) : null}

                {message.kind === "text" ? (
                  <div className="space-y-2">
                    <div className="rounded-[20px] rounded-bl-lg border border-border/50 bg-card/80 px-4 py-3 text-sm text-foreground shadow-soft backdrop-blur-md">
                      <div className="prose prose-sm max-w-none leading-6 text-foreground [&_p]:mb-1.5 [&_ul]:mt-1 [&_li]:my-0.5">
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      </div>
                      {index > 0 ? <AssistantFeedbackControls messageId={message.id} feedback={message.feedback} /> : null}
                    </div>
                    {message.quickActions?.length ? (
                      <MessageQuickActions quickActions={message.quickActions} onAction={submitQuickAction} />
                    ) : null}
                  </div>
                ) : null}

                {message.kind === "result" ? (
                  <AssistantResultCard
                    result={message.result}
                    isEnhancing={message.isEnhancing}
                    messageId={message.id}
                    feedback={message.feedback}
                  />
                ) : null}

                {message.kind === "confirmation" ? (
                  <div className="space-y-3 rounded-[20px] rounded-bl-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 shadow-soft backdrop-blur-md dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100">
                    <div>
                      <p className="font-semibold">{message.title}</p>
                      <p className="mt-1 leading-6">{message.text}</p>
                    </div>
                    {message.quickActions?.length ? (
                      <MessageQuickActions quickActions={message.quickActions} onAction={submitQuickAction} />
                    ) : null}
                    <AssistantFeedbackControls messageId={message.id} feedback={message.feedback} />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AssistantFeedbackControls = ({ messageId, feedback }: { messageId: string; feedback?: "helpful" | "not_helpful" }) => {
  const { markFeedback } = useCompanionAssistant();
  return (
    <div className="flex items-center justify-end gap-1 border-t border-border/40 pt-2">
      <span className="mr-1 text-[11px] text-foreground/40">Helpful?</span>
      <Button type="button" size="icon" variant={feedback === "helpful" ? "secondary" : "ghost"} className="h-7 w-7" aria-label="Helpful answer" aria-pressed={feedback === "helpful"} onClick={() => markFeedback(messageId, "helpful")}>
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" size="icon" variant={feedback === "not_helpful" ? "secondary" : "ghost"} className="h-7 w-7" aria-label="Not helpful answer" aria-pressed={feedback === "not_helpful"} onClick={() => markFeedback(messageId, "not_helpful")}>
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

const CompanionAssistant = () => {
  const location = useLocation();
  const {
    isOpen,
    isDetachedRoute,
    currentQuery,
    setCurrentQuery,
    openAssistant,
    closeAssistant,
    submitQuery,
    activeAudience,
    saveConversation,
    isSavingConversation,
    nudge,
    dismissNudge,
    isSubmitting,
    openDetachedWindow,
  } = useCompanionAssistant();

  // Track whether the user dismissed the nudge ("Not now") — collapse to icon-only bubble
  const [isCollapsed, setIsCollapsed] = useState(false);
  const handleNudgeDismiss = () => {
    setIsCollapsed(true);
    dismissNudge();
  };

  // Track cookie-consent state so we can hide the launcher while the banner is showing
  const [consentGiven, setConsentGiven] = useState(true);
  useEffect(() => {
    const update = () => setConsentGiven(hasGivenConsent());
    update();
    window.addEventListener(COOKIE_PREFERENCES_EVENT, update);
    return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, update);
  }, []);

  const title = useMemo(
    () => (location.pathname.startsWith("/profile") ? "Search and support assistant" : "Search and help assistant"),
    [location.pathname],
  );

  useEffect(() => {
    const routeKeepsExplicitControls = location.pathname.startsWith("/checkout")
      || location.pathname.startsWith("/auth")
      || location.pathname.startsWith("/legal");
    if (routeKeepsExplicitControls) return;

    const handleCustomerContact = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.dataset.assistantBypass === "true") return;
      const href = target.getAttribute("href") ?? "";
      const isClassicVisionsContact = href === "/contact" || href === "/#contact" || href === "#contact"
        || href === "tel:+12464334928"
        || /^mailto:[^?]+@classicvisions\.net$/i.test(href);
      if (!isClassicVisionsContact) return;

      event.preventDefault();
      const label = target.textContent?.replace(/\s+/g, " ").trim() || "contacting the Classic Visions team";
      const taskContext = {
        kind: /quote/i.test(label) ? "quote" as const : /policy|return|repair|replacement/i.test(location.pathname) ? "policy_help" as const : "contact" as const,
        label,
        sourceRoute: `${location.pathname}${location.search}${location.hash}`,
      };
      openAssistant({ taskContext, profile: location.pathname.startsWith("/profile") ? "portal_support" : "customer_support" });
    };

    document.addEventListener("click", handleCustomerContact);
    return () => document.removeEventListener("click", handleCustomerContact);
  }, [location.hash, location.pathname, location.search, openAssistant]);

  const assistantWindow = (
    <div
      className={cn(
        "flex flex-col overflow-hidden border-2 border-[#c9a227] shadow-elegant backdrop-blur-md",
        "bg-background/80",
        isDetachedRoute
          ? "h-[min(92vh,48rem)] w-[min(100%,28rem)] rounded-[28px]"
          : "h-full rounded-[28px]",
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/50 px-4 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-card/80 text-primary shadow-soft">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-foreground/50">Immediate help first, grounded site context second.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isDetachedRoute ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 text-foreground/60 hover:bg-muted hover:text-foreground"
              onClick={openDetachedWindow}
              aria-label="Pop out assistant"
            >
              <Expand className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0 rounded-full border border-border/50 bg-card/80 text-foreground/70 shadow-soft hover:bg-muted hover:text-foreground"
            onClick={closeAssistant}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/20 px-4 py-2">
        <span className="text-xs text-foreground/60">Answering for: <span className="font-semibold capitalize text-foreground/80">{activeAudience === "visitor" ? "just browsing" : activeAudience}</span></span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-foreground/60 hover:text-foreground"
          onClick={() => void saveConversation()}
          disabled={isSavingConversation}
        >
          {isSavingConversation ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Save this chat
        </Button>
      </div>

      <div className="border-b border-border/50 bg-muted/30 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-foreground/40">
        Search, products, retailers, support
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <AssistantMessageList />
      </div>

      <div className="space-y-3 border-t border-border/50 bg-muted/30 px-4 py-4">
        <div className="rounded-full border border-border/50 bg-card/80 p-1 shadow-soft backdrop-blur-md focus-within:border-ring/60">
          <div className="flex items-center gap-2">
            <Input
              dir="ltr"
              value={currentQuery}
              onChange={(event) => setCurrentQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitQuery();
                }
              }}
              placeholder="Ask anything"
              disabled={isSubmitting}
              className="h-11 border-0 bg-transparent px-4 text-left text-foreground placeholder:text-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="button"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full"
              disabled={!currentQuery.trim() || isSubmitting}
              onClick={() => void submitQuery()}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {!isDetachedRoute && nudge && consentGiven ? (
        <div className="fixed bottom-24 right-4 z-40 max-w-xs rounded-[22px] border border-border/50 bg-background/80 p-4 text-foreground shadow-[0_30px_80px_rgba(2,6,23,0.24)] backdrop-blur-md sm:right-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Need a hand?</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{nudge.message}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted/80 hover:text-foreground" onClick={handleNudgeDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" className="rounded-full" onClick={() => { setIsCollapsed(false); openAssistant({ query: nudge.query, autoSubmit: Boolean(nudge.query) }); }}>
              <Sparkles className="mr-2 h-4 w-4" />
              Open assistant
            </Button>
            <Button size="sm" variant="outline" className="rounded-full border-border/60 bg-background/70 text-foreground backdrop-blur-md hover:bg-muted/80" onClick={handleNudgeDismiss}>
              Not now
            </Button>
          </div>
        </div>
      ) : null}

      {!isDetachedRoute && !isOpen && consentGiven ? (
        isCollapsed ? (
          <Button
            type="button"
            size="icon"
            aria-label="Open search & help assistant"
            onClick={() => { setIsCollapsed(false); openAssistant(); }}
            className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full border border-border/50 bg-background/80 text-foreground shadow-[0_24px_70px_rgba(2,6,23,0.24)] backdrop-blur-md hover:bg-background/90 sm:bottom-6 sm:right-6"
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => openAssistant()}
            className="fixed bottom-4 right-4 z-50 h-14 rounded-full border border-border/50 bg-background/80 text-foreground shadow-[0_24px_70px_rgba(2,6,23,0.24)] backdrop-blur-md hover:bg-background/90 sm:bottom-6 sm:right-6"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Search & help
          </Button>
        )
      ) : null}

      {isOpen ? (
        isDetachedRoute ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(200,145,48,0.10),transparent_35%),linear-gradient(180deg,#eef1f6,#e4e9f1)] p-4 dark:bg-[radial-gradient(circle_at_top,rgba(200,145,48,0.12),transparent_35%),linear-gradient(180deg,#0b1522,#05070d)]">
            {assistantWindow}
          </div>
        ) : (
          <div className="fixed inset-x-3 bottom-20 top-20 z-50 sm:inset-x-auto sm:right-6 sm:top-24 sm:h-[calc(100vh-8.5rem)] sm:w-[28rem]">
            {assistantWindow}
          </div>
        )
      ) : null}
    </>
  );
};

export default CompanionAssistant;
