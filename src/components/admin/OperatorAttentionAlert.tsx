import { AlarmClockOff, AlertTriangle, ArrowRight, LifeBuoy, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useOperatorAttentionAlerts } from "@/features/admin/notifications/useOperatorAttentionAlerts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const OperatorAttentionAlert = () => {
  const navigate = useNavigate();
  const { items, isLoading, isSnoozed, snooze } = useOperatorAttentionAlerts();
  const [open, setOpen] = useState(false);
  if (isLoading || isSnoozed || items.length === 0) return null;
  const openWork = (href: string) => { setOpen(false); navigate(href); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`${items.length} attention item${items.length === 1 ? "" : "s"}`} title="Items needing attention"
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-semibold text-amber-600 hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /><span>{items.length}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" sideOffset={8} collisionPadding={12} aria-label="Items needing attention"
        className="z-[10001] w-80 max-w-[calc(100vw-24px)] overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b p-3">
          <h2 className="text-sm font-semibold">{items.length} item{items.length === 1 ? "" : "s"} need attention</h2>
          <button type="button" aria-label="Dismiss attention panel" onClick={() => setOpen(false)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="px-3 pt-3 text-xs text-muted-foreground">Close this panel anytime. Items stay here until handled.</p>
        <div className="max-h-[min(24rem,50vh)] overflow-y-auto p-2">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => openWork(item.href)}
              className="flex w-full items-center gap-3 rounded-md p-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium">{item.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{item.detail}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 border-t p-3">
          <button type="button" onClick={() => openWork("/admin/helpdesk/overview")}
            className="inline-flex items-center gap-2 rounded px-2 py-1 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />Open Help Desk
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Snooze attention alerts" className="inline-flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <AlarmClockOff className="h-4 w-4" aria-hidden="true" />Snooze
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[10002]">
              <DropdownMenuItem onClick={() => snooze(10 * 60_000)}>Snooze 10 minutes</DropdownMenuItem>
              <DropdownMenuItem onClick={() => snooze(60 * 60_000)}>Snooze 1 hour</DropdownMenuItem>
              <DropdownMenuItem onClick={() => snooze(48 * 60 * 60_000)}>Unsubscribe for 48 hours</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PopoverContent>
    </Popover>
  );
};
export default OperatorAttentionAlert;
