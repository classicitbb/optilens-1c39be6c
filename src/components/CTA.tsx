import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { ArrowRight, MapPin, Phone } from "lucide-react";

const CTA = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-primary py-16 sm:py-24" aria-label="Call to action">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 text-center lg:px-8">
        <h2 className="mb-4 text-2xl font-bold text-primary-foreground sm:text-3xl md:text-4xl lg:text-5xl">
          Your clearest next step is right here.
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-base text-primary-foreground/80 sm:text-lg">
          Order for your practice, find a trusted optical retailer, or talk with our Barbados team. We’ll help you move forward with confidence.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Button 
            size="lg" 
            className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-medium"
            asChild
          >
            <Link to="/store" className="group">
              Order for my practice
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </Button>
          <Button 
            size="lg" 
            variant="ghost"
            className="border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            asChild
          >
            <Link to="/find-a-retailer">
              <MapPin className="h-5 w-5" aria-hidden="true" />
              Find an optical retailer
            </Link>
          </Button>
        </div>
        <a href="tel:+12464334928" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-foreground/80 underline-offset-4 hover:text-primary-foreground hover:underline">
          <Phone className="h-4 w-4" aria-hidden="true" /> Prefer to speak with us? Call +1 246 433-4928
        </a>
      </div>
    </section>
  );
};

export default CTA;
