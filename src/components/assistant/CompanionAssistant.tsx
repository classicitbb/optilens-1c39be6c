import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useLocation } from "react-router";
import { Expand, ExternalLink, Eye, EyeOff, Loader2, MessageCircle, MessageSquarePlus, Mic, MicOff, Save, Search, Send, Sparkles, ThumbsDown, ThumbsUp, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_OPTIONS } from "@/lib/locationOptions";
import { cn } from "@/lib/utils";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import type { AssistantQuickAction } from "@/features/assistant/CompanionAssistantContext";
import { COOKIE_PREFERENCES_EVENT, hasGivenConsent } from "@/lib/cookieConsent";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";

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
              className="h-auto rounded-full border-border/50 bg-card/80 px-3 py-1.5 text-xs font-normal text-secondary shadow-soft hover:bg-muted hover:text-secondary"
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
  onSpeak,
}: {
  result: Extract<ReturnType<typeof useCompanionAssistant>["messages"][number], { kind: "result" }>["result"];
  isEnhancing?: boolean;
  messageId: string;
  feedback?: "helpful" | "not_helpful";
  onSpeak?: (text: string) => void;
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

  const sources = result.citations ?? result.topLinks;
  const isLocalSampleMode = import.meta.env.DEV;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant="secondary" className="h-5 border border-secondary/20 bg-secondary/10 px-1.5 py-0 text-[10px] capitalize leading-5 text-secondary">{result.intent}</Badge>
        {isLocalSampleMode ? (
          <Badge variant="outline" className="h-5 border-foreground/20 px-1.5 py-0 text-[10px] capitalize leading-5 text-foreground/60">{result.confidence} confidence{result.errorState ? " · controlled fallback (sample)" : ""}</Badge>
        ) : (
          <Badge variant="outline" className="h-5 border-foreground/20 px-1.5 py-0 text-[10px] leading-5 text-foreground/60">AI-generated response</Badge>
        )}
        {isEnhancing ? (
          <Badge variant="outline" className="h-5 border-amber-400/30 bg-amber-400/10 px-1.5 py-0 text-[10px] leading-5 text-amber-100">
            <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />
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
      {sources.length > 0 ? (
        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 pt-1">
          {sources.map((link, i) => (
            link.external ? (
              <a key={link.path} href={link.website || link.path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[11px] text-secondary hover:text-secondary/80">
                <span className="text-foreground/40">[{i + 1}]</span>
                {link.title}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ) : (
              <Link key={link.path} to={link.path} className="inline-flex items-center gap-0.5 text-[11px] text-secondary hover:text-secondary/80">
                <span className="text-foreground/40">[{i + 1}]</span>
                {link.title}
              </Link>
            )
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-1 border-t border-border/40 pt-2">
        {onSpeak ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-foreground/50 hover:text-foreground"
            aria-label="Read answer aloud"
            title="Read answer aloud"
            onClick={() => onSpeak(result.answer)}
          >
            <Volume2 className="h-3.5 w-3.5 text-secondary" />
          </Button>
        ) : null}
        <Button
          type="button"
          size="icon"
          variant={feedback === "helpful" ? "secondary" : "ghost"}
          className="h-7 w-7"
          aria-label="Helpful answer"
          title="Helpful"
          aria-pressed={feedback === "helpful"}
          onClick={() => markFeedback(messageId, "helpful")}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={feedback === "not_helpful" ? "secondary" : "ghost"}
          className="h-7 w-7"
          aria-label="Not helpful answer"
          title="Not helpful"
          aria-pressed={feedback === "not_helpful"}
          onClick={() => markFeedback(messageId, "not_helpful")}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

const AssistantMessageList = ({ onSpeak }: { onSpeak?: (text: string) => void }) => {
  const { messages, formState, submitQuickAction } = useCompanionAssistant();
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
        className="flex-1 overflow-y-auto assistant-scrollbar px-4 py-4"
        onScroll={(event) => {
          const element = event.currentTarget;
          wasNearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 96;
        }}
      >
        <div className="space-y-3 pb-2">
          {messages.map((message, index) => (
            <div
              key={message.id}
              data-assistant-message-id={message.id}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div className={cn("max-w-[88%]", message.role === "user" ? "items-end" : "items-start")}>
                {message.kind === "user" ? (
                  <div className="space-y-1.5 rounded-[20px] rounded-br-lg bg-primary px-4 py-3 text-sm text-primary-foreground shadow-soft">
                    {message.attachments?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {message.attachments.map((attachment) => (
                          <img
                            key={attachment.previewUrl}
                            src={attachment.previewUrl}
                            alt={attachment.name}
                            className="h-24 w-24 rounded-[14px] border border-primary-foreground/25 object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                    {message.text ? <div>{message.text}</div> : null}
                  </div>
                ) : null}

                {message.kind === "text" ? (
                  <div className="space-y-2">
                    <div className="rounded-[20px] rounded-bl-lg border border-border/50 bg-card/80 px-4 py-3 text-sm text-foreground shadow-soft backdrop-blur-md">
                      <div className="prose prose-sm max-w-none leading-6 text-foreground [&_p]:mb-1.5 [&_ul]:mt-1 [&_li]:my-0.5">
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      </div>
                      {index > 0 ? (
                        <AssistantFeedbackControls
                          messageId={message.id}
                          feedback={message.feedback}
                          onSpeak={onSpeak ? () => onSpeak(message.text) : undefined}
                        />
                      ) : null}
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
                    onSpeak={onSpeak}
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
                    <AssistantFeedbackControls
                      messageId={message.id}
                      feedback={message.feedback}
                      onSpeak={onSpeak ? () => onSpeak(`${message.title}. ${message.text}`) : undefined}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {formState ? <AssistantRequestForm /> : null}
        </div>
      </div>
    </div>
  );
};

const AssistantFeedbackControls = ({
  messageId,
  feedback,
  onSpeak,
}: {
  messageId: string;
  feedback?: "helpful" | "not_helpful";
  onSpeak?: () => void;
}) => {
  const { markFeedback } = useCompanionAssistant();
  return (
    <div className="flex items-center justify-end gap-1 border-t border-border/40 pt-2">
      {onSpeak ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-foreground/50 hover:text-foreground"
          aria-label="Read message aloud"
          title="Read message aloud"
          onClick={onSpeak}
        >
          <Volume2 className="h-3.5 w-3.5 text-secondary" />
        </Button>
      ) : null}
      <Button
        type="button"
        size="icon"
        variant={feedback === "helpful" ? "secondary" : "ghost"}
        className="h-7 w-7"
        aria-label="Helpful answer"
        title="Helpful"
        aria-pressed={feedback === "helpful"}
        onClick={() => markFeedback(messageId, "helpful")}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={feedback === "not_helpful" ? "secondary" : "ghost"}
        className="h-7 w-7"
        aria-label="Not helpful answer"
        title="Not helpful"
        aria-pressed={feedback === "not_helpful"}
        onClick={() => markFeedback(messageId, "not_helpful")}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

const requestAreaForPath = (pathname: string) => {
  if (pathname.includes("/orders")) return "Order History";
  if (pathname.includes("/statements")) return "Statements";
  if (pathname.includes("/quotes")) return "Quote Requests";
  if (pathname.includes("/helpdesk")) return "Helpdesk";
  if (pathname.includes("/profile")) return "My Account";
  return "Classic Visions website";
};

const AssistantRequestForm = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { identity } = usePortalIdentity();
  const { formState, updateForm, submitForm, submitQuickAction, isSubmitting } = useCompanionAssistant();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  if (!formState) return null;

  const isQuoteRequest = formState.kind === "quote_request";
  const isPortalSupport = formState.kind === "portal_support";
  const isPricelistRequest = formState.kind === "pricelist_request";
  const isTradeSignup = formState.kind === "trade_signup";
  const accountName = identity?.organizationName || identity?.customerName || formState.customerName || "Signed-in account";
  const requesterName = formState.name || user?.email || "Signed-in user";
  const requestTitle = isQuoteRequest ? (formState.requestTitle || "") : formState.issueType;
  const hasRequiredContact = isPortalSupport || (formState.name.trim().length > 0 && formState.email.trim().length > 0);
  const isEligiblePricelistRequester = /\b(optician|optical|dispens|clinic|practice|lab(?:oratory)?|retail(?:er)?|store|ophthalm|eye\s*care)\b/i.test(formState.requesterType);
  const canSubmit = isTradeSignup
    ? formState.name.trim().length > 0
      && formState.email.trim().length > 0
      && formState.password.trim().length >= 6
      && formState.phone.trim().length > 0
      && formState.businessName.trim().length > 0
      && formState.taxId.trim().length > 0
      && formState.country.trim().length > 0
    : isQuoteRequest
    ? Boolean(user) && requestTitle.trim().length > 0
    : hasRequiredContact && requestTitle.trim().length > 0 && formState.summary.trim().length > 0 && (!isPricelistRequest || (formState.businessName.trim() && formState.market.trim() && isEligiblePricelistRequester));

  return (
    <form
      className="space-y-4 rounded-[22px] border border-primary/25 bg-card/95 p-4 text-sm shadow-soft"
      aria-label={isQuoteRequest ? "Quote request form" : "Support request form"}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) void submitForm();
      }}
    >
      <div className="space-y-1">
        <p className="font-semibold text-foreground">Review your request before sending</p>
        <p className="text-xs leading-5 text-muted-foreground">Nothing is sent until you choose Confirm & send.</p>
      </div>

      <div className="grid gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs">
        <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Request area</span><span className="text-right font-medium text-foreground">{requestAreaForPath(location.pathname)}</span></div>
        <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Asking for</span><span className="text-right font-medium text-foreground">{requesterName}{accountName && accountName !== requesterName ? ` · ${accountName}` : ""}</span></div>
        <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Help with</span><span className="text-right font-medium text-foreground">{isQuoteRequest ? "A quotation" : "A support request"}</span></div>
      </div>

      {isTradeSignup ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="assistant-trade-name">Full name</Label>
            <Input id="assistant-trade-name" value={formState.name} onChange={(event) => updateForm({ name: event.target.value })} placeholder="Jordan Smith" disabled={isSubmitting} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assistant-trade-phone">Phone number</Label>
              <Input id="assistant-trade-phone" type="tel" inputMode="tel" value={formState.phone} onChange={(event) => updateForm({ phone: event.target.value })} placeholder="+1 246 555 0101" disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assistant-trade-business">Business name</Label>
              <Input id="assistant-trade-business" value={formState.businessName} onChange={(event) => updateForm({ businessName: event.target.value })} placeholder="Vision Center Ltd" disabled={isSubmitting} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assistant-trade-tax">Tax / business registration #</Label>
            <Input id="assistant-trade-tax" value={formState.taxId} onChange={(event) => updateForm({ taxId: event.target.value })} placeholder="e.g. VAT / TIN / business reg #" disabled={isSubmitting} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assistant-trade-country">Country</Label>
            <Select value={formState.country || undefined} onValueChange={(value) => updateForm({ country: value })}>
              <SelectTrigger id="assistant-trade-country">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assistant-trade-email">Email</Label>
              <Input id="assistant-trade-email" type="email" value={formState.email} onChange={(event) => updateForm({ email: event.target.value })} placeholder="you@example.com" disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assistant-trade-password">Password</Label>
              <div className="relative">
                <Input
                  id="assistant-trade-password"
                  type={isPasswordVisible ? "text" : "password"}
                  value={formState.password}
                  onChange={(event) => updateForm({ password: event.target.value })}
                  placeholder="Min. 6 characters"
                  className="pr-9"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                >
                  {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">Business details qualify you for trade pricing and immediate ordering. We will email a confirmation link before the account activates.</p>
        </div>
      ) : isQuoteRequest ? (
        <div className="space-y-2">
          <Label htmlFor="assistant-quote-title">Quote title</Label>
          <Input
            id="assistant-quote-title"
            value={formState.requestTitle || ""}
            onChange={(event) => updateForm({ requestTitle: event.target.value })}
            placeholder="What would you like a quote for?"
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">This quote will be prepared for {accountName}.</p>
          <Label htmlFor="assistant-quote-description">Description (optional)</Label>
          <Textarea
            id="assistant-quote-description"
            value={formState.summary}
            onChange={(event) => updateForm({ summary: event.target.value })}
            placeholder="Add quantities, products, or other details."
            disabled={isSubmitting}
            className="assistant-scrollbar"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {!isPortalSupport ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="assistant-requester-name">Your name</Label><Input id="assistant-requester-name" value={formState.name} onChange={(event) => updateForm({ name: event.target.value })} disabled={isSubmitting} /></div>
              <div className="space-y-2"><Label htmlFor="assistant-requester-email">Reply email</Label><Input id="assistant-requester-email" type="email" value={formState.email} onChange={(event) => updateForm({ email: event.target.value })} disabled={isSubmitting} /></div>
            </div>
          ) : null}
          {isPricelistRequest ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="assistant-business-name">Business or clinic</Label><Input id="assistant-business-name" value={formState.businessName} onChange={(event) => updateForm({ businessName: event.target.value })} disabled={isSubmitting} /></div>
              <div className="space-y-2"><Label htmlFor="assistant-market">Country or market</Label><Input id="assistant-market" value={formState.market} onChange={(event) => updateForm({ market: event.target.value })} disabled={isSubmitting} /></div>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="assistant-request-title">Request title</Label>
            <Input id="assistant-request-title" value={formState.issueType} onChange={(event) => updateForm({ issueType: event.target.value })} placeholder="A short title for this request" disabled={isSubmitting} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assistant-request-details">What do you need help with?</Label>
            <Textarea id="assistant-request-details" value={formState.summary} onChange={(event) => updateForm({ summary: event.target.value })} placeholder="Type the details of your inquiry here." disabled={isSubmitting} className="assistant-scrollbar" />
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-border/50 pt-3">
        <Button type="button" variant="outline" onClick={() => submitQuickAction({ type: "cancel_form", label: "Cancel" })} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={!canSubmit || isSubmitting}>{isSubmitting ? "Sending…" : "Confirm & send"}</Button>
      </div>
    </form>
  );
};

const CompanionAssistant = () => {
  const location = useLocation();
  const {
    isOpen,
    isDetachedRoute,
    openDetachedWindow,
    currentQuery,
    setCurrentQuery,
    openAssistant,
    closeAssistant,
    submitQuery,
    messages,
    activeAudience,
    startNewConversation,
    saveConversation,
    isSavingConversation,
    nudge,
    dismissNudge,
    isSubmitting,
  } = useCompanionAssistant();

  // Handle Voice Engine integration
  const handleFinalTranscript = useCallback(
    (text: string) => {
      setCurrentQuery(text);
      void submitQuery(text);
    },
    [setCurrentQuery, submitQuery],
  );

  const voiceEngine = useVoiceEngine({
    onFinalTranscript: handleFinalTranscript,
  });

  // Automatically read aloud new assistant messages when autoSpeak is enabled
  const lastSpokenMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!voiceEngine.autoSpeak) return;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant" || lastMessage.id === lastSpokenMessageIdRef.current) return;

    lastSpokenMessageIdRef.current = lastMessage.id;
    let textToSpeak = "";
    if (lastMessage.kind === "text" || lastMessage.kind === "confirmation") {
      textToSpeak = lastMessage.text;
    } else if (lastMessage.kind === "result" && !lastMessage.isEnhancing) {
      textToSpeak = lastMessage.result.answer;
    }

    if (textToSpeak) {
      voiceEngine.speak(textToSpeak);
    }
  }, [messages, voiceEngine]);

  // Track whether the user dismissed the nudge ("Not now") — collapse to icon-only bubble
  const [isCollapsed, setIsCollapsed] = useState(false);
  const handleNudgeDismiss = () => {
    setIsCollapsed(true);
    dismissNudge();
  };

  const MAX_ATTACHMENTS = 4;
  const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
  const [attachments, setAttachments] = useState<{ id: string; name: string; previewUrl: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addAttachmentFiles = (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith("image/") && file.size <= MAX_ATTACHMENT_BYTES);
    if (!images.length) return;
    setAttachments((current) => [
      ...current,
      ...images.map((file) => ({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`, name: file.name, previewUrl: URL.createObjectURL(file) })),
    ].slice(0, MAX_ATTACHMENTS));
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => {
      const target = current.find((attachment) => attachment.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((attachment) => attachment.id !== id);
    });
  };

  const submitWithAttachments = () => {
    const trimmed = currentQuery.trim();
    if (!trimmed && attachments.length === 0) return;
    void submitQuery(trimmed, undefined, undefined, attachments.length ? attachments.map(({ name, previewUrl }) => ({ name, previewUrl })) : undefined);
    // Object URLs are kept alive so the sent images keep rendering inline in the chat history.
    setAttachments([]);
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
        "flex flex-col overflow-hidden border border-[#c9a227]/65 shadow-elegant backdrop-blur-md",
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
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-foreground/60 hover:text-foreground"
            aria-label="New chat"
            title="New chat"
            onClick={startNewConversation}
            disabled={isSubmitting || isSavingConversation}
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-foreground/60 hover:text-foreground"
            aria-label="Save this chat"
            title="Save this chat"
            onClick={() => void saveConversation()}
            disabled={isSavingConversation}
          >
            {isSavingConversation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0 rounded-full border border-border/50 bg-card/80 text-foreground/70 shadow-soft hover:bg-muted hover:text-foreground"
            onClick={closeAssistant}
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border/50 bg-muted/20 px-4 py-2">
        {voiceEngine.isSpeaking ? (
          <div className="flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-xs text-secondary">
            <div className="voice-wave-bars">
              <span /><span /><span /><span /><span />
            </div>
            <span className="font-medium text-[11px]">Speaking</span>
            <button
              type="button"
              onClick={voiceEngine.stopSpeaking}
              className="ml-1 text-secondary/70 hover:text-secondary font-bold text-xs"
              title="Stop speaking"
            >
              ✕
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <AssistantMessageList onSpeak={voiceEngine.ttsSupported ? voiceEngine.speak : undefined} />
      </div>

      <div className="space-y-3 border-t border-border/50 bg-muted/30 px-4 py-4">
        {/* Live speech transcription feedback banner */}
        {voiceEngine.isListening ? (
          <div className="flex items-center gap-2 rounded-xl border border-secondary/40 bg-secondary/10 px-3 py-2 text-xs text-foreground shadow-soft voice-transcript-live">
            <div className="voice-listening-indicator h-3 w-3 shrink-0 rounded-full bg-secondary" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-secondary">Listening...</p>
              <p className="truncate text-foreground/80">
                {voiceEngine.interimTranscript || voiceEngine.transcript || "Speak clearly into your microphone..."}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 rounded-full text-[11px] border-secondary/40 text-secondary hover:bg-secondary/20"
              onClick={voiceEngine.toggleListening}
            >
              Done
            </Button>
          </div>
        ) : null}

        <div className="rounded-full border border-accent/55 bg-card/90 p-1 shadow-[0_0_0_1px_hsl(var(--accent)/0.10),0_8px_24px_-14px_hsl(var(--accent)/0.55)] backdrop-blur-md focus-within:border-accent focus-within:shadow-[0_0_0_3px_hsl(var(--accent)/0.16),0_8px_24px_-14px_hsl(var(--accent)/0.65)]">
          <div className="flex items-center gap-2">
            {voiceEngine.sttSupported ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "ml-1 h-9 w-9 shrink-0 rounded-full transition-all",
                  voiceEngine.isListening
                    ? "voice-listening-indicator voice-mic-active bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "text-foreground/60 hover:bg-muted hover:text-foreground"
                )}
                onClick={voiceEngine.toggleListening}
                title={voiceEngine.isListening ? "Stop voice input" : "Speak your question"}
                aria-label={voiceEngine.isListening ? "Stop voice input" : "Start voice input"}
              >
                {voiceEngine.isListening ? (
                  <MicOff className="h-4 w-4 animate-pulse" />
                ) : (
                  <Mic className="h-4 w-4 text-accent" />
                )}
              </Button>
            ) : null}
            <Input
              dir="ltr"
              value={currentQuery}
              onChange={(event) => setCurrentQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitWithAttachments();
                }
              }}
              onPaste={(event) => {
                const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));
                if (files.length) {
                  event.preventDefault();
                  addAttachmentFiles(files);
                }
              }}
              placeholder={voiceEngine.isListening ? "Listening..." : "Ask anything"}
              disabled={isSubmitting}
              className="h-11 border-0 bg-transparent px-2 text-left text-foreground placeholder:text-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="button"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
              disabled={(!currentQuery.trim() && attachments.length === 0) || isSubmitting}
              onClick={submitWithAttachments}
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
            <Button size="sm" className="rounded-full" onClick={() => { setIsCollapsed(false); openAssistant({ query: nudge.query, autoSubmit: Boolean(nudge.query), formKind: nudge.formKind }); }}>
              <Sparkles className="mr-2 h-4 w-4" />
              {nudge.formKind === "trade_signup" ? "Create a trade account" : "Open assistant"}
            </Button>
            <Button size="sm" variant="outline" className="rounded-full border-border/60 bg-background/70 text-foreground backdrop-blur-md hover:bg-muted/80 hover:text-foreground" onClick={handleNudgeDismiss}>
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
            className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full border border-accent/70 bg-background/75 text-foreground shadow-[0_16px_42px_rgba(200,145,48,0.16),inset_0_1px_0_rgba(255,255,255,0.32)] backdrop-blur-xl hover:bg-background/90 sm:bottom-6 sm:right-6"
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => openAssistant()}
            className="fixed bottom-4 right-4 z-50 h-14 rounded-full border border-accent/70 bg-background/75 text-foreground shadow-[0_16px_42px_rgba(200,145,48,0.16),inset_0_1px_0_rgba(255,255,255,0.32)] backdrop-blur-xl hover:bg-background/90 sm:bottom-6 sm:right-6"
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
          <div className="fixed inset-x-3 bottom-20 top-20 z-50 sm:inset-x-auto sm:right-4 sm:top-28 sm:bottom-8 sm:w-[28rem]">
            {assistantWindow}
          </div>
        )
      ) : null}
    </>
  );
};

export default CompanionAssistant;
