import { createContext } from "react";
import type { AssistantAnswerMode, AssistantAudience, AssistantProfile, AssistantQueryResult } from "./companionAssistantEngine";

export type AssistantQuickAction =
  | { type: "query"; label: string; query: string; profile?: AssistantProfile; audience?: AssistantAudience }
  | { type: "web_search"; label: string; query: string }
  | { type: "form"; label: string; profile?: AssistantProfile }
  | { type: "submit_form"; label: string }
  | { type: "cancel_form"; label: string }
  | { type: "link"; label: string; href: string; external?: boolean };

export type AssistantMessage =
  | {
      id: string;
      role: "assistant";
      kind: "text";
      text: string;
      quickActions?: AssistantQuickAction[];
      feedback?: "helpful" | "not_helpful";
    }
  | {
      id: string;
      role: "assistant";
      kind: "result";
      result: AssistantQueryResult;
      isEnhancing?: boolean;
      feedback?: "helpful" | "not_helpful";
    }
  | {
      id: string;
      role: "assistant";
      kind: "confirmation";
      title: string;
      text: string;
      quickActions?: AssistantQuickAction[];
      feedback?: "helpful" | "not_helpful";
    }
  | {
      id: string;
      role: "user";
      kind: "user";
      text: string;
    };

export type AssistantFormKind = "retailer_help" | "product_help" | "customer_support" | "portal_support" | "quote_request" | "pricelist_request";

export type AssistantTaskKind = "contact" | "support" | "quote" | "policy_help";

export interface AssistantTaskContext {
  kind: AssistantTaskKind;
  label: string;
  sourceRoute: string;
}

export interface AssistantFormState {
  kind: AssistantFormKind;
  startedAt: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  requesterType: string;
  market: string;
  issueType: string;
  productTopic: string;
  customerName: string;
  summary: string;
  taskContext?: AssistantTaskContext;
  pendingField?: "name" | "email" | "businessName" | "requesterType" | "market" | "issueType" | "customerName" | "summary";
}

export type OpenAssistantOptions = {
  query?: string;
  autoSubmit?: boolean;
  profile?: AssistantProfile;
  audience?: AssistantAudience;
  formKind?: AssistantFormKind;
  formValues?: Partial<AssistantFormState>;
  taskContext?: AssistantTaskContext;
};

export interface CompanionAssistantContextValue {
  isOpen: boolean;
  isDetachedRoute: boolean;
  messages: AssistantMessage[];
  activeProfile: AssistantProfile;
  activeAudience: AssistantAudience;
  setActiveAudience: (audience: AssistantAudience) => void;
  currentQuery: string;
  setCurrentQuery: (value: string) => void;
  openAssistant: (options?: OpenAssistantOptions) => void;
  closeAssistant: () => void;
  submitQuery: (query?: string, profile?: AssistantProfile, audience?: AssistantAudience) => Promise<void>;
  submitQuickAction: (action: AssistantQuickAction) => void;
  markFeedback: (messageId: string, feedback: "helpful" | "not_helpful") => void;
  saveConversation: () => Promise<void>;
  isSavingConversation: boolean;
  nudge: { message: string; query?: string } | null;
  dismissNudge: () => void;
  isSubmitting: boolean;
  openDetachedWindow: () => void;
  formState: AssistantFormState | null;
  openForm: (profile?: AssistantProfile, options?: { kind?: AssistantFormKind; values?: Partial<AssistantFormState> }) => void;
  closeForm: () => void;
  updateForm: (patch: Partial<AssistantFormState>) => void;
  submitForm: () => Promise<void>;
}

export const CompanionAssistantContext = createContext<CompanionAssistantContextValue | undefined>(undefined);
