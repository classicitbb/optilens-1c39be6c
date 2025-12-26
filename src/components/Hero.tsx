import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Zap, Award } from "lucide-react";
import heroImage from "@/assets/hero-lenses.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-hero pt-16">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-20 lg:flex-row lg:gap-12 lg:px-8">
        {/* Text Content */}
        <div className="flex-1 text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-medium text-accent animate-fade-in">
            <Award className="h-4 w-4" />
            Trusted by 500+ optical retailers
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight text-foreground opacity-0 animate-fade-in [animation-delay:100ms] md:text-5xl lg:text-6xl">
            Premium Rx Lenses for{" "}
            <span className="text-gradient">Optical Professionals</span>
          </h1>

          <p className="mb-8 max-w-xl text-lg text-muted-foreground opacity-0 animate-fade-in [animation-delay:200ms] lg:text-xl">
            Wholesale surfaced and finished prescription lenses crafted with precision. 
            Elevate your optical business with quality you can trust.
          </p>

          <div className="flex flex-col items-center gap-4 opacity-0 animate-fade-in [animation-delay:300ms] sm:flex-row lg:justify-start">
            <Button variant="hero" size="lg" asChild>
              <Link to="/store" className="group">
                Browse Catalog
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" asChild>
              <Link to="/knowledge">Learn More</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 grid grid-cols-3 gap-6 opacity-0 animate-fade-in [animation-delay:400ms]">
            <div className="flex flex-col items-center lg:items-start">
              <Shield className="mb-2 h-6 w-6 text-accent" />
              <span className="text-sm font-medium text-foreground">Quality Assured</span>
            </div>
            <div className="flex flex-col items-center lg:items-start">
              <Zap className="mb-2 h-6 w-6 text-accent" />
              <span className="text-sm font-medium text-foreground">Fast Turnaround</span>
            </div>
            <div className="flex flex-col items-center lg:items-start">
              <Award className="mb-2 h-6 w-6 text-accent" />
              <span className="text-sm font-medium text-foreground">Industry Leader</span>
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="mt-12 flex-1 opacity-0 animate-fade-in-right [animation-delay:200ms] lg:mt-0">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-accent opacity-20 blur-3xl" />
            <img
              src={heroImage}
              alt="Premium optical lenses with beautiful light refraction"
              className="relative z-10 w-full max-w-2xl rounded-3xl shadow-medium animate-float"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
