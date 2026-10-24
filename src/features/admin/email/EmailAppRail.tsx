import { Link } from "react-router";
import { CalendarDays, CheckSquare, Mail, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Outlook-style switcher. Calendar, People and To Do are the CRM's own pages
// (tasks and contacts live there), not copies inside Email.
const ITEMS: { to: string; label: string; icon: LucideIcon; active?: boolean }[] = [
  { to: "/admin/email", label: "Mail", icon: Mail, active: true },
  { to: "/admin/crm/activities?view=calendar", label: "Calendar", icon: CalendarDays },
  { to: "/admin/crm/contacts", label: "People", icon: Users },
  { to: "/admin/crm/activities?view=list", label: "To Do", icon: CheckSquare },
];

export function EmailAppRail() {
  return (
    <nav aria-label="Email apps" className="hidden w-14 shrink-0 flex-col gap-1 md:flex">
      {ITEMS.map(({ to, label, icon: Icon, active }) => (
        <Link
          key={label}
          to={to}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-md border-l-2 border-transparent py-2 text-[10px] text-[hsl(var(--admin-muted-fg))] hover:bg-[hsl(var(--admin-accent))]/5 hover:text-[hsl(var(--admin-content-fg))]",
            active && "border-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent))]/10 font-semibold text-[hsl(var(--admin-content-fg))]",
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
