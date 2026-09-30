import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, MailWarning, X } from "lucide-react";

// Dismissible status line for Doc Studio's email tool. Shares the
// "email-delivery-health" query cache/key with EmailDeliveryHealthCard on
// /admin/settings/email-previews, so opening both doesn't double-fetch.

type Status = "healthy" | "degraded" | "blocked" | "no_data";
const DISMISSAL_KEY = "docstudio-email-health-dismissed";
type Health = {
  status: Status;
  message: string;
  latestAttempt?: { message_id: string | null; created_at: string; status: string } | null;
  rateLimitedUntil?: string | null;
};

const STATUS_META: Record<Status, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  healthy: { label: "Email sending: OK", className: "text-emerald-700 bg-emerald-500/10", icon: CheckCircle2 },
  degraded: { label: "Email sending: attention needed", className: "text-amber-700 bg-amber-500/10", icon: AlertTriangle },
  blocked: { label: "Email sending: paused", className: "text-red-700 bg-red-500/10", icon: MailWarning },
  no_data: { label: "Email sending: no recent activity", className: "text-slate-600 bg-slate-500/10", icon: HelpCircle },
};

export default function EmailDeliveryHealthBanner() {
  const [dismissed, setDismissed] = useState<string | null>(() => {
    try { return sessionStorage.getItem(DISMISSAL_KEY); } catch { return null; }
  });
  const { data, isLoading } = useQuery({
    queryKey: ["email-delivery-health"],
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("docstudio-api/email/health", { method: "GET" });
      if (error) throw error;
      return data as Health;
    },
  });

  const meta = data ? STATUS_META[data.status] : STATUS_META.no_data;
  const Icon = meta.icon;
  // Store only status/attempt identity, never recipient or provider error text.
  const identity = data ? JSON.stringify([
    data.status, data.latestAttempt?.message_id, data.latestAttempt?.created_at,
    data.latestAttempt?.status, data.rateLimitedUntil,
  ]) : null;

  if (dismissed && (!identity || dismissed === identity)) return null;

  const dismiss = () => {
    if (!identity) return;
    setDismissed(identity);
    try { sessionStorage.setItem(DISMISSAL_KEY, identity); } catch { /* Still dismiss when storage is unavailable. */ }
  };

  return (
    <div className={`flex flex-none items-center justify-between gap-3 border-b px-4 py-1.5 text-xs ${meta.className}`}>
      <span className="flex min-w-0 items-center gap-1.5 font-medium">
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
        {isLoading ? "Checking email sending status…" : meta.label}
        {!isLoading && data?.message && <span className="hidden font-normal opacity-80 sm:inline">— {data.message}</span>}
      </span>
      <div className="flex shrink-0 items-center gap-3">
        <Link to="/admin/settings/email-previews" className="whitespace-nowrap underline underline-offset-2 opacity-80 hover:opacity-100">
          View details
        </Link>
        {identity && <button type="button" onClick={dismiss} aria-label="Dismiss email status" title="Dismiss email status"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>}
      </div>
    </div>
  );
}
