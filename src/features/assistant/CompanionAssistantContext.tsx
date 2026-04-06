import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { usePublicKnowledge } from "@/hooks/useContentArticles";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { resolveUserFullName } from "@/lib/profileData";
import { useCreateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket";
import { generateAssistantAnswer } from "./assistantGeneration";
import {
  buildAssistantCorpus,
  buildRetailerPrompt,
  runAssistantQuery,
  shouldAskClarifier,
  type AssistantProfile,
} from "./companionAssistantEngine";
import {
  type AssistantFormKind,
  CompanionAssistantContext,
  type AssistantFormState,
  type AssistantMessage,
  type AssistantQuickAction,
  type CompanionAssistantContextValue,
  type OpenAssistantOptions,
} from "./CompanionAssistantContext.shared";

export type {
  AssistantFormKind,
  AssistantFormState,
  AssistantMessage,
  AssistantQuickAction,
  CompanionAssistantContextValue,
  OpenAssistantOptions,
} from "./CompanionAssistantContext.shared";

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const POPOUT_SNAPSHOT_KEY = "companion-assistant-popout";

const getProfileForRoute = (pathname: string): AssistantProfile => {
  if (pathname.startsWith("/profile")) return "portal_support";
  if (pathname.startsWith("/find-a-retailer")) return "retailer_help";
  return "general_search";
};

const getStarterActions = (pathname: string): AssistantQuickAction[] =>
  pathname.startsWith("/profile")
    ? [
        { type: "query", label: "Find a retailer", query: "Help me find a retailer in the Caribbean.", profile: "retailer_help" },
        { type: "query", label: "Compare lenses", query: "Help me compare lens options for different routines." },
        { type: "form", label: "Get support", profile: "portal_support" },
        { type: "link", label: "Track an order", href: "/profile/orders" },
      ]
    : [
        { type: "query", label: "Find a retailer", query: "Help me find a retailer in Barbados or across the Caribbean.", profile: "retailer_help" },
        { type: "query", label: "Compare lenses", query: "Help me compare Classic Visions lens options." },
        { type: "form", label: "Get support", profile: "customer_support" },
        { type: "link", label: "Contact us", href: "/#contact" },
      ];

const isKeyPage = (pathname: string) =>
  pathname.startsWith("/find-a-retailer") ||
  pathname.startsWith("/knowledge") ||
  pathname.startsWith("/lenses") ||
  pathname.startsWith("/coatings") ||
  pathname.startsWith("/profile");

const getRouteNudge = (pathname: string) => {
  if (pathname.startsWith("/find-a-retailer")) {
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
}: {
  pathname: string;
  profile: AssistantProfile;
  userName: string;
  userEmail: string;
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
    market: pathname.startsWith("/find-a-retailer/barbados") ? "Barbados" : "",
    issueType: "",
    productTopic: "",
    summary: "",
  };
};

export const CompanionAssistantProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const pathname = location.pathname;
  const isDetachedRoute = pathname === "/assistant/window";
  const { user } = useAuth();
  const { identity } = usePortalIdentity();
  const { data: products = [] } = useStoreProducts();
  const { data: knowledge = [] } = usePublicKnowledge();
  const createTicket = useCreateHelpdeskTicket();

  const userName = resolveUserFullName(user) || "";
  const userEmail = user?.email?.trim() || "";
  const activeProfile = getProfileForRoute(pathname);
  const starterActions = useMemo(() => getStarterActions(pathname), [pathname]);
  const corpus = useMemo(() => buildAssistantCorpus({ products, knowledge }), [products, knowledge]);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nudge, setNudge] = useState<{ message: string; query?: string } | null>(null);
  const [formState, setFormState] = useState<AssistantFormState | null>(null);
  const lastQueryRef = useRef<string | null>(null);
  const negativeFeedbackRef = useRef(false);
  const nudgeTimerRef = useRef<number | null>(null);
  const hasRestoredPopoutRef = useRef(false);

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
        setFormState(snapshot.formState);
      }
      setIsOpen(true);
    } catch {
      setIsOpen(true);
    }
  }, [isDetachedRoute]);

  useEffect(() => {
    if (isOpen) return;
    if (!isKeyPage(pathname)) return;

    const routeNudge = getRouteNudge(pathname);
    if (!routeNudge) return;

    if (nudgeTimerRef.current) window.clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = window.setTimeout(() => setNudge(routeNudge), 1800);

    return () => {
      if (nudgeTimerRef.current) {
        window.clearTimeout(nudgeTimerRef.current);
        nudgeTimerRef.current = null;
      }
    };
  }, [isOpen, pathname]);

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

  const dismissNudge = useCallback(() => setNudge(null), []);

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

  const openForm = useCallback((profile?: AssistantProfile) => {
    setIsOpen(true);
    setNudge(null);
    setFormState(createInitialFormState({
      pathname,
      profile: profile ?? activeProfile,
      userName,
      userEmail,
    }));
  }, [activeProfile, pathname, userEmail, userName]);

  const closeForm = useCallback(() => setFormState(null), []);

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
      // Ignore storage issues. Feedback is best-effort on the client until a
      // server-side analytics sink is introduced.
    }
  }, []);

  const markFeedback = useCallback((messageId: string, feedback: "helpful" | "not_helpful") => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId && message.kind === "result" ? { ...message, feedback } : message,
      ),
    );

    const resultMessage = messages.find((message) => message.id === messageId && message.kind === "result");
    if (!resultMessage || resultMessage.kind !== "result") return;

    persistFeedback({
      messageId,
      feedback,
      query: resultMessage.result.query,
      route: pathname,
      profile: resultMessage.result.profile,
      at: new Date().toISOString(),
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
  }, [messages, pathname, persistFeedback]);

  const submitQueryInternal = useCallback(async (queryValue: string, profile: AssistantProfile) => {
    const trimmedQuery = queryValue.trim();
    if (!trimmedQuery) return;

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
      },
    ]);

    if (repeatedUnsatisfied) {
      setMessages((current) => [
        ...current,
        {
          id: createId("assistant"),
          role: "assistant",
          kind: "text",
          text: "Before I change paths, what are you trying to do most right now: find a retailer, compare products, or get direct support?",
          quickActions: [
            { type: "query", label: "Find a retailer", query: "Help me find a retailer or clinic.", profile: "retailer_help" },
            { type: "query", label: "Compare products", query: "Help me compare lens or coating options." },
            { type: "form", label: "Get direct support", profile: pathname.startsWith("/profile") ? "portal_support" : "customer_support" },
          ],
        },
      ]);
      return;
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
        query: trimmedQuery,
        route: pathname,
        profile,
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
        query: trimmedQuery,
        route: pathname,
        profile,
        result,
        conversation: [...conversation, { role: "user", text: trimmedQuery }],
      });

      setMessages((current) =>
        current.map((message) =>
          message.id === resultMessageId && message.kind === "result"
            ? {
                ...message,
                result: generatedAnswer
                  ? { ...message.result, answer: generatedAnswer }
                  : message.result,
                isEnhancing: false,
              }
            : message,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [corpus, messages, pathname]);

  const submitQuery = useCallback(async (queryValue?: string, profile?: AssistantProfile) => {
    await submitQueryInternal(queryValue ?? currentQuery, profile ?? activeProfile);
  }, [activeProfile, currentQuery, submitQueryInternal]);

  const openAssistant = useCallback((options?: OpenAssistantOptions) => {
    setIsOpen(true);
    setNudge(null);
    if (messages.length === 0) {
      resetConversation();
    }
    if (options?.query) {
      setCurrentQuery(options.query);
    }
    if (options?.autoSubmit && options.query) {
      window.setTimeout(() => {
        void submitQueryInternal(options.query!, options.profile ?? activeProfile);
      }, 0);
    }
  }, [activeProfile, messages.length, resetConversation, submitQueryInternal]);

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

  const submitQuickAction = useCallback((action: AssistantQuickAction) => {
    if (action.type === "query") {
      void submitQuery(action.query, action.profile ?? activeProfile);
      return;
    }

    if (action.type === "form") {
      openForm(action.profile ?? activeProfile);
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
  }, [activeProfile, openForm, submitQuery]);

  const submitForm = useCallback(async () => {
    if (!formState) return;

    const summary = formState.summary.trim();
    if (!summary || !formState.name.trim() || !formState.email.trim()) return;

    setIsSubmitting(true);
    try {
      const resultSummary = messages
        .filter((message): message is Extract<AssistantMessage, { kind: "result" }> => message.kind === "result")
        .slice(-1)
        .map((message) => ({
          query: message.result.query,
          links: message.result.topLinks.map((link) => ({ title: link.title, path: link.path })),
        }));

      const contextNotes = {
        route: `${pathname}${location.search}${location.hash}`,
        assistantProfile: activeProfile,
        market: formState.market,
        issueType: formState.issueType,
        productTopic: formState.productTopic,
        previousResults: resultSummary,
      };

      if (formState.kind === "portal_support" && user) {
        await createTicket.mutateAsync({
          title: formState.issueType.trim() || "Portal assistant support request",
          description: `${summary}\n\nAssistant context:\n${JSON.stringify(contextNotes, null, 2)}`,
          partnerContactId: identity?.crmContactId ?? null,
          ownerUserId: user.id,
          priority: 1,
          sourceChannel: "ai_assistant",
        });
      } else {
        const message = [
          summary,
          "",
          formState.market ? `Market: ${formState.market}` : null,
          formState.issueType ? `Issue type: ${formState.issueType}` : null,
          formState.productTopic ? `Product/topic: ${formState.productTopic}` : null,
          `Assistant context: ${JSON.stringify(contextNotes)}`,
        ].filter(Boolean).join("\n");

        const { error } = await supabase.functions.invoke("contact-inquiry", {
          body: {
            inquiryType: "assistant_request",
            name: formState.name.trim(),
            email: formState.email.trim(),
            phone: formState.phone.trim() || null,
            message,
            pageSlug: `${pathname}${location.search}${location.hash}`,
            sourceChannel: "ai_assistant",
            honeypot: "",
            startedAt: formState.startedAt,
          },
        });

        if (error) throw error;
      }

      setFormState(null);
      setMessages((current) => [
        ...current,
        {
          id: createId("assistant"),
          role: "assistant",
          kind: "confirmation",
          title: "Request sent",
          text: formState.kind === "portal_support"
            ? "Your request was submitted with your portal context attached. You can keep chatting here, or jump back to your helpdesk and orders if you want to continue self-service."
            : "Your request was submitted with the current page and assistant context attached. You can keep chatting here, or open one of the source links above while the team follows up.",
          quickActions: pathname.startsWith("/profile")
            ? [
                { type: "link", label: "Open helpdesk", href: "/profile/helpdesk" },
                { type: "link", label: "View orders", href: "/profile/orders" },
                { type: "query", label: "Ask another question", query: "Help me with something else in my account.", profile: "portal_support" },
              ]
            : [
                { type: "link", label: "Open contact section", href: "/#contact" },
                { type: "query", label: "Find a retailer", query: "Help me find a retailer.", profile: "retailer_help" },
                { type: "query", label: "Ask another question", query: "Help me find the best page for my next question." },
              ],
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }, [activeProfile, createTicket, formState, identity?.crmContactId, location.hash, location.search, messages, pathname, user]);

  const value = useMemo<CompanionAssistantContextValue>(() => ({
    isOpen,
    isDetachedRoute,
    messages,
    activeProfile,
    currentQuery,
    setCurrentQuery,
    openAssistant,
    closeAssistant,
    submitQuery,
    submitQuickAction,
    markFeedback,
    nudge,
    dismissNudge,
    isSubmitting,
    openDetachedWindow,
    formState,
    openForm,
    closeForm,
    updateForm,
    submitForm,
  }), [
    activeProfile,
    closeAssistant,
    currentQuery,
    dismissNudge,
    formState,
    isOpen,
    isDetachedRoute,
    isSubmitting,
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
