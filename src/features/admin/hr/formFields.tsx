import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Errors only show once the user has interacted with the field (:user-invalid), never on load.
export const fieldInputClass = "[&:user-invalid]:border-destructive [&:user-invalid]:ring-destructive";

export const Field = ({ label, htmlFor, className, children }: { label: string; htmlFor: string; className?: string; children: ReactNode }) => (
  <div className={cn("space-y-1.5", className)}>
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
  </div>
);

/** Reads a submitted form into a record, turning blank inputs into null. */
export const formValues = (form: HTMLFormElement) => {
  const out: Record<string, string | null> = {};
  new FormData(form).forEach((value, key) => {
    const text = String(value).trim();
    out[key] = text === "" ? null : text;
  });
  return out;
};

export const money = (amount: number | null | undefined, currency = "BBD") =>
  amount == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

export const day = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T00:00:00`)) : "—";

export const STATUS_LABELS = { active: "Active", on_leave: "On leave", terminated: "Terminated" } as const;
export const EMPLOYMENT_TYPE_LABELS = { full_time: "Full time", part_time: "Part time", contract: "Contract", casual: "Casual" } as const;
