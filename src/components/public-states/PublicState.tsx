import { useId, type ReactNode } from "react";
import { CheckCircle2, CircleHelp, Search, ShieldAlert, TriangleAlert, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

type StateTone = "empty" | "error" | "offline" | "search" | "permission" | "success";
const icons = { empty: CircleHelp, error: TriangleAlert, offline: WifiOff, search: Search, permission: ShieldAlert, success: CheckCircle2 };

/** A section-level state. Keep actions outside the live region so they stay easy to navigate. */
export function PublicState({ tone = "empty", title, description, children, className, announce = false }: {
  tone?: StateTone;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
  announce?: boolean;
}) {
  const id = useId();
  const Icon = icons[tone];
  return (
    <section aria-labelledby={id} className={cn("rounded-xl border border-border bg-card p-5 text-left text-foreground sm:p-6", className)}>
      <div className="flex items-start gap-3" role={announce ? (tone === "error" ? "alert" : "status") : undefined}>
        <Icon aria-hidden="true" className={cn("mt-0.5 h-5 w-5 shrink-0 text-secondary", tone === "error" && "text-destructive")} />
        <div className="min-w-0">
          <h2 id={id} className="text-base font-semibold leading-6">{title}</h2>
          <p className="mt-1 max-w-prose text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children ? <div className="mt-4 flex flex-wrap items-center gap-3 sm:ml-8">{children}</div> : null}
    </section>
  );
}
