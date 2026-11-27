import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import { ConnectionNotice } from "@/components/public-states/ConnectionNotice";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { COMPANY_CONTACT } from "@/config/companyContact";

/** A conversational entry point; submission remains owned by the assistant's confirmed handoff. */
const ContactForm = () => {
  const { openAssistant } = useCompanionAssistant();
  const online = useOnlineStatus();

  return (
    <section id="contact" className="scroll-mt-24 bg-muted/30 py-16 sm:py-20" aria-label="Contact our team">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-elegant">
          <MessageCircle className="mx-auto mb-4 h-9 w-9 text-primary" aria-hidden="true" />
          <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">Contact Our Team</h2>
          <p className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg">
            Start with the live assistant. It can answer right away, collect only the details we need, and lets you review your request before you send it.
          </p>
          <div className="mt-6"><ConnectionNotice description="The assistant needs a connection. You can call our team using the number below." /></div>
          <Button className="mt-6" size="lg" disabled={!online} onClick={() => openAssistant({ formKind: "customer_support" })}>
            <MessageCircle className="mr-2 h-4 w-4" /> Chat with our team
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">Prefer to call? <a className="inline-flex min-h-11 items-center rounded font-medium text-foreground underline underline-offset-4" href={COMPANY_CONTACT.phoneHref}>{COMPANY_CONTACT.phoneDisplay}</a></p>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
