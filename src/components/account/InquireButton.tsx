import { createContext, useContext } from "react";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";

// Staff views (e.g. the admin contact editor) provide a handler here so the
// same life-buoy icon raises an internal helpdesk ticket instead of opening
// the customer's support assistant.
export const InquireHandlerContext = createContext<((title: string, description: string) => void) | null>(null);

interface InquireButtonProps {
  title: string;
  description: string;
  label?: string;
  className?: string;
}

const InquireIconButton = ({ label, className, onInquire }: { label: string; className?: string; onInquire: () => void }) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className={className ?? "h-8 w-8 shrink-0"}
    title={label}
    aria-label={label}
    onClick={(event) => {
      event.stopPropagation();
      onInquire();
    }}
  >
    <LifeBuoy className="h-4 w-4" />
  </Button>
);

// Admin routes render outside CompanionAssistantProvider, so the assistant
// hook is only called when no staff handler is provided.
const AssistantInquireButton = ({ title, description, label = "Ask about this", className }: InquireButtonProps) => {
  const { openAssistant } = useCompanionAssistant();
  return (
    <InquireIconButton
      label={label}
      className={className}
      onInquire={() => openAssistant({ formKind: "portal_support", formValues: { issueType: title, summary: description } })}
    />
  );
};

const InquireButton = (props: InquireButtonProps) => {
  const inquireHandler = useContext(InquireHandlerContext);
  if (!inquireHandler) return <AssistantInquireButton {...props} />;
  return <InquireIconButton label={props.label ?? "Ask about this"} className={props.className} onInquire={() => inquireHandler(props.title, props.description)} />;
};

export default InquireButton;
