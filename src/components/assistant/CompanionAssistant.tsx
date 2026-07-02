import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useLocation } from "react-router";
import { Expand, ExternalLink, Loader2, MessageCircle, Search, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import type { AssistantQuickAction } from "@/features/assistant/CompanionAssistantContext";
import { COOKIE_PREFERENCES_EVENT, hasGivenConsent } from "@/lib/cookieConsent";

const AssistantForm = () => {
  const { formState, updateForm, closeForm, submitForm, isSubmitting } = useCompanionAssistant();

  if (!formState) return null;

  const showMarket = formState.kind === "retailer_help";
  const showIssueType = formState.kind === "portal_support" || formState.kind === "customer_support";
  const showProductTopic = formState.kind === "product_help";

  return (
    <div className="space-y-3 rounded-[22px] border border-white/50 bg-white/70 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Request help</p>
          <p className="text-xs leading-5 text-foreground/50">
            This stays inside the assistant and includes the current page and conversation context.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="text-foreground/60 hover:bg-white/60 hover:text-foreground" onClick={closeForm}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={formState.name}
          onChange={(event) => updateForm({ name: event.target.value })}
          placeholder="Full name"
          className="border-white/50 bg-white/60 text-foreground placeholder:text-foreground/40"
        />
        <Input
          value={formState.email}
          onChange={(event) => updateForm({ email: event.target.value })}
          placeholder="Email address"
          type="email"
          className="border-white/50 bg-white/60 text-foreground placeholder:text-foreground/40"
        />
      </div>

      <Input
        value={formState.phone}
        onChange={(event) => updateForm({ phone: event.target.value })}
        placeholder="Phone (optional)"
        type="tel"
        className="border-white/50 bg-white/60 text-foreground placeholder:text-foreground/40"
      />

      {showMarket ? (
        <Input
          value={formState.market}
          onChange={(event) => updateForm({ market: event.target.value })}
          placeholder="Island or market"
          className="border-white/50 bg-white/60 text-foreground placeholder:text-foreground/40"
        />
      ) : null}

      {showIssueType ? (
        <Input
          value={formState.issueType}
          onChange={(event) => updateForm({ issueType: event.target.value })}
          placeholder={formState.kind === "portal_support" ? "Issue type or account concern" : "What do you need help with?"}
          className="border-white/50 bg-white/60 text-foreground placeholder:text-foreground/40"
        />
      ) : null}

      {showProductTopic ? (
        <Input
          value={formState.productTopic}
          onChange={(event) => updateForm({ productTopic: event.target.value })}
          placeholder="Product or topic"
          className="border-white/50 bg-white/60 text-foreground placeholder:text-foreground/40"
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
        className="border-white/50 bg-white/60 text-foreground placeholder:text-foreground/40"
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" className="rounded-full" onClick={() => void submitForm()} disabled={isSubmitting || !formState.name.trim() || !formState.email.trim() || !formState.summary.trim()}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Submit request
        </Button>
        <Button type="button" variant="outline" className="rounded-full border-white/60 bg-white/60 text-foreground hover:bg-white/90" onClick={closeForm}>
          Keep chatting
        </Button>
      </div>
    </div>
  );
};

const MessageQuickActions = ({
  quickActions,
  isStarter,
  onAction,
}: {
  quickActions: AssistantQuickAction[];
  isStarter: boolean;
  onAction: (action: AssistantQuickAction) => void;
}) => {
  if (isStarter) {
    return (
      <div className="flex flex-col items-start gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            size="sm"
            variant="outline"
            className="h-auto justify-start rounded-full border-white/50 bg-white/60 px-4 py-2 text-left text-sm font-normal text-foreground/80 shadow-soft hover:bg-white/90 hover:text-foreground"
            onClick={() => onAction(action)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1 text-sm leading-6">
      {quickActions.map((action) => (
        <p key={action.label}>
          {action.type === "link" ? (
            action.external ? (
              <a
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-secondary underline underline-offset-2 hover:text-secondary/80"
              >
                {action.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <Link to={action.href} className="text-secondary underline underline-offset-2 hover:text-secondary/80">
                {action.label}
              </Link>
            )
          ) : (
            <button
              type="button"
              className="p-0 text-left text-secondary underline underline-offset-2 hover:text-secondary/80"
              onClick={() => onAction(action)}
            >
              {action.label}
            </button>
          )}
        </p>
      ))}
    </div>
  );
};

const AssistantResultCard = ({
  result,
  isEnhancing,
}: {
  result: Extract<ReturnType<typeof useCompanionAssistant>["messages"][number], { kind: "result" }>["result"];
  isEnhancing?: boolean;
}) => {
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
    <div className="space-y-3 rounded-[22px] border border-white/50 bg-white/70 p-4 shadow-soft backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="border border-secondary/20 bg-secondary/10 capitalize text-secondary">{result.intent}</Badge>
        <Badge variant="outline" className="border-foreground/20 capitalize text-foreground/60">{result.confidence} confidence</Badge>
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

      <div className="border-t border-white/40 pt-3 text-xs leading-5 text-foreground/50">
        Ask a follow-up in plain language for a tighter answer or a different topic.
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4 pb-2">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div className={cn("max-w-[88%]", message.role === "user" ? "items-end" : "items-start")}>
                {message.kind === "user" ? (
                  <div className="rounded-[20px] rounded-br-lg bg-primary px-4 py-3 text-sm text-primary-foreground shadow-soft">
                    {message.text}
                  </div>
                ) : null}

                {message.kind === "text" ? (
                  <div className="space-y-3 rounded-[20px] rounded-bl-lg border border-white/50 bg-white/70 px-4 py-3 text-sm text-foreground shadow-soft backdrop-blur-sm">
                    <div className="prose prose-sm max-w-none leading-6 text-foreground [&_p]:mb-1.5 [&_ul]:mt-1 [&_li]:my-0.5">
                      <ReactMarkdown>{message.text}</ReactMarkdown>
                    </div>
                    {message.quickActions?.length ? (
                      <MessageQuickActions quickActions={message.quickActions} isStarter={index === 0} onAction={submitQuickAction} />
                    ) : null}
                  </div>
                ) : null}

                {message.kind === "result" ? (
                  <AssistantResultCard
                    result={message.result}
                    isEnhancing={message.isEnhancing}
                  />
                ) : null}

                {message.kind === "confirmation" ? (
                  <div className="space-y-3 rounded-[20px] rounded-bl-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 shadow-soft backdrop-blur-sm">
                    <div>
                      <p className="font-semibold">{message.title}</p>
                      <p className="mt-1 leading-6">{message.text}</p>
                    </div>
                    {message.quickActions?.length ? (
                      <MessageQuickActions quickActions={message.quickActions} isStarter={false} onAction={submitQuickAction} />
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
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
    nudge,
    dismissNudge,
    isSubmitting,
    openDetachedWindow,
    formState,
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

  const assistantWindow = (
    <div
      className={cn(
        "flex flex-col overflow-hidden border border-white/40 shadow-elegant backdrop-blur-2xl backdrop-saturate-150",
        "bg-gradient-to-b from-white/80 to-white/60",
        isDetachedRoute
          ? "h-[min(92vh,48rem)] w-[min(100%,28rem)] rounded-[28px]"
          : "h-full rounded-[28px]",
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/40 px-4 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/60 text-primary shadow-soft">
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
              className="h-9 w-9 shrink-0 text-foreground/60 hover:bg-white/60 hover:text-foreground"
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
            className="h-9 w-9 shrink-0 rounded-full border border-white/50 bg-white/60 text-foreground/70 shadow-soft hover:bg-white/90 hover:text-foreground"
            onClick={closeAssistant}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-b border-white/40 bg-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-foreground/40">
        Search, products, retailers, support
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <AssistantMessageList />
      </div>

      <div className="space-y-3 border-t border-white/40 bg-white/20 px-4 py-4">
        {formState ? <AssistantForm /> : null}

        <div className="rounded-full border border-white/50 bg-white/70 p-1 shadow-soft backdrop-blur-sm focus-within:border-ring/60">
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
        <div className="fixed bottom-24 right-4 z-40 max-w-xs rounded-[22px] border border-slate-700/80 bg-slate-950/95 p-4 shadow-[0_30px_80px_rgba(2,6,23,0.5)] backdrop-blur sm:right-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-50">Need a hand?</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">{nudge.message}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-slate-300 hover:bg-white/10 hover:text-white" onClick={handleNudgeDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" className="rounded-full" onClick={() => { setIsCollapsed(false); openAssistant({ query: nudge.query, autoSubmit: Boolean(nudge.query) }); }}>
              <Sparkles className="mr-2 h-4 w-4" />
              Open assistant
            </Button>
            <Button size="sm" variant="outline" className="rounded-full border-slate-600/80 bg-slate-900/70 text-slate-100 hover:bg-slate-800" onClick={handleNudgeDismiss}>
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
            className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full border border-sky-400/20 bg-slate-950 text-slate-50 shadow-[0_24px_70px_rgba(2,6,23,0.52)] hover:bg-slate-900 sm:bottom-6 sm:right-6"
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => openAssistant()}
            className="fixed bottom-4 right-4 z-50 h-14 rounded-full border border-sky-400/20 bg-slate-950 text-slate-50 shadow-[0_24px_70px_rgba(2,6,23,0.52)] hover:bg-slate-900 sm:bottom-6 sm:right-6"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Search & help
          </Button>
        )
      ) : null}

      {isOpen ? (
        isDetachedRoute ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(200,145,48,0.10),transparent_35%),linear-gradient(180deg,#eef1f6,#e4e9f1)] p-4">
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
