import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdminNotifications } from "@/features/admin/notifications/useAdminNotifications";
import { useNavigate } from "react-router";

const severityColor: Record<string, string> = {
  error: "text-destructive",
  warning: "text-[hsl(var(--admin-warning))]",
  info: "text-[hsl(var(--admin-muted-fg))]"
};

const NotificationBell = () => {
  const { notifications, unreadCount, markRead, markAllRead, clearNotification, clearAll } =
  useAdminNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (id: string, href?: string) => {
    markRead(id);
    if (href) {
      navigate(href);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 relative"
            onClick={() => setOpen(!open)}>

            <Bell className="h-3.5 w-3.5 text-[hsl(var(--admin-muted-fg))]" />
            {unreadCount > 0 &&
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            }
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span className="text-xs">
            {unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""}` : "No new notifications"}
          </span>
        </TooltipContent>
      </Tooltip>

      {open &&
      <div className="absolute right-0 top-full mt-1 z-50 w-80 border border-[hsl(var(--admin-border))] shadow-lg bg-[hsl(var(--admin-bg))] text-[hsl(var(--admin-fg))]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))]">
            <span className="text-xs font-semibold">Notifications</span>
            <div className="flex gap-1">
              {unreadCount > 0 &&
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={markAllRead}>
                  Mark all read
                </Button>
            }
              {notifications.length > 0 &&
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => {clearAll();setOpen(false);}}>
                  Clear all
                </Button>
            }
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ?
          <p className="text-xs text-[hsl(var(--admin-muted-fg))] p-4 text-center">All clear — no notifications.</p> :

          notifications.map((n) =>
          <button
            key={n.id}
            className="w-full text-left px-3 py-2 border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-sidebar-hover))] transition-colors flex gap-2 items-start"
            onClick={() => handleClick(n.id, n.href)}>

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${severityColor[n.severity] ?? ""}`}>{n.title}</p>
                    <p className="text-[11px] line-clamp-2 text-[hsl(var(--admin-muted-fg))]">{n.message}</p>
                  </div>
                  <button
              className="shrink-0 text-[hsl(var(--admin-muted-fg))] hover:text-[hsl(var(--admin-fg))] text-xs mt-0.5"
              onClick={(e) => {e.stopPropagation();clearNotification(n.id);}}
              aria-label="Dismiss">

                    ✕
                  </button>
                </button>
          )
          }
          </div>
        </div>
      }
    </div>);

};

export default NotificationBell;
