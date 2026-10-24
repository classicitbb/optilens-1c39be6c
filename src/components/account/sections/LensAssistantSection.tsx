import { ClipboardCheck } from "lucide-react";
import PortalRxOrderForm from "@/features/rx-order/PortalRxOrderForm";

const LensAssistantSection = () => (
  <section className="flex min-h-0 flex-1 flex-col gap-6">
    <header className="shrink-0 space-y-1">
      <h2 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
        <ClipboardCheck className="h-6 w-6" /> Rx Order Form
      </h2>
    </header>
    <PortalRxOrderForm />
  </section>
);

export default LensAssistantSection;
