import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Link to={to} className="group block">
      <Card variant="feature" className="flex h-full flex-col rounded-2xl">
        <CardHeader className="space-y-0 p-6 pb-4">
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10"
            style={accentColor ? { background: accentColor } : undefined}
          >
            <Icon className={`h-6 w-6 ${accentColor ? "text-white" : "text-accent"}`} />
          </div>
          <CardTitle className="text-xl">
            {title}
          </CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col p-6 pt-0">
          <ul className="flex-1 space-y-1.5">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-1 text-sm font-medium text-accent transition-colors group-hover:text-accent/80">
            Learn More <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ZenvueProductCard;
