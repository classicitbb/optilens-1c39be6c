import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";

const CTA = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-primary py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 text-center lg:px-8">
        <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
          Ready to Partner with Us?
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-primary-foreground/80">
          Join hundreds of optical professionals who trust OptiLens Pro for their 
          prescription lens needs. Get started today.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button 
            size="lg" 
            className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-medium"
            asChild
          >
            <Link to="/store" className="group">
              Start Ordering
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button 
            size="lg" 
            variant="ghost"
            className="border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Phone className="h-5 w-5" />
            Contact Sales
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTA;
