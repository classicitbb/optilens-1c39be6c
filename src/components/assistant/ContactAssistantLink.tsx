import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import type { AssistantFormKind, AssistantTaskKind } from "@/features/assistant/CompanionAssistantContext.shared";

interface ContactAssistantLinkProps {
  topic: string;
  sourceRoute: string;
  summary?: string;
  formKind?: AssistantFormKind;
  taskKind?: AssistantTaskKind;
  className?: string;
  children: React.ReactNode;
}

/** Inline text call-to-action that opens the Companion Assistant with context prefilled. */
const ContactAssistantLink = ({
  topic,
  sourceRoute,
  summary,
  formKind = "customer_support",
  taskKind = "contact",
  className,
  children,
}: ContactAssistantLinkProps) => {
  const { openAssistant } = useCompanionAssistant();

  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        openAssistant({
          formKind,
          formValues: {
            issueType: `${topic} enquiry`,
            productTopic: topic,
            requestTitle: `${topic} enquiry`,
            summary: summary ?? `I would like more information about ${topic}.`,
          },
          taskContext: { kind: taskKind, label: topic, sourceRoute },
        })
      }
    >
      {children}
    </button>
  );
};

export default ContactAssistantLink;
