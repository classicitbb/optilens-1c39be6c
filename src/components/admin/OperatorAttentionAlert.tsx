import { AlarmClockOff, AlertTriangle, ArrowRight, Volume2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useOperatorAttentionAlerts } from "@/features/admin/notifications/useOperatorAttentionAlerts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OperatorAttentionAlert = () => {
  const navigate = useNavigate();
  const { items, isLoading, isSnoozed, snooze } = useOperatorAttentionAlerts();
  if (isLoading || isSnoozed || items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-11 z-[100] flex justify-center px-4 animate-in slide-in-from-top-8 duration-500" aria-live="assertive">
      <div className="pointer-events-auto w-full max-w-2xl rounded-b-xl border-x-2 border-b-2 border-red-500 bg-red-950 px-4 py-3 text-white shadow-2xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-semibold">
              <span>{items.length} item{items.length === 1 ? "" : "s"} need attention</span>
              <Volume2 className="h-4 w-4 text-yellow-300" aria-label="Audible alert active for the first minute" />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded text-yellow-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                    aria-label="Snooze attention alerts"
                    title="Snooze alerts"
                  >
                    <AlarmClockOff className="h-4 w-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-red-950 text-white border-red-500/50">
                  <DropdownMenuItem onClick={() => snooze(10 * 60_000)} className="focus:bg-red-900 focus:text-white">
                    Snooze 10 minutes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => snooze(60 * 60_000)} className="focus:bg-red-900 focus:text-white">
                    Snooze 1 hour
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => snooze(48 * 60 * 60_000)} className="focus:bg-red-900 focus:text-white">
                    Unsubscribe for 48 hours
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
            <p className="mt-1 text-xs text-red-100">This alert remains until the ticket or task reaches its handled state.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {items.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="inline-flex max-w-full items-center gap-1 rounded bg-white/10 px-2 py-1 text-left text-xs hover:bg-white/20"
                  onClick={() => navigate(item.href)}
                >
                  <span className="truncate">{item.title}</span>
                  <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorAttentionAlert;
