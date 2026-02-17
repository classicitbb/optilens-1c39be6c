import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface ZenvueProductCardProps {
  title: string;
  description: string;
  features: string[];
  to: string;
  icon: LucideIcon;
  accentColor?: string;
}

const ZenvueProductCard = ({ title, description, features, to, icon: Icon, accentColor }: ZenvueProductCardProps) => {
  return (
    <Link
      to={to}
      className="group flex flex-col border border-border bg-card p-6 transition-all hover:border-accent/40 hover:shadow-lg"
      style={{ boxShadow: "var(--shadow-zv)" }}
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center"
        style={{ background: accentColor || "hsl(var(--accent))" }}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <ul className="mt-4 flex-1 space-y-1.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 h-1 w-1 shrink-0 bg-accent" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center gap-1 text-sm font-medium text-accent transition-colors group-hover:text-accent/80">
        Learn More <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
};

export default ZenvueProductCard;
