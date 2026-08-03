import { Glasses } from "lucide-react";
import { LensAssistantForm } from "@/features/lens-assistant/LensAssistantForm";

const LensAssistantSection = () => (
  <section className="space-y-6">
    <header className="space-y-1">
      <h2 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
        <Glasses className="h-6 w-6" /> Lens Assistant
      </h2>
      <p className="text-sm text-muted-foreground">
        Enter prescription, frame and lifestyle details to see approved Classic Visions catalogue options.
      </p>
    </header>
    <LensAssistantForm />
  </section>
);

export default LensAssistantSection;
