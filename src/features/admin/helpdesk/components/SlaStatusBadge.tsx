import { Badge } from "@/components/ui/badge";
import { normalizeSlaBadgeStatus } from "../utils/normalization";

interface SlaStatusBadgeProps {
  deadlineAt: string | null | undefined;
  closedAt?: string | null;
  slaPausedAt?: string | null;
  slaPausedDurationSeconds?: number;
}

/**
 * Computes the effective SLA deadline adjusted for paused time, then
 * delegates to the existing normalizeSlaBadgeStatus utility.
 */
export const SlaStatusBadge = ({
  deadlineAt,
  closedAt,
  slaPausedAt,
  slaPausedDurationSeconds = 0,
}: SlaStatusBadgeProps) => {
  if (!deadlineAt) return null;

  // Compute effective deadline = raw deadline + total paused seconds
  const pausedMs =
    slaPausedDurationSeconds * 1000 +
    (slaPausedAt ? Date.now() - new Date(slaPausedAt).getTime() : 0);

  const effectiveDeadline = new Date(new Date(deadlineAt).getTime() + pausedMs).toISOString();

  const status = normalizeSlaBadgeStatus({ deadline: effectiveDeadline, closedAt });

  if (status === "no_sla") return null;

  const config = {
    on_track: { label: "SLA OK", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    at_risk: { label: "At Risk", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    breached: { label: "SLA Breached", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  } as const;

  const { label, className } = config[status];

  return (
    <Badge variant="outline" className={`text-xs font-medium ${className}`}>
      {label}
    </Badge>
  );
};
