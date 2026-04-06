import { createContext } from "react";
import type { AssistantProfile, AssistantQueryResult } from "./companionAssistantEngine";

export type AssistantQuickAction =
  | { type: "query"; label: string; query: string; profile?: AssistantProfile }
  | { type: "form"; label: string; profile?: AssistantProfile }
  | { type: "link"; label: string; href: string; external?: boolean };

export type AssistantMessage =
  | {
      id: string;
      role: "assistant";
      kind: "text";
      text: string;
      quickActions?: AssistantQuickAction[];
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
    }
  | {
      id: string;
      role: "user";
      kind: "user";
      text: string;
    };

export type AssistantFormKind = "retailer_help" | "product_help" | "customer_support" | "portal_support";

export interface AssistantFormState {
  kind: AssistantFormKind;
  startedAt: string;
  name: string;
  email: string;
  phone: string;
  market: string;
  issueType: string;
  productTopic: string;
  summary: string;
}

export type OpenAssistantOptions = {
  query?: string;
  autoSubmit?: boolean;
  profile?: AssistantProfile;
};

export interface CompanionAssistantContextValue {
  isOpen: boolean;
  isDetachedRoute: boolean;
  messages: AssistantMessage[];
  activeProfile: AssistantProfile;
  currentQuery: string;
  setCurrentQuery: (value: string) => void;
  openAssistant: (options?: OpenAssistantOptions) => void;
  closeAssistant: () => void;
  submitQuery: (query?: string, profile?: AssistantProfile) => Promise<void>;
  submitQuickAction: (action: AssistantQuickAction) => void;
  markFeedback: (messageId: string, feedback: "helpful" | "not_helpful") => void;
  nudge: { message: string; query?: string } | null;
  dismissNudge: () => void;
  isSubmitting: boolean;
  openDetachedWindow: () => void;
  formState: AssistantFormState | null;
  openForm: (profile?: AssistantProfile) => void;
  closeForm: () => void;
  updateForm: (patch: Partial<AssistantFormState>) => void;
  submitForm: () => Promise<void>;
}

export const CompanionAssistantContext = createContext<CompanionAssistantContextValue | undefined>(undefined);