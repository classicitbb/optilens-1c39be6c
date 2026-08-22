import { ClipboardCheck } from "lucide-react";
import PortalRxOrderForm from "@/features/rx-order/PortalRxOrderForm";

const LensAssistantSection = () => (
  <section className="space-y-6">
    <header className="space-y-1">
      <h2 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
        <ClipboardCheck className="h-6 w-6" /> Rx Order Form
      </h2>
      <p className="text-sm text-muted-foreground">
        Enter the prescription, frame and patient details to prepare an Rx order.
      </p>
    </header>
    <PortalRxOrderForm />
  </section>
);

export default LensAssistantSection;
