import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { type LucideIcon } from "lucide-react";

interface HeroCTA {
  label: string;
  to: string;
  variant?: "default" | "outline";
  external?: boolean;
  icon?: LucideIcon;
}

interface ZenvueHeroProps {
  title: string;
  subtitle: string;
  description?: string;
  ctas?: HeroCTA[];
  badge?: string;
}

const ZenvueHero = ({ title, subtitle, description, ctas = [], badge }: ZenvueHeroProps) => {
  return (
    <section className="relative overflow-hidden" style={{ background: "var(--gradient-zv-hero)" }}>
      <div className="container mx-auto px-4 py-20 sm:py-24 lg:px-8 lg:py-28">
        <div className="max-w-3xl">
          {badge && (
            <span className="mb-5 inline-block rounded-full border border-white/30 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-white/80 backdrop-blur-sm">
              {badge}
            </span>
          )}
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg md:text-xl">{subtitle}</p>
          {description && <p className="mt-3 max-w-2xl text-sm text-white/60 sm:text-base">{description}</p>}
          {ctas.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {ctas.map((cta) => {
                const Icon = cta.icon;
                const btn = (
                  <Button
                    key={cta.label}
                    variant={cta.variant === "outline" ? "outline" : "default"}
                    size="lg"
                    className={
                      cta.variant === "outline"
                        ? "border-white/40 bg-transparent text-white hover:bg-white/10"
                        : "bg-accent text-accent-foreground hover:bg-accent/90"
                    }
                  >
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    {cta.label}
                  </Button>
                );
                if (cta.external) {
                  return (
                    <a key={cta.label} href={cta.to} target="_blank" rel="noopener noreferrer">
                      {btn}
                    </a>
                  );
                }
                return (
                  <Link key={cta.label} to={cta.to}>
                    {btn}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Decorative element */}
      <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/5 blur-3xl" />
    </section>
  );
};

export default ZenvueHero;
