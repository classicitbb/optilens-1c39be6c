import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, MailWarning } from "lucide-react";

// Slim, always-visible status line for Doc Studio's email tool. Shares the
// "email-delivery-health" query cache/key with EmailDeliveryHealthCard on
// /admin/settings/email-previews, so opening both doesn't double-fetch.

type Status = "healthy" | "degraded" | "blocked" | "no_data";

const STATUS_META: Record<Status, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  healthy: { label: "Email sending: OK", className: "text-emerald-700 bg-emerald-500/10", icon: CheckCircle2 },
  degraded: { label: "Email sending: attention needed", className: "text-amber-700 bg-amber-500/10", icon: AlertTriangle },
  blocked: { label: "Email sending: paused", className: "text-red-700 bg-red-500/10", icon: MailWarning },
  no_data: { label: "Email sending: no recent activity", className: "text-slate-600 bg-slate-500/10", icon: HelpCircle },
};

export default function EmailDeliveryHealthBanner() {
  const { data, isLoading } = useQuery({
    queryKey: ["email-delivery-health"],
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("docstudio-api/email/health", { method: "GET" });
      if (error) throw error;
      return data as { status: Status; message: string };
    },
  });

  const meta = data ? STATUS_META[data.status] : STATUS_META.no_data;
  const Icon = meta.icon;

  return (
    <div className={`flex flex-none items-center justify-between gap-3 border-b px-4 py-1.5 text-xs ${meta.className}`}>
      <span className="flex items-center gap-1.5 font-medium">
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
        {isLoading ? "Checking email sending status…" : meta.label}
        {!isLoading && data?.message && <span className="hidden font-normal opacity-80 sm:inline">— {data.message}</span>}
      </span>
      <Link to="/admin/settings/email-previews" className="shrink-0 whitespace-nowrap underline underline-offset-2 opacity-80 hover:opacity-100">
        View details
      </Link>
    </div>
  );
}
