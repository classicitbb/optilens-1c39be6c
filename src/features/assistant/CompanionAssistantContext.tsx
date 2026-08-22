import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { usePublicKnowledge } from "@/hooks/useContentArticles";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { fetchCustomerCommandCenter } from "@/features/portal/customerCommandCenter";
import { resolveUserFullName } from "@/lib/profileData";
import { submitPublicInquiry } from "@/lib/publicInquiry";
import { useCreateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket";
import { generateAssistantAnswer } from "./assistantGeneration";
import {
  buildAssistantCorpus,
  buildRetailerPrompt,
  collectRuntimeHeadings,
  inferAssistantAudience,
  runAssistantQuery,
  shouldAskClarifier,
  shouldAskAudienceClarifier,
  type AssistantAudience,
  type AssistantProfile,
} from "./companionAssistantEngine";
import {
  type AssistantFormKind,
  CompanionAssistantContext,
  type AssistantFormState,
  type AssistantMessage,
  type AssistantOutgoingAttachment,
  type AssistantQuickAction,
  type AssistantTaskContext,
  type CompanionAssistantContextValue,
  type OpenAssistantOptions,
} from "./CompanionAssistantContext.shared";

export type {
  AssistantFormKind,
  AssistantFormState,
  AssistantMessage,
  AssistantOutgoingAttachment,
  AssistantQuickAction,
  AssistantTaskContext,
  CompanionAssistantContextValue,
  OpenAssistantOptions,
} from "./CompanionAssistantContext.shared";

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const POPOUT_SNAPSHOT_KEY = "companion-assistant-popout";
const PENDING_SAVE_KEY = "companion-assistant-pending-save";
const ANONYMOUS_SESSION_KEY = "companion-assistant-anonymous-session";
const NUDGE_DISMISSED_SESSION_KEY = "companion-assistant-nudge-dismissed";

const getAssistantLaunchPrompt = (context: AssistantTaskContext) => {
  const label = context.label.replace(/\s+/g, " ").trim().slice(0, 120) || "this request";
  if (context.kind === "quote") return `I need help preparing a quote for ${label}.`;
  if (context.kind === "policy_help") return `I need help understanding the policy information for ${label}.`;
  return `I need help with ${label}.`;
};

const getProfileForRoute = (pathname: string): AssistantProfile => {
  if (pathname.startsWith("/profile")) return "portal_support";
  if (pathname.startsWith("/find-a-retailer")) return "retailer_help";
  return "general_search";
};

const getDefaultAudienceForRoute = (pathname: string): AssistantAudience => {
  if (pathname.startsWith("/profile")) return "customer";
  if (pathname.startsWith("/patients")) return "patient";
  if (pathname.startsWith("/professionals") || pathname.startsWith("/dispensing-tips")) return "dispenser";
  return "visitor";
};

const getAnonymousSessionId = () => {
  try {
    const existing = window.sessionStorage.getItem(ANONYMOUS_SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(ANONYMOUS_SESSION_KEY, created);
    return created;
  } catch {
    return `anonymous-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

const getStarterActions = (pathname: string, isAuthenticated: boolean): AssistantQuickAction[] =>
  pathname.startsWith("/profile")
    ? [
        ...(isAuthenticated ? [] : [{ type: "query" as const, label: "Find a retailer", query: "Help me find a retailer in the Caribbean.", profile: "retailer_help" as const }]),
        { type: "lens_guide", label: "Find the right lens", step: 1, answers: {} },
        { type: "web_search_prompt", label: "Search the web" },
        { type: "form", label: "Get support", profile: "portal_support" },
        { type: "link", label: "Track an order", href: "/profile/orders" },
      ]
    : [
        ...(isAuthenticated ? [] : [{ type: "query" as const, label: "Find a retailer", query: "Help me find a retailer in Barbados or across the Caribbean.", profile: "retailer_help" as const }]),
        ...(isAuthenticated ? [] : [{ type: "form" as const, label: "Create a trade account", profile: "customer_support" as const, kind: "trade_signup" as const }]),
        { type: "lens_guide", label: "Find the right lens", step: 1, answers: {} },
        { type: "web_search_prompt", label: "Search the web" },
        { type: "form", label: "Get support", profile: "customer_support" },
        { type: "form", label: "Contact us", profile: "customer_support" },
      ];

const isKeyPage = (pathname: string) =>
  pathname.startsWith("/find-a-retailer") ||
  pathname.startsWith("/knowledge") ||
  pathname.startsWith("/lenses") ||
  pathname.startsWith("/coatings") ||
  pathname.startsWith("/store") ||
  pathname.startsWith("/profile");

const getRouteNudge = (pathname: string, isAuthenticated: boolean) => {
  if (pathname.startsWith("/store") && !isAuthenticated) {
    return {
      message: "Trade pricing is hidden until you're signed in. Set up a trade account without leaving this page?",
      formKind: "trade_signup" as const,
    };
  }

  if (pathname.startsWith("/find-a-retailer") && !isAuthenticated) {
    return {
      message: "Need help narrowing down a retailer or clinic?",
      query: "Help me find a retailer based on this page.",
    };
  }

  if (pathname.startsWith("/profile")) {
    return {
      message: "Need account-aware help or support from inside the portal?",
      query: "Help me with my account or support request.",
    };
  }

  if (pathname.startsWith("/knowledge") || pathname.startsWith("/lenses") || pathname.startsWith("/coatings")) {
    return {
      message: "Want the shortest path to the right article or product?",
      query: "Help me find the best page for my question.",
    };
  }

  return null;
};

const createInitialFormState = ({
  pathname,
  profile,
  userName,
  userEmail,
  accountName,
}: {
  pathname: string;
  profile: AssistantProfile;
  userName: string;
  userEmail: string;
  accountName: string;
}): AssistantFormState => {
  const kind: AssistantFormKind =
    profile === "retailer_help" || pathname.startsWith("/find-a-retailer")
      ? "retailer_help"
      : profile === "portal_support" || pathname.startsWith("/profile")
        ? "portal_support"
        : profile === "customer_support"
          ? "customer_support"
          : "product_help";

  return {
    kind,
    startedAt: new Date().toISOString(),
    name: userName,
    email: userEmail,
    phone: "",
    businessName: "",
    requesterType: "",
    market: pathname.startsWith("/find-a-retailer/barbados") ? "Barbados" : "",
    issueType: "",
    requestTitle: "",
    productTopic: "",
    customerName: accountName,
    summary: "",
    password: "",
    taxId: "",
    country: "",
  };
};

const getFormQuestion = (field: NonNullable<AssistantFormState["pendingField"]>, kind: AssistantFormKind) => {
  if (field === "name") return "What name should the team use when they reply?";
  if (field === "email") return "What email address should we use for the reply?";
  if (field === "businessName") return "What is your optical business, clinic, or lab called?";
  if (field === "requesterType") return "Wholesale price lists are available to optical businesses and professionals. What is your role or type of optical business?";
  if (field === "market") return "Which country or market will this price list be used in?";
  if (field === "customerName") return "Which customer or business is this quote for?";
  if (field === "issueType") return "What is this support request about?";
  if (field === "requestTitle") return "What should we call this request?";
  return kind === "quote_request"
    ? "What products, quantities, and pricing details should we include?"
    : "Please describe what you need help with.";
};

export const isPricelistRequesterEligible = (requesterType: string) =>
  /\b(optician|optical|dispens|clinic|practice|lab(?:oratory)?|retail(?:er)?|store|ophthalm|eye\s*care)\b/i.test(requesterType);

const getNextFormField = (form: AssistantFormState): AssistantFormState["pendingField"] => {
  // Requests are presented as an editable inline form. Keep this helper for
  // older persisted assistant snapshots that still contain a pending field.
  if (form.kind === "quote_request") return undefined;
  if (form.kind === "pricelist_request") {
    if (!form.name.trim()) return "name";
    if (!form.email.trim()) return "email";
    if (!form.businessName.trim()) return "businessName";
    if (!form.requesterType.trim() || !isPricelistRequesterEligible(form.requesterType)) return "requesterType";
    if (!form.market.trim()) return "market";
    return !form.summary.trim() ? "summary" : undefined;
  }
  if (form.kind === "portal_support" || form.kind === "trade_signup") return undefined;
  return !form.name.trim() ? "name" : !form.email.trim() ? "email" : !form.summary.trim() ? "summary" : undefined;
};

export const CompanionAssistantProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const isDetachedRoute = pathname === "/assistant/window";
  const { user, signUp } = useAuth();
  const { identity } = usePortalIdentity();
  const { data: products = [] } = useStoreProducts();
  const { data: knowledge = [] } = usePublicKnowledge();
  const createTicket = useCreateHelpdeskTicket();

  const userName = resolveUserFullName(user) || "";
  const userEmail = user?.email?.trim() || "";
  const accountName = identity?.organizationName?.trim() || identity?.customerName?.trim() || userName;
  const activeProfile = getProfileForRoute(pathname);
  const [audienceOverride, setAudienceOverride] = useState<AssistantAudience | null>(null);
  const activeAudience = audienceOverride ?? (user ? "dispenser" : getDefaultAudienceForRoute(pathname));
  const starterActions = useMemo(() => getStarterActions(pathname, Boolean(user)), [pathname, user]);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingConversation, setIsSavingConversation] = useState(false);
  const [nudge, setNudge] = useState<{ message: string; query?: string; formKind?: AssistantFormKind } | null>(null);
  const [formState, setFormState] = useState<AssistantFormState | null>(null);
  const lastQueryRef = useRef<string | null>(null);
  const negativeFeedbackRef = useRef(false);
  const taskContextRef = useRef<AssistantTaskContext | undefined>(undefined);
  const formMessageIdsRef = useRef<Set<string>>(new Set());
  const nudgeTimerRef = useRef<number | null>(null);
  const nudgeHideTimerRef = useRef<number | null>(null);
  const [nudgeSnoozeVersion, setNudgeSnoozeVersion] = useState(0);
  const hasRestoredPopoutRef = useRef(false);
  const pendingWebSearchRef = useRef(false);
  const runtimeHeadings = useMemo(
    () => collectRuntimeHeadings(pathname),
    [pathname, currentQuery],
  );

  const corpus = useMemo(
    () => buildAssistantCorpus({ products, knowledge, runtimeHeadings }),
    [knowledge, products, runtimeHeadings],
  );

  const resetConversation = useCallback(() => {
    setMessages([
      {
        id: createId("assistant"),
        role: "assistant",
        kind: "text",
        text: pathname.startsWith("/profile")
          ? "I can help with search, support, retailer questions, and portal-aware follow-up. Start with a prompt below or ask your question."
          : "I can help you search the site, find retailers, compare options, and guide you toward the right help path. Start with a prompt below or ask your question.",
        quickActions: starterActions,
      },
    ]);
  }, [pathname, starterActions]);

  const startNewConversation = useCallback(() => {
    setCurrentQuery("");
    setFormState(null);
    setAudienceOverride(null);
    lastQueryRef.current = null;
    negativeFeedbackRef.current = false;
    taskContextRef.current = undefined;
    formMessageIdsRef.current.clear();
    pendingWebSearchRef.current = false;
    try { window.sessionStorage.removeItem(POPOUT_SNAPSHOT_KEY); } catch { /* best effort */ }
    resetConversation();
  }, [resetConversation]);

  const persistConversation = useCallback(async (conversationMessages: AssistantMessage[], audience: AssistantAudience) => {
    if (!user || conversationMessages.length < 2) return;

    setIsSavingConversation(true);
    try {
      const firstUserMessage = conversationMessages.find((message) => message.role === "user" && message.kind === "user");
      const title = firstUserMessage && firstUserMessage.kind === "user"
        ? firstUserMessage.text.slice(0, 80)
        : "Assistant conversation";
      const { data: conversation, error: conversationError } = await (supabase as any)
        .from("assistant_conversations")
        .insert({ user_id: user.id, title, audience, context: { route: pathname } })
        .select("id")
        .single();
      if (conversationError) throw conversationError;

      const rows = conversationMessages
        .filter((message): message is Extract<AssistantMessage, { kind: "text" | "user" | "result" }> => message.kind === "text" || message.kind === "user" || message.kind === "result")
        .map((message) => ({
          conversation_id: conversation.id,
          user_id: user.id,
          role: message.role,
          content: message.kind === "result" ? message.result.answer : message.text,
          metadata: message.kind === "result" ? {
            query: message.result.query,
            audience: message.result.audience,
            intent: message.result.intent,
            answerMode: message.result.answerMode,
            confidence: message.result.confidence,
            citations: message.result.citations ?? message.result.topLinks,
          } : {},
        }));

      if (rows.length) {
        const { error: messageError } = await (supabase as any).from("assistant_messages").insert(rows);
        if (messageError) throw messageError;
      }
      try { window.sessionStorage.removeItem(PENDING_SAVE_KEY); } catch { /* best effort */ }
    } finally {
      setIsSavingConversation(false);
    }
  }, [pathname, user]);

  const saveConversation = useCallback(async () => {
    if (messages.length < 2) return;
    if (!user) {
      try {
        window.sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify({ messages, audience: activeAudience }));
      } catch { /* best effort */ }
      const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.href = `/auth?mode=signin&redirect=${encodeURIComponent(redirect)}`;
      return;
    }
    await persistConversation(messages, activeAudience);
  }, [activeAudience, messages, persistConversation, user]);

  useEffect(() => {
    if (messages.length === 0) {
      resetConversation();
    }
  }, [messages.length, resetConversation]);

  useEffect(() => {
    if (!isDetachedRoute || hasRestoredPopoutRef.current) return;
    hasRestoredPopoutRef.current = true;

    try {
      const raw = window.sessionStorage.getItem(POPOUT_SNAPSHOT_KEY);
      if (!raw) {
        setIsOpen(true);
        return;
      }

      const snapshot = JSON.parse(raw) as {
        messages?: AssistantMessage[];
        currentQuery?: string;
        formState?: AssistantFormState | null;
      };

      if (Array.isArray(snapshot.messages) && snapshot.messages.length > 0) {
        setMessages(snapshot.messages);
      }
      if (typeof snapshot.currentQuery === "string") {
        setCurrentQuery(snapshot.currentQuery);
      }
      if (snapshot.formState) {
        setFormState({ requestTitle: "", ...snapshot.formState });
      }
      setIsOpen(true);
    } catch {
      setIsOpen(true);
    }
  }, [isDetachedRoute]);

  useEffect(() => {
    if (!user) return;
    try {
      const raw = window.sessionStorage.getItem(PENDING_SAVE_KEY);
      if (!raw) return;
      const pending = JSON.parse(raw) as { messages?: AssistantMessage[]; audience?: AssistantAudience };
      if (Array.isArray(pending.messages) && pending.messages.length > 1) {
        setMessages(pending.messages);
        void persistConversation(pending.messages, pending.audience ?? activeAudience);
      }
    } catch {
      // Ignore malformed or unavailable pending-save state.
    }
  }, [activeAudience, persistConversation, user]);

  useEffect(() => {
    if (isOpen) return;
    if (!isKeyPage(pathname)) return;

    const routeNudge = getRouteNudge(pathname, Boolean(user));
    if (!routeNudge) return;
    try { if (sessionStorage.getItem(NUDGE_DISMISSED_SESSION_KEY) === "true") return; } catch { /* optional */ }

    if (nudgeTimerRef.current) window.clearTimeout(nudgeTimerRef.current);
    if (nudgeHideTimerRef.current) window.clearTimeout(nudgeHideTimerRef.current);
    const showAfter = nudgeSnoozeVersion === 0 ? 60_000 : 5 * 60_000;
    nudgeTimerRef.current = window.setTimeout(() => {
      setNudge(routeNudge);
      nudgeHideTimerRef.current = window.setTimeout(() => {
        setNudge(null);
        setNudgeSnoozeVersion((current) => current + 1);
      }, 15_000);
    }, showAfter);

    return () => {
      if (nudgeTimerRef.current) {
        window.clearTimeout(nudgeTimerRef.current);
        nudgeTimerRef.current = null;
      }
      if (nudgeHideTimerRef.current) {
        window.clearTimeout(nudgeHideTimerRef.current);
        nudgeHideTimerRef.current = null;
      }
    };
  }, [isOpen, nudgeSnoozeVersion, pathname, user]);

  useEffect(() => {
    setFormState((current) => {
      if (!current) return current;
      return {
        ...current,
        name: current.name || userName,
        email: current.email || userEmail,
      };
    });
  }, [userEmail, userName]);

  const dismissNudge = useCallback(() => {
    setNudge(null);
    try { sessionStorage.setItem(NUDGE_DISMISSED_SESSION_KEY, "true"); } catch { /* optional */ }
  }, []);
  const snoozeNudge = useCallback(() => {
    setNudge(null);
    setNudgeSnoozeVersion((current) => current + 1);
  }, []);

  const closeAssistant = useCallback(() => {
    if (isDetachedRoute) {
      if (window.opener && !window.opener.closed) {
        window.close();
        return;
      }
      window.location.href = "/";
      return;
    }
    setIsOpen(false);
    setNudge(null);
  }, [isDetachedRoute]);

  const openForm = useCallback((profile?: AssistantProfile, options?: { kind?: AssistantFormKind; values?: Partial<AssistantFormState> }) => {
    setIsOpen(true);
    setNudge(null);
    const initial = createInitialFormState({
      pathname,
      profile: profile ?? activeProfile,
      userName,
      userEmail,
      accountName,
    });
    const next = { ...initial, kind: options?.kind ?? initial.kind, taskContext: taskContextRef.current, ...options?.values };
    const pendingField = undefined;
    setFormState({ ...next, pendingField });
    formMessageIdsRef.current = new Set();
  }, [accountName, activeProfile, pathname, userEmail, userName]);

  const closeForm = useCallback(() => setFormState(null), []);

  const cancelForm = useCallback(() => {
    const formMessageIds = formMessageIdsRef.current;
    setFormState(null);
    setMessages((current) => [
      ...current.filter((message) => !formMessageIds.has(message.id)),
      { id: createId("assistant"), role: "assistant", kind: "text", text: "No request was sent. What else can I help with?" },
    ]);
    formMessageIdsRef.current = new Set();
  }, []);

  const updateForm = useCallback((patch: Partial<AssistantFormState>) => {
    setFormState((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const persistFeedback = useCallback((payload: Record<string, unknown>) => {
    try {
      const key = "companion-assistant-feedback";
      const current = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
      const next = [payload, ...current].slice(0, 25);
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Ignore storage issues; the server insert below remains authoritative.
    }
    void (async () => {
      const identityKey = user?.id ?? getAnonymousSessionId();
      const { error } = await (supabase as any).from("assistant_feedback").upsert({
        ...payload,
        user_id: user?.id ?? null,
        anonymous_session_id: user ? null : identityKey,
        feedback_key: `${identityKey}:${String(payload.message_id)}`,
      }, { onConflict: "feedback_key" });
      if (error) return;
    })();
  }, [user]);

  const markFeedback = useCallback((messageId: string, feedback: "helpful" | "not_helpful") => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId && message.role === "assistant" ? { ...message, feedback } : message,
      ),
    );

    const assistantMessage = messages.find((message) => message.id === messageId && message.role === "assistant");
    if (!assistantMessage || assistantMessage.role !== "assistant") return;
    const result = assistantMessage.kind === "result" ? assistantMessage.result : null;

    persistFeedback({
      message_id: messageId,
      vote: feedback,
      route: pathname,
      audience: result?.audience ?? activeAudience,
      intent: result?.intent ?? "general",
      answer_mode: result?.answerMode ?? "direct_answer",
      confidence: result?.confidence ?? "medium",
      citation_ids: result ? (result.citations ?? result.topLinks).map((link) => link.path) : [],
      source_ids: result ? (result.citations ?? result.topLinks).map((link) => link.sourceId ?? link.id) : [],
      conversation_id: null,
      created_at: new Date().toISOString(),
    });

    if (feedback === "helpful") {
      negativeFeedbackRef.current = false;
      return;
    }

    negativeFeedbackRef.current = true;
    setMessages((current) => [
      ...current,
      {
        id: createId("assistant"),
        role: "assistant",
        kind: "text",
        text: "If that still was not useful, I can try a tighter digital path next or turn this into a guided request form with the context I already have.",
        quickActions: [
          { type: "query", label: "Refine the answer", query: "Give me a more specific optical answer based on the site." },
          { type: "form", label: "Open request form", profile: pathname.startsWith("/profile") ? "portal_support" : "customer_support" },
        ],
      },
    ]);
  }, [activeAudience, messages, pathname, persistFeedback]);

  const submitQueryInternal = useCallback(async (queryValue: string, profile: AssistantProfile, audience: AssistantAudience = activeAudience, attachments?: AssistantOutgoingAttachment[]) => {
    const trimmedQuery = queryValue.trim();
    if (!trimmedQuery && !attachments?.length) return;

    const queryForModel = attachments?.length
      ? `${trimmedQuery}${trimmedQuery ? "\n\n" : ""}[Attached image${attachments.length === 1 ? "" : "s"}: ${attachments.map((attachment) => attachment.name).join(", ")}]`
      : trimmedQuery;

    const repeatedUnsatisfied = shouldAskClarifier({
      previousNegativeFeedback: negativeFeedbackRef.current,
      lastQuery: lastQueryRef.current,
      nextQuery: trimmedQuery,
    });

    setIsOpen(true);
    setNudge(null);
    setCurrentQuery("");

    setMessages((current) => [
      ...current,
      {
        id: createId("user"),
        role: "user",
        kind: "user",
        text: trimmedQuery,
        attachments,
      },
    ]);

    if (repeatedUnsatisfied) {
      setMessages((current) => [
        ...current,
        {
          id: createId("assistant"),
          role: "assistant",
          kind: "text",
          text: user ? "Before I change paths, what are you trying to do most right now: compare products, get dispensing guidance, or get direct support?" : "Before I change paths, what are you trying to do most right now: find a retailer, compare products, or get direct support?",
          quickActions: [
            ...(user ? [] : [{ type: "query" as const, label: "Find a retailer", query: "Help me find a retailer or clinic.", profile: "retailer_help" as const }]),
            { type: "query", label: "Compare products", query: "Help me compare lens or coating options." },
            { type: "form", label: "Get direct support", profile: pathname.startsWith("/profile") ? "portal_support" : "customer_support" },
          ],
        },
      ]);
      return;
    }

    const normalizedPortalQuery = trimmedQuery.toLowerCase();

    if (shouldAskAudienceClarifier({ query: trimmedQuery, route: pathname, authenticated: Boolean(user), requestedAudience: audienceOverride })) {
      setMessages((current) => [...current, {
        id: createId("assistant"),
        role: "assistant",
        kind: "text",
        text: "I can tailor that answer better. Are you asking as a patient, an optical professional, or just exploring?",
        quickActions: [
          { type: "query", label: "I’m a patient", query: trimmedQuery, audience: "patient" },
          { type: "query", label: "I’m a dispenser", query: trimmedQuery, audience: "dispenser" },
          { type: "query", label: "Just browsing", query: trimmedQuery, audience: "visitor" },
        ],
      }]);
      return;
    }

    if (user && /\b(retailer|retailers|clinic|clinics|where can i buy|find a practice)\b/.test(normalizedPortalQuery)) {
      lastQueryRef.current = trimmedQuery;
      setMessages((current) => [...current, {
        id: createId("assistant"),
        role: "assistant",
        kind: "text",
        text: "You’re signed in as an optical professional, so I’ll skip public retailer-finding assistance. I can help with lens selection, dispensing, ordering, LabLink, or a support request instead.",
        quickActions: [
          { type: "link", label: "Open the lens assistant", href: "/lens-assistant?audience=professional" },
          { type: "query", label: "Dispensing guidance", query: "Give me practical dispensing guidance.", audience: "dispenser" },
          { type: "form", label: "Prepare support request", profile: "portal_support" },
        ],
      }]);
      return;
    }

    const asksForPrivateAccountData = /\b(my|account|order|job|balance|statement|invoice|draft|pricelist|price|support|warranty|remake|purchase order|patient)\b/.test(normalizedPortalQuery);
    if (asksForPrivateAccountData) {
      if (!user) {
        lastQueryRef.current = trimmedQuery;
        negativeFeedbackRef.current = false;
        setMessages((current) => [...current, {
          id: createId("assistant"),
          role: "assistant",
          kind: "text",
          text: "I can help with that, but I need you to sign in first so I can safely check account information. Your question will stay here when you return.",
          quickActions: [{ type: "link", label: "Sign in for account help", href: `/auth?mode=signin&redirect=${encodeURIComponent(pathname)}` }],
        }]);
        return;
      }
      setIsSubmitting(true);
      try {
        const account = await fetchCustomerCommandCenter();
        let text = "I can help with the customer information currently available to this signed-in account.";
        let quickActions: AssistantQuickAction[] = [];

        if (/patient|purchase order|\bpo\b|job number|lablink job/.test(normalizedPortalQuery)) {
          text = "I cannot search Innovations or LabLink jobs by patient name, purchase order, or job number yet. That read-only job feed is not connected to the website. Use LabLink tracking for the current source of truth, or create a support request with the reference you have.";
          quickActions = [
            { type: "link", label: "Open LabLink tracking", href: "/rx-job-status" },
            { type: "form", label: "Prepare support request", profile: "portal_support" },
          ];
        } else if (/balance|statement|invoice/.test(normalizedPortalQuery)) {
          const rawBalance = account.balance?.current_balance ?? account.latestStatement?.closing_balance ?? null;
          const numericBalance = rawBalance === null ? null : Number(rawBalance);
          text = numericBalance !== null && Number.isFinite(numericBalance)
            ? `Your latest available account balance is BBD $${numericBalance.toFixed(2)}. ${account.latestStatement ? "A statement is available in your account." : "No statement is currently available from the connected source."}`
            : "I could not verify a current balance from the connected account source, so I will not invent a figure. You can open Statements or ask the accounts team to confirm it.";
          quickActions = [
            { type: "link", label: "View statements", href: "/profile/statements" },
            { type: "form", label: "Ask accounts for help", profile: "portal_support" },
          ];
        } else if (/draft|reorder|repeat/.test(normalizedPortalQuery)) {
          text = `You have ${account.drafts.length} saved draft${account.drafts.length === 1 ? "" : "s"}. Rx drafts are not submitted orders until you complete the final step in LabLink.`;
          quickActions = [
            { type: "link", label: "Open saved drafts", href: "/profile/drafts" },
            { type: "link", label: "Start lens assistant", href: "/lens-assistant?audience=professional" },
          ];
        } else if (/pricelist|price/.test(normalizedPortalQuery)) {
          text = account.pricelist
            ? `Your assigned customer pricelist is ${account.pricelist.name}. Product prices are shown only when that pricelist contains an approved matching row.`
            : "No customer pricelist is assigned to this account yet, so I will not invent or substitute a price.";
          quickActions = [
            { type: "link", label: "View assigned pricing", href: "/profile/pricelists" },
            { type: "link", label: "Find a lens", href: "/lens-assistant?audience=professional" },
          ];
        } else if (/support|warranty|remake/.test(normalizedPortalQuery)) {
          text = `You have ${account.tickets.filter((ticket) => !ticket.closedAt).length} open support request${account.tickets.filter((ticket) => !ticket.closedAt).length === 1 ? "" : "s"}. I can prepare a new request, but I will ask for confirmation before it is submitted.`;
          quickActions = [
            { type: "link", label: "Open helpdesk", href: "/profile/helpdesk" },
            { type: "form", label: "Prepare support request", profile: "portal_support" },
          ];
        } else {
          const activeOrders = account.orders.filter((order) => ["draft", "pending", "pending_payment", "confirmed", "processing", "shipped"].includes(order.status));
          text = `You have ${activeOrders.length} website order${activeOrders.length === 1 ? "" : "s"} in progress. LabLink Rx jobs are not included in that count, and I cannot invent an ETA that the source does not provide.`;
          quickActions = [
            { type: "link", label: "View website orders", href: "/profile/orders" },
            { type: "link", label: "Open LabLink tracking", href: "/rx-job-status" },
          ];
        }

        lastQueryRef.current = trimmedQuery;
        negativeFeedbackRef.current = false;
        setMessages((current) => [...current, { id: createId("assistant"), role: "assistant", kind: "text", text, quickActions }]);
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    const conversation = messages
      .filter((message): message is Extract<AssistantMessage, { kind: "text" | "user" }> => message.kind === "text" || message.kind === "user")
      .slice(-5)
      .map((message) => ({
        role: message.role,
        text: message.kind === "user" ? message.text : message.text,
      }));

    try {
      const result = runAssistantQuery({
        query: queryForModel,
        route: pathname,
        profile,
        audience,
        corpus,
      });

      lastQueryRef.current = trimmedQuery;
      negativeFeedbackRef.current = false;
      const resultMessageId = createId("assistant");

      setMessages((current) => [
        ...current,
        {
          id: resultMessageId,
          role: "assistant",
          kind: "result",
          result,
          isEnhancing: true,
        },
      ]);

      setIsSubmitting(true);
      const generatedAnswer = await generateAssistantAnswer({
        query: queryForModel,
        route: pathname,
        profile,
        audience: result.audience,
        result,
        conversation: [...conversation, { role: "user", text: queryForModel }],
        anonymousSessionId: getAnonymousSessionId(),
        taskContext: taskContextRef.current,
      });

      setMessages((current) =>
        current.map((message) =>
          message.id === resultMessageId && message.kind === "result"
            ? {
                ...message,
                result: generatedAnswer
                  ? { ...message.result, answer: generatedAnswer.answer, citations: generatedAnswer.citations }
                  : { ...message.result, errorState: true, confidence: message.result.topLinks.length > 0 ? "high" : "low" },
                isEnhancing: false,
              }
            : message,
        ),
      );

      if (result.answerMode === "support_handoff") {
        setMessages((current) => [...current, {
          id: createId("assistant"), role: "assistant", kind: "text",
          text: "I could not resolve that confidently from approved site information. I can prepare a request for the team, and nothing will be sent until you review and confirm it.",
          quickActions: [{ type: "form", label: "Prepare a request", profile: user ? "portal_support" : "customer_support" }],
        }]);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [activeAudience, audienceOverride, corpus, messages, pathname, user]);

  const submitQuery = useCallback(async (queryValue?: string, profile?: AssistantProfile, audience?: AssistantAudience, attachments?: AssistantOutgoingAttachment[]) => {
    const formAnswer = (queryValue ?? currentQuery).trim();
    if (formState?.pendingField && formAnswer) {
      const completed = { ...formState, [formState.pendingField]: formAnswer };
      const pendingField = getNextFormField(completed);
      setCurrentQuery("");
      const userMessageId = createId("user");
      const assistantMessageId = createId("assistant");
      formMessageIdsRef.current.add(userMessageId);
      formMessageIdsRef.current.add(assistantMessageId);
      setMessages((current) => [...current, { id: userMessageId, role: "user", kind: "user", text: formAnswer }, {
        id: assistantMessageId, role: "assistant", kind: "text",
        text: pendingField ? getFormQuestion(pendingField, completed.kind) : `Here is the request I will send:\n\n${completed.kind === "quote_request" ? `**Customer:** ${completed.customerName}\n\n` : ""}${completed.kind === "pricelist_request" ? `**Business:** ${completed.businessName}\n**Role/type:** ${completed.requesterType}\n**Market:** ${completed.market}\n\n` : ""}${completed.kind === "portal_support" ? `**Topic:** ${completed.issueType}\n\n` : ""}${completed.summary}`,
        quickActions: pendingField ? undefined : [{ type: "submit_form", label: "Confirm & send" }, { type: "cancel_form", label: "Cancel" }],
      }]);
      setFormState({ ...completed, pendingField });
      return;
    }
    if (pendingWebSearchRef.current && formAnswer) {
      pendingWebSearchRef.current = false;
      // submitWebSearch is defined later in this component body, but by the time this
      // closure actually runs (a later user interaction) it is already assigned.
      await submitWebSearch(formAnswer);
      return;
    }
    if (audience) setAudienceOverride(audience);
    await submitQueryInternal(queryValue ?? currentQuery, profile ?? activeProfile, audience ?? activeAudience, attachments);
  }, [activeAudience, activeProfile, currentQuery, formState, submitQueryInternal]);

  const openAssistant = useCallback((options?: OpenAssistantOptions) => {
    setIsOpen(true);
    setNudge(null);
    if (messages.length === 0) {
      resetConversation();
    }
    const taskContext = options?.taskContext;
    taskContextRef.current = taskContext;
    const launchQuery = options?.query ?? (taskContext ? getAssistantLaunchPrompt(taskContext) : undefined);
    if (launchQuery) setCurrentQuery(launchQuery);
    if (options?.formKind) {
      const initial = createInitialFormState({ pathname, profile: options.profile ?? activeProfile, userName, userEmail, accountName });
      const next = { ...initial, kind: options.formKind, taskContext, ...options.formValues };
      const pendingField = undefined;
      setFormState({ ...next, pendingField });
      formMessageIdsRef.current = new Set();
    }
    if ((options?.autoSubmit || taskContext) && launchQuery) {
      window.setTimeout(() => {
        if (options.audience) setAudienceOverride(options.audience);
        void submitQueryInternal(launchQuery, options.profile ?? activeProfile, options.audience ?? activeAudience);
      }, 0);
    }
  }, [accountName, activeAudience, activeProfile, messages.length, pathname, resetConversation, submitQueryInternal, userEmail, userName]);

  const openDetachedWindow = useCallback(() => {
    try {
      window.sessionStorage.setItem(POPOUT_SNAPSHOT_KEY, JSON.stringify({
        messages,
        currentQuery,
        formState,
      }));
    } catch {
      // Ignore storage failures for pop-out handoff.
    }

    const popup = window.open(
      `${window.location.origin}/assistant/window`,
      "classic-visions-assistant",
      "popup=yes,width=460,height=760,resizable=yes,scrollbars=no",
    );

    if (popup) {
      popup.focus();
      return;
    }

    window.location.href = "/assistant/window";
  }, [currentQuery, formState, messages]);

  const submitWebSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsOpen(true);
    setNudge(null);
    setCurrentQuery("");

    setMessages((current) => [
      ...current,
      { id: createId("user"), role: "user", kind: "user", text: `🔍 ${trimmed}` },
    ]);

    setIsSubmitting(true);
    try {
      const conversation = messages
        .filter((m): m is Extract<AssistantMessage, { kind: "text" | "user" }> => m.kind === "text" || m.kind === "user")
        .slice(-4)
        .map((m) => ({ role: m.role, text: m.kind === "user" ? m.text : m.text }));

      const { data, error } = await supabase.functions.invoke("companion-web-search", {
        body: { query: trimmed, route: pathname, conversation },
      });

      const answer = !error && typeof data?.answer === "string" && data.answer.trim()
        ? data.answer.trim()
        : "I could not complete the web search right now. Please try again or contact support.";

      setMessages((current) => [
        ...current,
        {
          id: createId("assistant"),
          role: "assistant",
          kind: "text",
          text: answer,
          quickActions: [
            { type: "web_search", label: "Search again", query: trimmed },
            { type: "form", label: "Get support", profile: pathname.startsWith("/profile") ? "portal_support" : "customer_support" },
          ],
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }, [messages, pathname]);

  const handleLensGuideStep = useCallback((step: 1 | 2 | 3 | 4, answers: { audience?: AssistantAudience; useCase?: string; hasRx?: boolean }) => {
    setIsOpen(true);
    setNudge(null);

    if (step === 1) {
      setMessages((current) => [...current, {
        id: createId("assistant"), role: "assistant", kind: "text",
        text: "Let's find the right lens together. Who is this for?",
        quickActions: [
          { type: "lens_guide", label: "Myself", step: 2, answers: { audience: "patient" } },
          { type: "lens_guide", label: "A patient I'm dispensing for", step: 2, answers: { audience: "dispenser" } },
        ],
      }]);
      return;
    }

    if (step === 2) {
      setMessages((current) => [...current, {
        id: createId("assistant"), role: "assistant", kind: "text",
        text: "What will this lens mainly be used for?",
        quickActions: [
          { type: "lens_guide", label: "Everyday / general wear", step: 3, answers: { ...answers, useCase: "everyday" } },
          { type: "lens_guide", label: "Reading & close-up work", step: 3, answers: { ...answers, useCase: "reading" } },
          { type: "lens_guide", label: "Computer & screens", step: 3, answers: { ...answers, useCase: "screens" } },
          { type: "lens_guide", label: "Driving & outdoors", step: 3, answers: { ...answers, useCase: "driving" } },
        ],
      }]);
      return;
    }

    if (step === 3) {
      setMessages((current) => [...current, {
        id: createId("assistant"), role: "assistant", kind: "text",
        text: "Do you already have a current prescription?",
        quickActions: [
          { type: "lens_guide", label: "Yes, I have my Rx", step: 4, answers: { ...answers, hasRx: true } },
          { type: "lens_guide", label: "Not yet / not sure", step: 4, answers: { ...answers, hasRx: false } },
        ],
      }]);
      return;
    }

    const audience = answers.audience ?? "patient";
    const useCaseLabel = {
      everyday: "everyday, general wear",
      reading: "reading and close-up work",
      screens: "computer and screen use",
      driving: "driving and outdoor use",
    }[answers.useCase ?? "everyday"];
    const rxNote = answers.hasRx
      ? "Since you already have a prescription, the finder can match it directly against approved lens options."
      : "Since you don't have a prescription yet, the finder will show general option types you can review with your eye care professional.";

    setMessages((current) => [...current, {
      id: createId("assistant"), role: "assistant", kind: "text",
      text: `Got it — a lens mainly for ${useCaseLabel}. ${rxNote} Want me to open the lens finder now with that in mind?`,
      quickActions: [
        { type: "link", label: "Open the lens finder", href: `/lens-assistant?audience=${audience}` },
        { type: "query", label: "Ask something else instead", query: "Help me with something else." },
      ],
    }]);
  }, []);

  const submitQuickAction = useCallback((action: AssistantQuickAction) => {
    pendingWebSearchRef.current = false;

    if (action.type === "query") {
      void submitQuery(action.query, action.profile ?? activeProfile, action.audience);
      return;
    }

    if (action.type === "web_search") {
      void submitWebSearch(action.query);
      return;
    }

    if (action.type === "web_search_prompt") {
      setIsOpen(true);
      setNudge(null);
      pendingWebSearchRef.current = true;
      setMessages((current) => [...current, {
        id: createId("assistant"), role: "assistant", kind: "text",
        text: "What do you want to know? I'll search the web for it.",
      }]);
      return;
    }

    if (action.type === "lens_guide") {
      handleLensGuideStep(action.step, action.answers);
      return;
    }

    if (action.type === "form") {
      openForm(action.profile ?? activeProfile, action.kind ? { kind: action.kind } : undefined);
      return;
    }

    if (action.type === "submit_form") {
      void submitForm();
      return;
    }

    if (action.type === "cancel_form") {
      cancelForm();
      return;
    }

    if (action.type === "link") {
      if (action.external) {
        window.open(action.href, "_blank", "noopener,noreferrer");
      } else if (action.href.startsWith("#")) {
        document.querySelector(action.href)?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.location.href = action.href;
      }
    }
  }, [activeProfile, cancelForm, handleLensGuideStep, openForm, submitQuery, submitWebSearch]);

  const submitForm = useCallback(async () => {
    if (!formState) return;

    if (formState.kind === "trade_signup") {
      const fullName = formState.name.trim();
      const email = formState.email.trim();
      const password = formState.password.trim();
      const phone = formState.phone.trim();
      const businessName = formState.businessName.trim();
      const taxId = formState.taxId.trim();
      const country = formState.country.trim();
      if (!fullName || !email || password.length < 6 || !phone || !businessName || !taxId || !country) return;

      setIsSubmitting(true);
      try {
        const onboardingCompletedAt = new Date().toISOString();
        const { error } = await signUp(email, password, {
          fullName,
          phone,
          organizationName: businessName,
          audience: "professional",
          interestIntent: "products",
          onboardingCompletedAt,
        });

        if (error) {
          const alreadyRegistered = error.message.includes("User already registered");
          setMessages((current) => [...current, {
            id: createId("assistant"),
            role: "assistant",
            kind: "text",
            text: alreadyRegistered
              ? "This email is already registered. Sign in instead, or use a different email to create a new trade account."
              : `I could not create that account: ${error.message}`,
            quickActions: alreadyRegistered
              ? [{ type: "link", label: "Sign in instead", href: `/auth?mode=signin&redirect=${encodeURIComponent(pathname)}` }]
              : undefined,
          }]);
          return;
        }

        try {
          await submitPublicInquiry({
            inquiryType: "auth_onboarding_interest",
            name: fullName,
            email,
            phone,
            businessName,
            message: "Trade account created via the assistant.",
            notes: JSON.stringify({ audience: "professional", intent: "products", tax_id: taxId, country, onboarding_completed_at: onboardingCompletedAt }),
            pageSlug: `${pathname}${location.search}${location.hash}`,
            sourceChannel: "ai_assistant",
            honeypot: "",
            startedAt: formState.startedAt,
          });
        } catch {
          // Lead signal is best-effort — the account itself is already created.
        }

        setFormState(null);
        setMessages((current) => [
          ...current,
          {
            id: createId("assistant"),
            role: "assistant",
            kind: "confirmation",
            title: "Trade account created",
            text: `We sent a confirmation link to ${email}. Open it to activate your account — trade pricing and ordering unlock as soon as it is confirmed. You can keep browsing here in the meantime.`,
            quickActions: [
              { type: "link", label: "Browse the catalog", href: "/store" },
              { type: "link", label: "View knowledge hub", href: "/knowledge" },
              { type: "query", label: "Ask another question", query: "Help me find the best page for my next question." },
            ],
          },
        ]);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const summary = formState.summary.trim();
    const isQuoteRequest = formState.kind === "quote_request";
    const isPricelistRequest = formState.kind === "pricelist_request";
    const requestTitle = (isQuoteRequest ? (formState.requestTitle ?? "") : formState.issueType).trim();
    if ((!requestTitle) || (!isQuoteRequest && !summary) || (isQuoteRequest && !user) || (!isQuoteRequest && (!formState.name.trim() || !formState.email.trim())) || (isPricelistRequest && (!formState.businessName.trim() || !formState.market.trim() || !isPricelistRequesterEligible(formState.requesterType)))) return;
    const requestDetails = isQuoteRequest ? [requestTitle, summary].filter(Boolean).join("\n\n") : summary;

    setIsSubmitting(true);
    try {
      const resultSummary = messages
        .filter((message): message is Extract<AssistantMessage, { kind: "result" }> => message.kind === "result")
        .slice(-1)
        .map((message) => ({
          query: message.result.query,
          links: (message.result.citations ?? message.result.topLinks).map((link) => ({ title: link.title, path: link.path })),
          audience: message.result.audience,
          confidence: message.result.confidence,
          answerMode: message.result.answerMode,
        }));

      const contextNotes = {
        route: `${pathname}${location.search}${location.hash}`,
        assistantProfile: activeProfile,
        audience: activeAudience,
        accountAccessStatus: identity?.portalAccessStatus ?? null,
        accountCustomer: identity?.customerName ?? identity?.organizationName ?? null,
        market: formState.market,
        issueType: formState.issueType,
        requestTitle,
        productTopic: formState.productTopic,
        taskContext: formState.taskContext ?? null,
        previousResults: resultSummary,
      };

      let portalTicketId: string | null = null;
      let quoteNumber: string | null = null;
      if (isQuoteRequest && user) {
        const { data, error } = await (supabase.rpc as any)("submit_customer_quote_request", {
          p_customer_name: formState.customerName.trim() || accountName || "Signed-in customer",
          p_request_details: requestDetails,
          p_account_id: identity?.crmCustomerId ?? null,
        });
        if (error) throw error;
        const result = Array.isArray(data) ? data[0] : data;
        portalTicketId = result?.ticket_id ?? null;
        quoteNumber = result?.quote_number ?? null;
      } else if (formState.kind === "portal_support" && user) {
        portalTicketId = await createTicket.mutateAsync({
          title: formState.issueType.trim() || "Portal assistant support request",
          description: `${requestDetails}\n\nAssistant context:\n${JSON.stringify(contextNotes, null, 2)}`,
          partnerContactId: identity?.crmContactId ?? null,
          ownerUserId: user.id,
          priority: 1,
          sourceChannel: "ai_assistant",
        });
      } else {
        const message = [
          requestDetails,
          "",
          formState.market ? `Market: ${formState.market}` : null,
          formState.issueType ? `Issue type: ${formState.issueType}` : null,
          formState.productTopic ? `Product/topic: ${formState.productTopic}` : null,
          `Assistant context: ${JSON.stringify(contextNotes)}`,
        ].filter(Boolean).join("\n");

        await submitPublicInquiry({
          inquiryType: isPricelistRequest ? "price_list" : "assistant_request",
          name: formState.name.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim() || null,
          businessName: formState.businessName.trim() || null,
          message,
          pageSlug: `${pathname}${location.search}${location.hash}`,
          sourceChannel: "ai_assistant",
          honeypot: "",
          startedAt: formState.startedAt,
        });
      }

      setFormState(null);
      setMessages((current) => [
        ...current,
        {
          id: createId("assistant"),
          role: "assistant",
          kind: "confirmation",
          title: isQuoteRequest ? "Quote request sent" : isPricelistRequest ? "Price-list request sent" : "Request sent",
          text: isQuoteRequest
            ? `Your quote request${quoteNumber ? ` ${quoteNumber}` : ""} is now linked to a live Helpdesk conversation for corrections, questions, and replies.`
            : isPricelistRequest
            ? "Your approved price-list request was sent to Russell and added to the CRM for follow-up."
            : formState.kind === "portal_support"
            ? "Your request is now a live Helpdesk conversation with your portal context attached. Opening it now so the team can reply here."
            : "Your request was submitted with the current page and assistant context attached. You can keep chatting here, or open one of the source links above while the team follows up.",
          quickActions: pathname.startsWith("/profile")
            ? [
                { type: "link", label: "Open live conversation", href: portalTicketId ? `/profile/helpdesk/${portalTicketId}` : "/profile/helpdesk" },
                { type: "link", label: "View orders", href: "/profile/orders" },
                { type: "query", label: "Ask another question", query: "Help me with something else in my account.", profile: "portal_support" },
              ]
            : [
                { type: "link", label: "Open contact section", href: "/#contact" },
                ...(user ? [] : [{ type: "query" as const, label: "Find a retailer", query: "Help me find a retailer.", profile: "retailer_help" as const }]),
                { type: "query", label: "Ask another question", query: "Help me find the best page for my next question." },
              ],
        },
      ]);

      if (portalTicketId) {
        setIsOpen(false);
        navigate(`/profile/helpdesk/${portalTicketId}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [accountName, activeAudience, activeProfile, createTicket, formState, identity?.crmContactId, identity?.crmCustomerId, location.hash, location.search, messages, navigate, pathname, signUp, user]);

  const loadConversation = useCallback(async (conversationId: string) => {
    const { data, error } = await (supabase as any)
      .from("assistant_messages")
      .select("id,role,content,metadata,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    setMessages((data ?? []).map((row: any) => row.role === "user"
      ? { id: row.id, role: "user", kind: "user", text: row.content }
      : { id: row.id, role: "assistant", kind: "text", text: row.content }) as AssistantMessage[]);
    setFormState(null);
    setCurrentQuery("");
    setIsOpen(true);
  }, []);

  const value = useMemo<CompanionAssistantContextValue>(() => ({
    isOpen,
    isDetachedRoute,
    messages,
    activeProfile,
    activeAudience,
    setActiveAudience: setAudienceOverride,
    currentQuery,
    setCurrentQuery,
    openAssistant,
    closeAssistant,
    submitQuery,
    submitQuickAction,
    markFeedback,
    startNewConversation,
    saveConversation,
    loadConversation,
    isSavingConversation,
    nudge,
    dismissNudge,
    snoozeNudge,
    isSubmitting,
    openDetachedWindow,
    formState,
    openForm,
    closeForm,
    cancelForm,
    updateForm,
    submitForm,
  }), [
    activeProfile,
    activeAudience,
    cancelForm,
    closeAssistant,
    currentQuery,
    dismissNudge,
    snoozeNudge,
    formState,
    isOpen,
    isDetachedRoute,
    isSubmitting,
    isSavingConversation,
    markFeedback,
    messages,
    nudge,
    openAssistant,
    openDetachedWindow,
    closeForm,
    openForm,
    submitForm,
    submitQuickAction,
    submitQuery,
    saveConversation,
    loadConversation,
    setAudienceOverride,
    startNewConversation,
    updateForm,
  ]);

  return (
    <CompanionAssistantContext.Provider value={value}>
      {children}
    </CompanionAssistantContext.Provider>
  );
};

export const useCompanionAssistant = () => {
  const context = useContext(CompanionAssistantContext);
  if (!context) {
    throw new Error("useCompanionAssistant must be used within CompanionAssistantProvider");
  }
  return context;
};

export const useRetailerAssistantPrompt = () => {
  const { openAssistant } = useCompanionAssistant();

  return useCallback((options: Parameters<typeof buildRetailerPrompt>[0]) => {
    const query = buildRetailerPrompt(options);
    openAssistant({ query, autoSubmit: true, profile: "retailer_help" });
  }, [openAssistant]);
};
