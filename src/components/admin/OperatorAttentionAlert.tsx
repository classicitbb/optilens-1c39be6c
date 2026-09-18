import { AlarmClockOff, AlertTriangle, ArrowRight, ChevronDown, ChevronUp, LifeBuoy, Volume2 } from "lucide-react";
import { useState } from "react";
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  if (isLoading || isSnoozed || items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-11 z-[100] flex justify-center px-4 animate-in slide-in-from-top-8 duration-500" aria-live="assertive">
      <div className="pointer-events-auto flex w-full max-w-2xl flex-col items-center text-white">
        {isCollapsed ? (
          <button
            type="button"
            className="inline-flex h-7 items-center gap-2 rounded-b-md border-x-2 border-b-2 border-red-500 bg-red-950 px-3 text-xs font-semibold text-yellow-100 shadow-xl hover:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
            onClick={() => setIsCollapsed(false)}
            aria-label="Expand attention alert"
            aria-expanded={false}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-300" aria-hidden="true" />
            <span>{items.length} attention item{items.length === 1 ? "" : "s"}</span>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : (
          <>
            <div className="w-full rounded-b-xl border-x-2 border-b-2 border-red-500 bg-red-950 px-4 py-3 shadow-2xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <span>{items.length} item{items.length === 1 ? "" : "s"} need attention</span>
                    <Volume2 className="h-4 w-4 shrink-0 text-yellow-300" aria-label="Audible alert active for the first minute" />

                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-yellow-100 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                        onClick={() => navigate("/admin/helpdesk/overview")}
                      >
                        <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
                        Open Help Desk
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-yellow-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                            aria-label="Snooze attention alerts"
                            title="Snooze alerts"
                          >
                            <AlarmClockOff className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 border-red-500/50 bg-red-950 text-white">
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
            <button
              type="button"
              className="-mt-px inline-flex h-6 items-center gap-1 rounded-b-md border-x-2 border-b-2 border-red-500 bg-red-950 px-3 text-[11px] font-medium text-red-100 shadow-xl hover:bg-red-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
              onClick={() => setIsCollapsed(true)}
              aria-label="Collapse attention alert"
              aria-expanded={true}
            >
              <span>Collapse</span>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OperatorAttentionAlert;
