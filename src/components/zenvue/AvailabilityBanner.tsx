import { Package, Clock } from "lucide-react";

const AvailabilityBanner = () => {
  return (
    <section className="border-b border-border bg-muted/50">
      <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 py-4 sm:flex-row sm:gap-8 lg:px-8">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Package className="h-4 w-4 text-accent" />
          All lenses available as finished stock
        </div>
        <div className="hidden h-4 w-px bg-border sm:block" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Semi-finished coming soon
        </div>
      </div>
    </section>
  );
};

export default AvailabilityBanner;
