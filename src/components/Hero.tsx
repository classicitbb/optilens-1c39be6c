import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { ArrowRight, Shield, Zap, Award } from "lucide-react";
import heroImage from "@/assets/hero-lenses.jpg";
import heroImageSm from "@/assets/hero-lenses-sm.jpg";
import PublicSearchPanel from "@/components/PublicSearchPanel";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-hero pb-24 pt-12 sm:pb-28 sm:pt-14 lg:pb-32 lg:pt-16" aria-label="Hero">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto flex min-h-[calc(100vh-10rem)] flex-col items-center justify-start px-4 py-6 sm:py-10 lg:flex-row lg:gap-12 lg:px-8 lg:py-12">
        {/* Text Content */}
        <div className="flex-1 text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-medium text-accent animate-fade-in">
            <Award className="h-4 w-4" aria-hidden="true" />
            Trusted by 100+ optical retailers
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

          <div id="site-search" className="mt-8 scroll-mt-24 opacity-0 animate-fade-in [animation-delay:500ms]">
            <div className="max-w-2xl rounded-[28px] border border-border/80 bg-card/95 p-5 shadow-soft backdrop-blur dark:border-primary/20 dark:bg-slate-950/95">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Intelligent Site Search</p>
              <h2 className="mb-2 text-2xl font-bold text-foreground">Find anything instantly</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Ask about products, coatings, care, retailers, and support to get a short answer first, then the best page for context.
              </p>
              <PublicSearchPanel />
            </div>
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
              fetchPriority="high"
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
