import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";

/** A conversational entry point; submission remains owned by the assistant's confirmed handoff. */
const ContactForm = () => {
  const { openAssistant } = useCompanionAssistant();

  return (
    <section id="contact" className="bg-muted/30 py-16 sm:py-20" aria-label="Contact our team">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-elegant">
          <MessageCircle className="mx-auto mb-4 h-9 w-9 text-primary" aria-hidden="true" />
          <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">Contact Our Team</h2>
          <p className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg">
            Start with the live assistant. It can answer right away, collect only the details the team needs, and lets you review your request before it is sent.
          </p>
          <Button className="mt-6" size="lg" onClick={() => openAssistant({ formKind: "customer_support" })}>
            <MessageCircle className="mr-2 h-4 w-4" /> Chat with our team
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
