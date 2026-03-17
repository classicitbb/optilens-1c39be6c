import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Zap, Award } from "lucide-react";
import heroImage from "@/assets/hero-lenses.jpg";
import heroImageSm from "@/assets/hero-lenses-sm.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-hero pt-16" aria-label="Hero">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12 sm:py-20 lg:flex-row lg:gap-12 lg:px-8">
        {/* Text Content */}
        <div className="flex-1 text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-medium text-accent animate-fade-in">
            <Award className="h-4 w-4" aria-hidden="true" />
            Trusted by 500+ optical retailers
          </div>

          <h1 className="mb-6 text-3xl font-bold leading-tight text-foreground opacity-0 animate-fade-in [animation-delay:100ms] sm:text-4xl md:text-5xl lg:text-6xl">
            Premium Rx Lenses for{" "}
            <span className="text-gradient">Optical Professionals</span>
          </h1>

          <p className="mb-8 max-w-xl text-base text-muted-foreground opacity-0 animate-fade-in [animation-delay:200ms] sm:text-lg lg:text-xl">
            Wholesale surfaced and finished prescription lenses crafted with precision. 
            Elevate your optical business with quality you can trust.
          </p>

          <div className="flex flex-col items-center gap-3 opacity-0 animate-fade-in [animation-delay:300ms] sm:flex-row sm:gap-4 lg:justify-start">
            <Button variant="hero" size="lg" asChild>
              <Link to="/store" className="group">
                Browse Catalog
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" asChild>
              <Link to="/knowledge">Explore Our Knowledge Base</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 opacity-0 animate-fade-in [animation-delay:400ms] sm:mt-12 lg:justify-start">
            {[
              { icon: Shield, label: "Quality Assured" },
              { icon: Zap, label: "Fast Turnaround" },
              { icon: Award, label: "Industry Leader" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-5 w-5 shrink-0 text-accent sm:h-6 sm:w-6" aria-hidden="true" />
                <span className="text-xs font-medium text-foreground sm:text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Image */}
        <div className="mt-10 w-full max-w-lg flex-1 opacity-0 animate-fade-in-right [animation-delay:200ms] sm:mt-12 lg:mt-0 lg:max-w-none">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-accent opacity-20 blur-3xl" aria-hidden="true" />
            <img
              src={heroImageSm}
              srcSet={`${heroImageSm} 768w, ${heroImage} 1920w`}
              sizes="(max-width: 1024px) 100vw, 50vw"
              alt="Premium optical lenses with beautiful light refraction"
              className="relative z-10 w-full rounded-3xl shadow-medium animate-float"
              loading="eager"
              width={640}
              height={360}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
