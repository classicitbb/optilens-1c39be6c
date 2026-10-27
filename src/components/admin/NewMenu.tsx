import { Fragment, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreateHelpdeskTicketDialog from "@/features/admin/helpdesk/components/CreateHelpdeskTicketDialog";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { NEW_ACTIONS, type NewAction } from "./newMenuActions";

/** One-click launcher for everything a user can create, from any admin page. */
const NewMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAppAccess, canEditFeature } = useRolePermissions();
  const [ticketOpen, setTicketOpen] = useState(false);

  const groups = useMemo(() => {
    const byGroup = new Map<string, NewAction[]>();
    for (const action of NEW_ACTIONS) {
      const allowed = "app" in action.access ? hasAppAccess(action.access.app) : canEditFeature(action.access.edit);
      if (!allowed) continue;
      byGroup.set(action.group, [...(byGroup.get(action.group) ?? []), action]);
    }
    return [...byGroup.entries()];
  }, [canEditFeature, hasAppAccess]);

  const launch = (action: NewAction) => {
    if (action.kind === "ticket") {
      setTicketOpen(true);
    } else if (action.kind === "in-place") {
      const params = new URLSearchParams(location.search);
      params.set(action.param, "1");
      navigate({ pathname: location.pathname, search: `?${params.toString()}` });
    } else {
      navigate(action.path);
    }
  };

  if (groups.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs" aria-label="Create new">
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[70vh] w-56 overflow-y-auto">
          {groups.map(([group, actions], index) => (
            <Fragment key={group}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</DropdownMenuLabel>
              {actions.map((action) => (
                <DropdownMenuItem key={action.id} className="text-xs" onSelect={() => launch(action)}>
                  <action.icon className="mr-2 h-3.5 w-3.5" /> {action.label}
                </DropdownMenuItem>
              ))}
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateHelpdeskTicketDialog open={ticketOpen} onOpenChange={setTicketOpen} />
    </>
  );
};

export default NewMenu;
