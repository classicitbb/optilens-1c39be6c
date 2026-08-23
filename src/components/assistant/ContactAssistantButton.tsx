import { Button, type ButtonProps } from "@/components/ui/button";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import type { AssistantAudience } from "@/features/assistant/companionAssistantEngine";
import type { AssistantFormKind, AssistantTaskKind } from "@/features/assistant/CompanionAssistantContext.shared";

interface ContactAssistantButtonProps extends Omit<ButtonProps, "onClick" | "asChild"> {
  /** Human readable topic, e.g. "Progressive Lenses". Used to prefill the assistant form. */
  topic: string;
  /** Route the visitor is contacting us from. */
  sourceRoute: string;
  /** Optional longer message prefilled into the summary field. */
  summary?: string;
  audience?: AssistantAudience;
  formKind?: AssistantFormKind;
  taskKind?: AssistantTaskKind;
  children?: React.ReactNode;
}

/**
 * Standard contact / inquiry call-to-action. Opens the Companion Assistant
 * directly with the page context prefilled instead of navigating to a form page.
 */
const ContactAssistantButton = ({
  topic,
  sourceRoute,
  summary,
  audience,
  formKind = "customer_support",
  taskKind = "contact",
  children = "Contact Us",
  ...buttonProps
}: ContactAssistantButtonProps) => {
  const { openAssistant } = useCompanionAssistant();

  const handleClick = () => {
    openAssistant({
      formKind,
      audience,
      formValues: {
        issueType: `${topic} enquiry`,
        productTopic: topic,
        requestTitle: `${topic} enquiry`,
        summary: summary ?? `I would like more information about ${topic}.`,
      },
      taskContext: { kind: taskKind, label: topic, sourceRoute },
    });
  };

  return (
    <Button type="button" onClick={handleClick} {...buttonProps}>
      {children}
    </Button>
  );
};

export default ContactAssistantButton;
