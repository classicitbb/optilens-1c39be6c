import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, ShieldAlert, ShieldOff, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { tagsGrantFeatureAccess } from "@/lib/portalFeatureConflicts";
import {
  buildPortalApprovalQueue,
  type ApprovalQueueCustomer,
  type ApprovalQueueStaffMember,
  type PendingSignupProfile,
  type ResolvedPendingSignup,
} from "@/lib/portalApprovalQueue";

// Features every approved customer receives without any tag or override.
const ALWAYS_ON_FEATURES = ["Quotes", "Helpdesk", "Private orders", "Live order status"];

type PortalApprovalsQueueProps = {
  /** Opens the embedded contact editor to link/qualify an unresolved signup. */
  onReviewContact: (contactId: string, tab: "details" | "account-settings" | "portal-settings") => void;
};

type QueueData = {
  staffAtExisting: ResolvedPendingSignup[];
  newOrUnresolved: ResolvedPendingSignup[];
  // customerId -> { statements, pricelists } the confirmed staff would inherit.
  grantByCustomerId: Record<number, { statements: boolean; pricelists: boolean }>;
};

const displayName = (p: PendingSignupProfile) => p.full_name?.trim() || p.email?.trim() || "New customer";

export function PortalApprovalsQueue({ onReviewContact }: PortalApprovalsQueueProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { confirmPortalStaff, archivePortalProfile, setLoginDisabled } = useAdminUsers();

  const queueQuery = useQuery({
    queryKey: ["portal-approvals-queue"],
    queryFn: async (): Promise<QueueData> => {
      const { data: profileRows, error: profileError } = await (supabase as any)
        .from("profiles")
        .select("user_id,full_name,email,organization_name,claimed_account_number,crm_contact_id,updated_at")
        .eq("portal_access_status", "pending_approval")
        .is("archived_at", null)
        .order("updated_at", { ascending: false });
      if (profileError) throw profileError;
      const profiles = (profileRows ?? []) as PendingSignupProfile[];
      if (profiles.length === 0) {
        return { staffAtExisting: [], newOrUnresolved: [], grantByCustomerId: {} };
      }

      const { data: customerRows, error: customerError } = await (supabase as any)
        .from("customers")
        .select("id,name,account_number,contact_id")
        .order("name");
      if (customerError) throw customerError;
      const customers = (customerRows ?? []) as Array<ApprovalQueueCustomer & { contact_id: string | null }>;

      // Existing linked staff at each customer, for the "is this a colleague?" check.
      const { data: staffRows, error: staffError } = await (supabase as any)
        .from("profiles")
        .select("full_name,email,crm_customer_id")
        .not("crm_customer_id", "is", null);
      if (staffError) throw staffError;
      const staffByCustomerId: Record<number, ApprovalQueueStaffMember[]> = {};
      for (const row of (staffRows ?? []) as Array<ApprovalQueueStaffMember & { crm_customer_id: number }>) {
        (staffByCustomerId[row.crm_customer_id] ??= []).push({ full_name: row.full_name, email: row.email });
      }

      const queue = buildPortalApprovalQueue(profiles, customers, staffByCustomerId);

      // Feature grant preview: statements/pricing are tag-gated on the person
      // contact OR the matched customer's company contact (inheritance).
      const customerById = new Map(customers.map((c) => [c.id, c]));
      const grantContactIds = new Set<string>();
      for (const resolved of queue.staffAtExisting) {
        if (resolved.profile.crm_contact_id) grantContactIds.add(resolved.profile.crm_contact_id);
        const companyContactId = resolved.matchedCustomer ? customerById.get(resolved.matchedCustomer.id)?.contact_id : null;
        if (companyContactId) grantContactIds.add(companyContactId);
      }
      const tagsByContactId: Record<string, string[]> = {};
      if (grantContactIds.size > 0) {
        const { data: tagRows, error: tagError } = await (supabase as any)
          .from("contact_tag_links")
          .select("contact_id,contact_tags(name)")
          .in("contact_id", Array.from(grantContactIds));
        if (tagError) throw tagError;
        for (const row of (tagRows ?? []) as Array<{ contact_id: string; contact_tags?: { name?: string } }>) {
          const name = row.contact_tags?.name;
          if (name) (tagsByContactId[row.contact_id] ??= []).push(name);
        }
      }
      const grantByCustomerId: Record<number, { statements: boolean; pricelists: boolean }> = {};
      for (const resolved of queue.staffAtExisting) {
        if (!resolved.matchedCustomer) continue;
        const companyContactId = customerById.get(resolved.matchedCustomer.id)?.contact_id ?? null;
        const names = [
          ...(resolved.profile.crm_contact_id ? tagsByContactId[resolved.profile.crm_contact_id] ?? [] : []),
          ...(companyContactId ? tagsByContactId[companyContactId] ?? [] : []),
        ];
        grantByCustomerId[resolved.matchedCustomer.id] = {
          statements: tagsGrantFeatureAccess(names, "statements"),
          pricelists: tagsGrantFeatureAccess(names, "pricelists"),
        };
      }

      return { staffAtExisting: queue.staffAtExisting, newOrUnresolved: queue.newOrUnresolved, grantByCustomerId };
    },
  });

  const data = queueQuery.data;
  const total = (data?.staffAtExisting.length ?? 0) + (data?.newOrUnresolved.length ?? 0);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["portal-approvals-queue"] });
    queryClient.invalidateQueries({ queryKey: ["website-portals-customers"] });
    queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  const confirm = async (resolved: ResolvedPendingSignup) => {
    if (!resolved.matchedCustomer) return;
    try {
      await confirmPortalStaff.mutateAsync({ userId: resolved.profile.user_id, customerId: resolved.matchedCustomer.id });
      toast({ title: "Staff confirmed", description: `${displayName(resolved.profile)} is now linked to ${resolved.matchedCustomer.name ?? "the account"}.` });
      refresh();
    } catch (error: any) {
      toast({ title: "Could not confirm", description: error?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const archive = async (resolved: ResolvedPendingSignup) => {
    try {
      await archivePortalProfile.mutateAsync({ userId: resolved.profile.user_id, archived: true });
      toast({ title: "Signup archived", description: `${displayName(resolved.profile)} was removed from the queue.` });
      refresh();
    } catch (error: any) {
      toast({ title: "Could not archive", description: error?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const disable = async (resolved: ResolvedPendingSignup) => {
    try {
      await setLoginDisabled.mutateAsync({ userId: resolved.profile.user_id, disabled: true });
      await archivePortalProfile.mutateAsync({ userId: resolved.profile.user_id, archived: true });
      toast({ title: "Login disabled", description: `${displayName(resolved.profile)} can no longer sign in, and the signup was archived.` });
      refresh();
    } catch (error: any) {
      toast({ title: "Could not disable login", description: error?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const busy = confirmPortalStaff.isPending || archivePortalProfile.isPending || setLoginDisabled.isPending;

  if (queueQuery.isLoading || total === 0) return null;

  return (
    <Card className="shrink-0 border-amber-300 shadow-none hover:shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4" /> Signups awaiting approval
            </CardTitle>
            <CardDescription className="mt-1">
              Self-service signups with no linked account yet. Confirm staff at existing accounts in one click, or review new ones.
            </CardDescription>
          </div>
          <Badge variant="outline">{total}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data && data.staffAtExisting.length > 0 ? (
          <section className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Staff at existing accounts</p>
            {data.staffAtExisting.map((resolved) => {
              const grant = resolved.matchedCustomer ? data.grantByCustomerId[resolved.matchedCustomer.id] : undefined;
              const sensitive = [grant?.statements ? "Statements" : null, grant?.pricelists ? "Pricing" : null].filter(Boolean) as string[];
              const p = resolved.profile;
              return (
                <div key={p.user_id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{displayName(p)}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.email}{resolved.emailDomain ? ` · @${resolved.emailDomain}` : ""}
                        {p.organization_name ? ` · typed “${p.organization_name}”` : ""}
                      </p>
                      <p className="mt-1 text-xs">
                        Claims account <span className="font-mono font-medium">{p.claimed_account_number}</span> →{" "}
                        <span className="font-medium">{resolved.matchedCustomer?.name ?? "matched account"}</span>
                      </p>
                      {resolved.existingStaff.length > 0 ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Existing staff there: {resolved.existingStaff.slice(0, 4).map((s) => s.full_name || s.email).filter(Boolean).join(", ")}
                          {resolved.existingStaff.length > 4 ? ` +${resolved.existingStaff.length - 4}` : ""}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-amber-700">No other staff linked to this account yet — first login for it.</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 rounded-md bg-muted/50 p-2 text-[11px]">
                    <span className="font-medium">Confirming grants:</span> {ALWAYS_ON_FEATURES.join(", ")}
                    {sensitive.length > 0 ? (
                      <span className="text-amber-800"> — plus {sensitive.join(" & ")} (inherited from this account's tags)</span>
                    ) : (
                      <span className="text-muted-foreground"> · Statements & Pricing stay off (no granting tag on this account)</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" disabled={busy} onClick={() => confirm(resolved)}>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Confirm as staff
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => p.crm_contact_id && onReviewContact(p.crm_contact_id, "account-settings")} title="Open the contact to review before confirming">
                      Review contact
                    </Button>
                    <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={busy} onClick={() => archive(resolved)}>
                      <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600" disabled={busy} onClick={() => disable(resolved)}>
                      <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Disable login
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
        ) : null}

        {data && data.newOrUnresolved.length > 0 ? (
          <section className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">New / unresolved</p>
            {data.newOrUnresolved.map((resolved) => {
              const p = resolved.profile;
              return (
                <div key={p.user_id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{displayName(p)}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.email}{p.organization_name ? ` · typed “${p.organization_name}”` : ""}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {p.claimed_account_number
                        ? <>Claimed account <span className="font-mono">{p.claimed_account_number}</span> matched no customer — review manually.</>
                        : "No account number given — qualify and link, or archive."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busy || !p.crm_contact_id} onClick={() => p.crm_contact_id && onReviewContact(p.crm_contact_id, "account-settings")}>
                      Review &amp; link
                    </Button>
                    <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={busy} onClick={() => archive(resolved)}>
                      <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600" disabled={busy} onClick={() => disable(resolved)}>
                      <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Disable login
                    </Button>
                  </div>
                </div>
              );
            })}
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldAlert className="h-3 w-3" /> Account numbers appear on invoices, so a claim never grants access on its own — you confirm every match.
            </p>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
