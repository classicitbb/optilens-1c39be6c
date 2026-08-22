import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";

interface InquireButtonProps {
  title: string;
  description: string;
  label?: string;
  className?: string;
}

const InquireButton = ({ title, description, label = "Ask about this", className }: InquireButtonProps) => {
  const { openAssistant } = useCompanionAssistant();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className ?? "h-8 w-8 shrink-0"}
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        openAssistant({
          formKind: "portal_support",
          formValues: { issueType: title, summary: description },
        });
      }}
    >
      <LifeBuoy className="h-4 w-4" />
    </Button>
  );
};

export default InquireButton;
