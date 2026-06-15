import { Lock, ShieldCheck, BadgeCheck, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityTrustBarProps {
  className?: string;
  compact?: boolean;
}

const BADGES = [
  {
    icon: Lock,
    label: "TLS 1.3",
    detail: "Encrypted in transit",
    provider: "HTTPS",
  },
  {
    icon: ShieldCheck,
    label: "PCI DSS L1",
    detail: "via Stripe",
    provider: "Stripe",
  },
  {
    icon: BadgeCheck,
    label: "SOC 2 Type II",
    detail: "via Supabase",
    provider: "Supabase",
  },
  {
    icon: Globe,
    label: "GDPR",
    detail: "Data compliant",
    provider: "EU",
  },
] as const;

export const SecurityTrustBar = ({ className, compact = false }: SecurityTrustBarProps) => {
  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
        {BADGES.map(({ icon: Icon, label, provider }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            title={`${label} — ${provider}`}
          >
            <Icon className="h-3 w-3 text-secondary shrink-0" aria-hidden="true" />
            <span className="font-mono tracking-wide">{label}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground mb-2">
        Security &amp; Compliance
      </p>
      {BADGES.map(({ icon: Icon, label, detail, provider }) => (
        <div
          key={label}
          className="flex items-center gap-2.5 rounded-md bg-muted/60 px-3 py-2"
        >
          <Icon
            className="h-3.5 w-3.5 shrink-0 text-secondary"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-foreground">
              {label}
            </span>
            <span className="mx-1.5 text-muted-foreground/50">·</span>
            <span className="text-[11px] text-muted-foreground">{detail}</span>
          </div>
          <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
            {provider}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SecurityTrustBar;
