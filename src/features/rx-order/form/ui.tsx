// Small presentational pieces shared by the Rx form's cards. No form logic.
import type { ReactNode } from "react";
import { Check, Pencil, X } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * One height for every text field, dropdown and picker on the form (the shared
 * Input is 28px, SelectTrigger 40px, so left alone they sit at different heights
 * in the same row). Apply to Input, SelectTrigger and the picker buttons.
 */
export const CONTROL = "h-9 px-3 py-0 text-sm";

export function Seg<T extends string>({
  value, onChange, options, label, disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; disabled?: boolean; hint?: string }[];
  label: string;
  disabled?: boolean;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      // Radix reports "" when the pressed item is pressed again; a segmented
      // control always keeps one choice.
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      disabled={disabled}
      className="flex-wrap justify-start gap-0 rounded-lg border bg-muted/40 p-0.5 w-fit"
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          title={o.hint}
          className="h-8 rounded-md px-3 text-xs font-medium data-[state=on]:bg-background data-[state=on]:shadow-sm data-[state=on]:text-foreground"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function Field({
  label, required, optional, hint, error, children, className, htmlFor,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
        {optional && <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">optional</span>}
      </Label>
      {children}
      {error ? <p className="text-[11px] text-destructive" role="alert">{error}</p> : hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Callout({
  tone = "info", children, onDismiss, action,
}: {
  tone?: "info" | "warn" | "danger";
  children: ReactNode;
  onDismiss?: () => void;
  action?: ReactNode;
}) {
  const style = {
    info: "border-border bg-muted/40",
    warn: "border-amber-300/60 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100",
    danger: "border-destructive/40 bg-destructive/5",
  }[tone];
  return (
    <div className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-xs", style)} role={tone === "danger" ? "alert" : undefined}>
      <div className="flex-1 space-y-0.5">{children}</div>
      {action}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * One numbered step of the form. A card that is complete and no longer being
 * edited folds into a one-line summary with an Edit button.
 */
export function StepCard({
  id, index, title, sub, done, folded, summary, onEdit, onClear, children, headerExtra,
}: {
  id: string;
  index: number;
  title: string;
  sub: string;
  done: boolean;
  folded: boolean;
  summary: ReactNode;
  onEdit: () => void;
  onClear?: () => void;
  children: ReactNode;
  headerExtra?: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-20 rounded-xl border bg-card shadow-sm", done && "border-emerald-500/30")}
    >
      <header className="flex items-start gap-3 px-4 pt-4">
        <div
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            done ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground",
          )}
          aria-hidden="true"
        >
          {done ? <Check className="h-3.5 w-3.5" /> : index}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-title`} className="text-sm font-semibold leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className="flex items-center gap-1">
          {headerExtra}
          {onClear && !folded && (
            <button type="button" onClick={onClear} title="Clear this section" aria-label={`Clear ${title}`}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {folded && (
            <button type="button" onClick={onEdit} aria-label={`Edit ${title}`}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
        </div>
      </header>
      {folded ? (
        <div className="px-4 pb-4 pt-2" aria-live="polite">{summary}</div>
      ) : (
        <div className="space-y-4 px-4 pb-4 pt-3">{children}</div>
      )}
    </section>
  );
}
