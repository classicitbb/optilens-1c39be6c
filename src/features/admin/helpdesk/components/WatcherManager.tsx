import { useMemo, useState } from "react";
import { Check, ChevronDown, Eye, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { cn } from "@/lib/utils";
import { useAddTicketWatcher, useRemoveTicketWatcher, useTicketWatchers } from "../hooks/useTicketWatchers";

interface WatcherManagerProps {
  ticketId: string;
}

type WatcherType = "internal_user" | "non_user_staff" | "external_contact";

const watcherTypeLabel: Record<WatcherType, string> = {
  internal_user: "Internal user",
  non_user_staff: "Non-user staff",
  external_contact: "External contact",
};

export const WatcherManager = ({ ticketId }: WatcherManagerProps) => {
  const { data: watchers = [] } = useTicketWatchers(ticketId);
  const { users: knownUsers = [], isLoading: areUsersLoading } = useAdminUsers();
  const addWatcher = useAddTicketWatcher();
  const removeWatcher = useRemoveTicketWatcher();

  const [showForm, setShowForm] = useState(false);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [watcherType, setWatcherType] = useState<WatcherType>("non_user_staff");
  const [userId, setUserId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);

  const internalUserOptions = useMemo(
    () =>
      knownUsers
        .filter((user) => Boolean(user.user_id))
        .map((user) => {
          const primaryLabel = user.display_name?.trim() || user.email || user.user_id;
          const secondaryLabel = user.email && user.email !== primaryLabel ? user.email : user.user_id;

          return {
            id: user.user_id,
            primaryLabel,
            secondaryLabel,
          };
        }),
    [knownUsers],
  );

  const selectedInternalUser = internalUserOptions.find((user) => user.id === userId) ?? null;

  const resetForm = () => {
    setUserId("");
    setStaffName("");
    setStaffEmail("");
    setContactEmail("");
    setContactName("");
    setIsPermanent(false);
    setWatcherType("non_user_staff");
    setUserPickerOpen(false);
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (watcherType === "internal_user" && userId.trim()) {
      await addWatcher.mutateAsync({ ticketId, watcher_type: "internal_user", user_id: userId.trim(), is_permanent: isPermanent });
    } else if (watcherType === "non_user_staff" && staffEmail.trim()) {
      await addWatcher.mutateAsync({ ticketId, watcher_type: "non_user_staff", staff_name: staffName.trim(), staff_email: staffEmail.trim(), is_permanent: isPermanent });
    } else if (watcherType === "external_contact" && contactEmail.trim()) {
      await addWatcher.mutateAsync({ ticketId, watcher_type: "external_contact", contact_email: contactEmail.trim(), contact_name: contactName.trim() || undefined, is_permanent: isPermanent });
    }
    resetForm();
  };

  const displayLabel = (w: (typeof watchers)[0]) => {
    if (w.watcher_type === "internal_user") {
      const matchedUser = internalUserOptions.find((user) => user.id === w.user_id);
      return matchedUser?.primaryLabel ?? w.user_id?.slice(0, 8) ?? "User";
    }
    if (w.watcher_type === "non_user_staff") return w.staff_name ?? w.staff_email ?? "Staff";
    return w.contact_name ?? w.contact_email ?? "Contact";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Eye size={12} />
          Watchers
        </Label>
        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setShowForm(!showForm)}>
          <Plus size={11} className="mr-1" />
          Add
        </Button>
      </div>

      {watchers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {watchers.map((w) => (
            <Badge key={w.id} variant="secondary" className="text-xs gap-1 pr-1 group">
              {displayLabel(w)}
              {w.is_permanent && <span title="Permanent watcher">*</span>}
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                onClick={() => removeWatcher.mutate({ watcherId: w.id, ticketId })}
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {showForm && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3 text-sm">
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <div className="flex gap-2 flex-wrap">
              {(["internal_user", "non_user_staff", "external_contact"] as WatcherType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setWatcherType(t)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    watcherType === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {watcherTypeLabel[t]}
                </button>
              ))}
            </div>
          </div>

          {watcherType === "internal_user" && (
            <div className="space-y-1">
              <Label className="text-xs">Internal user</Label>
              <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={userPickerOpen}
                    className="h-8 w-full justify-between text-xs font-normal"
                  >
                    <span className="truncate">
                      {selectedInternalUser
                        ? selectedInternalUser.primaryLabel
                        : areUsersLoading
                          ? "Loading users..."
                          : "Select an internal user"}
                    </span>
                    <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search users..." className="h-9 text-xs" />
                    <CommandList>
                      <CommandEmpty className="py-3 text-xs text-muted-foreground">
                        {areUsersLoading ? "Loading users..." : "No matching users found."}
                      </CommandEmpty>
                      {internalUserOptions.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.primaryLabel} ${user.secondaryLabel} ${user.id}`}
                          onSelect={() => {
                            setUserId(user.id);
                            setUserPickerOpen(false);
                          }}
                          className="flex items-start gap-2 py-2 text-xs"
                        >
                          <Check
                            className={cn(
                              "mt-0.5 h-3.5 w-3.5 shrink-0",
                              user.id === userId ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{user.primaryLabel}</div>
                            <div className="truncate text-[11px] text-muted-foreground">{user.secondaryLabel}</div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {watcherType === "non_user_staff" && (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input className="h-7 text-xs" placeholder="Full name" value={staffName} onChange={(e) => setStaffName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input className="h-7 text-xs" type="email" placeholder="name@company.com" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} />
              </div>
            </div>
          )}

          {watcherType === "external_contact" && (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input className="h-7 text-xs" type="email" placeholder="customer@example.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input className="h-7 text-xs" placeholder="Display name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-permanent"
              checked={isPermanent}
              onChange={(e) => setIsPermanent(e.target.checked)}
              className="h-3 w-3"
            />
            <Label htmlFor="is-permanent" className="text-xs cursor-pointer">Permanent watcher</Label>
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAdd} disabled={addWatcher.isPending}>
              Add watcher
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
