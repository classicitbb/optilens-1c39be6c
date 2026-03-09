import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";

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
          Ready to Partner with Us?
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-base text-primary-foreground/80 sm:text-lg">
          Join hundreds of optical professionals who trust OptiLens Pro for their 
          prescription lens needs. Get started today.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Button 
            size="lg" 
            className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-medium"
            asChild
          >
            <Link to="/store" className="group">
              Start Ordering
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </Button>
          <Button 
            size="lg" 
            variant="ghost"
            className="border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            asChild
          >
            <a href="tel:+12464334928">
              <Phone className="h-5 w-5" aria-hidden="true" />
              Contact Sales
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTA;
