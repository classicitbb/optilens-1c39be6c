import { useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "react-router";
import { Bot, Expand, ExternalLink, Loader2, MessageCircle, Search, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import type { AssistantQuickAction } from "@/features/assistant/CompanionAssistantContext";

const AssistantForm = () => {
  const { formState, updateForm, closeForm, submitForm, isSubmitting } = useCompanionAssistant();

  if (!formState) return null;

  const showMarket = formState.kind === "retailer_help";
  const showIssueType = formState.kind === "portal_support" || formState.kind === "customer_support";
  const showProductTopic = formState.kind === "product_help";

  return (
    <div className="space-y-3 rounded-[22px] border border-slate-700/80 bg-slate-900/95 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-50">Request help</p>
          <p className="text-xs leading-5 text-slate-400">
            This stays inside the assistant and includes the current page and conversation context.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="text-slate-300 hover:bg-white/10 hover:text-white" onClick={closeForm}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={formState.name}
          onChange={(event) => updateForm({ name: event.target.value })}
          placeholder="Full name"
          className="border-slate-700/80 bg-slate-950/70 text-slate-50 placeholder:text-slate-500"
        />
        <Input
          value={formState.email}
          onChange={(event) => updateForm({ email: event.target.value })}
          placeholder="Email address"
          type="email"
          className="border-slate-700/80 bg-slate-950/70 text-slate-50 placeholder:text-slate-500"
        />
      </div>

      <Input
        value={formState.phone}
        onChange={(event) => updateForm({ phone: event.target.value })}
        placeholder="Phone (optional)"
        type="tel"
        className="border-slate-700/80 bg-slate-950/70 text-slate-50 placeholder:text-slate-500"
      />

      {showMarket ? (
        <Input
          value={formState.market}
          onChange={(event) => updateForm({ market: event.target.value })}
          placeholder="Island or market"
          className="border-slate-700/80 bg-slate-950/70 text-slate-50 placeholder:text-slate-500"
        />
      ) : null}

      {showIssueType ? (
        <Input
          value={formState.issueType}
          onChange={(event) => updateForm({ issueType: event.target.value })}
          placeholder={formState.kind === "portal_support" ? "Issue type or account concern" : "What do you need help with?"}
          className="border-slate-700/80 bg-slate-950/70 text-slate-50 placeholder:text-slate-500"
        />
      ) : null}

      {showProductTopic ? (
        <Input
          value={formState.productTopic}
          onChange={(event) => updateForm({ productTopic: event.target.value })}
          placeholder="Product or topic"
          className="border-slate-700/80 bg-slate-950/70 text-slate-50 placeholder:text-slate-500"
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
        className="border-slate-700/80 bg-slate-950/70 text-slate-50 placeholder:text-slate-500"
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" className="rounded-full" onClick={() => void submitForm()} disabled={isSubmitting || !formState.name.trim() || !formState.email.trim() || !formState.summary.trim()}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Submit request
        </Button>
        <Button type="button" variant="outline" className="rounded-full border-slate-600/80 bg-slate-950/70 text-slate-100 hover:bg-slate-800" onClick={closeForm}>
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
      <div className="grid gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            size="sm"
            variant="outline"
            className="justify-start rounded-2xl border-slate-600/80 bg-slate-950/65 px-4 py-5 text-left text-slate-100 hover:bg-slate-800"
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
                className="inline-flex items-center gap-1 text-sky-300 underline underline-offset-2 hover:text-sky-200"
              >
                {action.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <Link to={action.href} className="text-sky-300 underline underline-offset-2 hover:text-sky-200">
                {action.label}
              </Link>
            )
          ) : (
            <button
              type="button"
              className="p-0 text-left text-sky-300 underline underline-offset-2 hover:text-sky-200"
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
        <a href={website || path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-300 underline underline-offset-2 hover:text-sky-200">
          {title}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      );
    }

    return (
      <Link to={path} className="text-sky-300 underline underline-offset-2 hover:text-sky-200">
        {title}
      </Link>
    );
  };

  return (
    <div className="space-y-3 rounded-[22px] border border-slate-700/80 bg-slate-900/95 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.42)]">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="border border-sky-400/15 bg-sky-500/10 capitalize text-sky-100">{result.intent}</Badge>
        <Badge variant="outline" className="border-slate-600/80 capitalize text-slate-300">{result.confidence} confidence</Badge>
        {isEnhancing ? (
          <Badge variant="outline" className="border-amber-400/30 bg-amber-400/10 text-amber-100">
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Refining
          </Badge>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Assistant response</p>
        <p className="rounded-[20px] border border-sky-400/15 bg-sky-500/10 px-4 py-3 text-sm leading-6 text-slate-50">
          {result.answer}
        </p>
      </div>

      {result.topLinks.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Website context</p>
          <ul className="space-y-3 rounded-[18px] border border-slate-700/70 bg-slate-950/70 p-3 text-sm">
            {result.topLinks.map((link) => (
              <li key={link.path} className="space-y-1">
                <p className="font-semibold text-slate-50">
                  {renderLink(link.path, link.title, link.external, link.website)}
                </p>
                <p className="text-xs leading-5 text-slate-400">{link.description}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-t border-slate-700/80 pt-3 text-xs leading-5 text-slate-400">
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
    <div className="min-h-0 flex-1">
      <div className="h-full overflow-y-auto px-4 py-4">
        <div className="space-y-4 pb-2">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
            >
              {message.role === "assistant" ? (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-400/20 bg-sky-500/12 text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]">
                  <Bot className="h-4 w-4" />
                </div>
              ) : null}

              <div className={cn("max-w-[88%]", message.role === "user" ? "items-end" : "items-start")}>
                {message.kind === "user" ? (
                  <div className="rounded-[20px] bg-primary px-4 py-3 text-sm text-primary-foreground shadow-[0_18px_40px_rgba(14,165,233,0.18)]">
                    {message.text}
                  </div>
                ) : null}

                {message.kind === "text" ? (
                  <div className="space-y-3 rounded-[20px] border border-slate-700/80 bg-slate-900/90 px-4 py-3 text-sm text-slate-50 shadow-[0_18px_40px_rgba(2,6,23,0.28)]">
                    <p className="leading-6 text-slate-100">{message.text}</p>
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
                  <div className="space-y-3 rounded-[20px] border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50 shadow-[0_18px_40px_rgba(6,95,70,0.2)]">
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

  const title = useMemo(
    () => (location.pathname.startsWith("/profile") ? "Search and support assistant" : "Search and help assistant"),
    [location.pathname],
  );

  const assistantWindow = (
    <div
      className={cn(
        "flex flex-col overflow-hidden border shadow-[0_35px_120px_rgba(2,6,23,0.68)]",
        isDetachedRoute
          ? "h-[min(92vh,48rem)] w-[min(100%,28rem)] rounded-[28px] border-slate-700/80 bg-[#09111d]"
          : "h-full rounded-[28px] border-slate-700/80 bg-[#09111d]",
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-700/90 bg-[linear-gradient(135deg,rgba(20,28,43,0.98),rgba(59,29,74,0.92))] px-4 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/20 bg-sky-500/14 text-sky-100">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-50">{title}</p>
              <p className="text-xs text-slate-300">Immediate help first, grounded site context second.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isDetachedRoute ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 text-slate-200 hover:bg-white/10 hover:text-white"
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
            className="h-9 w-9 shrink-0 text-slate-200 hover:bg-white/10 hover:text-white"
            onClick={closeAssistant}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-b border-slate-800/80 bg-slate-950/70 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-400">
        Search, products, retailers, support
      </div>

      <div className="min-h-0 flex-1 bg-[radial-gradient(circle_at_top,rgba(30,41,59,0.35),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))]">
        <AssistantMessageList />
      </div>

      <div className="space-y-3 border-t border-slate-700/90 bg-slate-950/98 px-4 py-4">
        {formState ? <AssistantForm /> : null}

        <div className="rounded-[22px] border border-slate-700/80 bg-slate-900/95 p-2 shadow-[0_16px_50px_rgba(2,6,23,0.35)]">
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
              placeholder="Ask about lenses, coatings, retailers, or support"
              disabled={isSubmitting}
              className="h-11 border-0 bg-transparent text-slate-50 placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0"
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
      {!isDetachedRoute && nudge ? (
        <div className="fixed bottom-24 right-4 z-40 max-w-xs rounded-[22px] border border-slate-700/80 bg-slate-950/95 p-4 shadow-[0_30px_80px_rgba(2,6,23,0.5)] backdrop-blur sm:right-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-50">Need a hand?</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">{nudge.message}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-slate-300 hover:bg-white/10 hover:text-white" onClick={dismissNudge}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" className="rounded-full" onClick={() => openAssistant({ query: nudge.query, autoSubmit: Boolean(nudge.query) })}>
              <Sparkles className="mr-2 h-4 w-4" />
              Open assistant
            </Button>
            <Button size="sm" variant="outline" className="rounded-full border-slate-600/80 bg-slate-900/70 text-slate-100 hover:bg-slate-800" onClick={dismissNudge}>
              Not now
            </Button>
          </div>
        </div>
      ) : null}

      {!isDetachedRoute && !isOpen ? (
        <Button
          type="button"
          onClick={() => (isOpen ? closeAssistant() : openAssistant())}
          className="fixed bottom-4 right-4 z-50 h-14 rounded-full border border-sky-400/20 bg-slate-950 text-slate-50 shadow-[0_24px_70px_rgba(2,6,23,0.52)] hover:bg-slate-900 sm:bottom-6 sm:right-6"
        >
          {isOpen ? <X className="mr-2 h-5 w-5" /> : <MessageCircle className="mr-2 h-5 w-5" />}
          {isOpen ? "Close" : "Search & help"}
        </Button>
      ) : null}

      {isOpen ? (
        isDetachedRoute ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_30%),linear-gradient(180deg,#020617,#08111f)] p-4">
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
