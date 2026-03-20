import { Link } from "react-router-dom";
import { BadgeCheck, Building2, FileCheck2, LockKeyhole, MailCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type PortalAccessStatus, type PortalFeature, getPortalFeatureBlockedReason, usePortalIdentity } from "@/hooks/usePortalIdentity";

const statusMeta: Record<PortalAccessStatus, { label: string; icon: typeof ShieldAlert }> = {
  pending_verification: { label: "Verify email", icon: MailCheck },
  pending_profile: { label: "Complete profile", icon: FileCheck2 },
  pending_approval: { label: "Pending approval", icon: ShieldAlert },
  approved_customer: { label: "Approved customer", icon: BadgeCheck },
};

const featureLabels: Record<PortalFeature, string> = {
  quotes: "Quotes",
  helpdesk: "Helpdesk",
  pricelists: "Pricelists",
  "private-orders": "Private orders",
};

interface PortalAccessNoticeProps {
  feature: PortalFeature;
}

const PortalAccessNotice = ({ feature }: PortalAccessNoticeProps) => {
  const { identity, isLoading } = usePortalIdentity();
  const reason = getPortalFeatureBlockedReason(identity, feature);
  const meta = statusMeta[identity?.portalAccessStatus ?? "pending_profile"];
  const StatusIcon = meta.icon;

  return (
    <Card className="border-dashed bg-muted/30">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">{reason.title}</CardTitle>
              <CardDescription>{reason.description}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <StatusIcon className="h-3.5 w-3.5" />
            {meta.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workflow</p>
            <p className="mt-2 text-sm text-foreground">{featureLabels[feature]} is limited to approved customer accounts.</p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Organization</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {identity?.organizationName?.trim() || "No organization added yet"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/profile/account">Complete account setup</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/contact">Contact support</Link>
          </Button>
        </div>

        {isLoading ? <p className="text-xs text-muted-foreground">Refreshing customer access…</p> : null}
      </CardContent>
    </Card>
  );
};

export default PortalAccessNotice;
