import { useEffect } from "react";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";

const CompanionAssistantWindowPage = () => {
  const { isOpen, openAssistant } = useCompanionAssistant();

  useEffect(() => {
    if (!isOpen) {
      openAssistant();
    }
  }, [isOpen, openAssistant]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_28%),linear-gradient(180deg,#020617,#08111f)]" />
  );
};

export default CompanionAssistantWindowPage;
