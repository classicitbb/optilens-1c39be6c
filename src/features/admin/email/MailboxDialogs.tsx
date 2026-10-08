import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { EmailAccount } from "@/lib/emailBridge";
import { useConnectMailbox, useMailboxAccess } from "./useEmail";

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Each person connects their own company mailbox once. The bridge tests the
// login against the mail server before saving, then keeps the password
// encrypted on the office server. It never reaches Supabase or the browser again.
export function ConnectMailboxDialog({ open, onClose, defaultAddress, isAdmin }: { open: boolean; onClose: () => void; defaultAddress: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const connect = useConnectMailbox();
  const [address, setAddress] = useState(defaultAddress);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [isShared, setIsShared] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await connect.mutateAsync({ address, password, display_name: displayName, is_shared: isShared });
      setPassword("");
      toast({ title: "Mailbox connected", description: "Your mail will appear in a minute or two while the first sync runs." });
      onClose();
    } catch (error) {
      toast({ title: "Not connected", description: errorText(error), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !connect.isPending) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect a mailbox</DialogTitle>
          <DialogDescription>
            Use your company email address and its mailbox password (the one you'd use in Outlook). It's checked with the mail server, then stored encrypted on the office server.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 text-sm">
          <label className="grid gap-1 text-xs text-[hsl(var(--admin-muted-fg))]">Email address
            <Input id="mailbox-address" type="email" autoComplete="username" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </label>
          <label className="grid gap-1 text-xs text-[hsl(var(--admin-muted-fg))]">Name shown to recipients
            <Input id="mailbox-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Jane Smith – Classic Visions" />
          </label>
          <label className="grid gap-1 text-xs text-[hsl(var(--admin-muted-fg))]">Mailbox password
            <Input id="mailbox-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {isAdmin ? (
            <label className="flex items-center gap-2 text-xs">
              <Checkbox id="mailbox-shared" checked={isShared} onCheckedChange={(value) => setIsShared(value === true)} />
              Shared mailbox (every admin and operator can open it, like orders@)
            </label>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={connect.isPending}>Cancel</Button>
            <Button type="submit" size="sm" disabled={connect.isPending}>{connect.isPending ? "Checking…" : "Connect"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ManageMailboxDialog({ account, onClose }: { account: EmailAccount | null; onClose: () => void }) {
  const { toast } = useToast();
  const access = useMailboxAccess();
  const [email, setEmail] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  if (!account) return null;

  const run = async (label: string, action: () => Promise<unknown>) => {
    try {
      await action();
      toast({ title: label });
    } catch (error) {
      toast({ title: "That didn't work", description: errorText(error), variant: "destructive" });
    }
  };

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{account.displayName}</DialogTitle>
          <DialogDescription>{account.address}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          {account.isShared ? (
            <p className="text-xs text-[hsl(var(--admin-muted-fg))]">Shared mailbox: every admin and operator can open it.</p>
          ) : (
            <>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--admin-muted-fg))]">Who can open it</h3>
              <ul className="grid gap-1">
                {account.members.map((member) => (
                  <li key={member.email} className="flex items-center justify-between gap-2 text-xs">
                    <span>{member.email} {member.role === "owner" ? <Badge variant="secondary" className="ml-1">Owner</Badge> : null}</span>
                    {member.role !== "owner" ? (
                      <Button size="sm" variant="ghost" className="h-7" aria-label={`Remove ${member.email}`}
                        onClick={() => run("Access removed", () => access.unshare.mutateAsync({ code: account.code, email: member.email }))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void run("Access added", async () => { await access.share.mutateAsync({ code: account.code, email }); setEmail(""); }); }}>
                <Input id="mailbox-share-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Colleague's OpticAdmin email" />
                <Button type="submit" size="sm" variant="outline" disabled={!email.trim() || access.share.isPending}><UserPlus className="mr-1 h-4 w-4" /> Add</Button>
              </form>
            </>
          )}
          {account.lastError ? <p className="text-xs text-destructive">Last sync problem: {account.lastError}</p> : null}
          <div className="flex justify-between gap-2 border-t border-[hsl(var(--admin-border))] pt-3">
            {confirmDisconnect ? (
              <div className="flex items-center gap-2 text-xs">
                Remove this mailbox from OpticAdmin? Mail on the server is not touched.
                <Button size="sm" variant="destructive" onClick={() => run("Mailbox disconnected", async () => { await access.disconnect.mutateAsync(account.code); onClose(); })}>Disconnect</Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDisconnect(true)}>Disconnect mailbox</Button>
            )}
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
