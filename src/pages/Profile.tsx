import { Link } from "react-router-dom";
import { BookUser, BadgeDollarSign, FileSignature, LifeBuoy, LockKeyhole, Package, User, WalletCards } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPortalFeatureBlockedReason, type PortalFeature, usePortalIdentity } from "@/hooks/usePortalIdentity";

const quickSections = [
  {
    title: "My Account",
    description: "Edit profile details and security settings.",
    to: "/profile/account",
    icon: User,
  },
  {
    title: "My Orders",
    description: "View order history and statuses.",
    to: "/profile/orders",
    icon: Package,
  },
  {
    title: "Address Book",
    description: "Manage up to 2 saved checkout addresses.",
    to: "/profile/address-book",
    icon: BookUser,
  },
  {
    title: "Payment Methods",
    description: "Store tokenized demo cards for one-click ordering.",
    to: "/profile/payment-methods",
    icon: WalletCards,
  },
  {
    title: "Quotes",
    description: "Create and track quote requests.",
    to: "/profile/quotes",
    icon: FileSignature,
  },
  {
    title: "Helpdesk",
    description: "Follow your support tickets.",
    to: "/profile/helpdesk",
    icon: LifeBuoy,
  },
  {
    title: "Pricelists",
    description: "See account-assigned pricelists.",
    to: "/profile/pricelists",
    icon: BadgeDollarSign,
  },
];

const gatedSections = new Map<string, PortalFeature>([
  ["/profile/quotes", "quotes"],
  ["/profile/helpdesk", "helpdesk"],
  ["/profile/pricelists", "pricelists"],
]);

const Profile = () => {
  const { identity, canAccessFeature } = usePortalIdentity();
  const quoteReason = getPortalFeatureBlockedReason(identity, "quotes");

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Customer Account</h2>
        <p className="text-sm text-muted-foreground">Choose a section to manage your account.</p>
      </header>

      <Card className="border-dashed bg-muted/30">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Portal access status</CardTitle>
            <CardDescription>{identity?.portalAccessNote || quoteReason.description}</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit gap-1.5">
            <LockKeyhole className="h-3.5 w-3.5" />
            {identity?.portalAccessStatus?.replace(/_/g, " ") || "pending profile"}
          </Badge>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickSections.map(({ title, description, to, icon: Icon }) => {
          const gatedFeature = gatedSections.get(to);
          const locked = gatedFeature ? !canAccessFeature(gatedFeature) : false;

          return (
            <Card key={to} className={locked ? "border-dashed" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5" />
                  {title}
                </CardTitle>
                <CardDescription>{locked ? `${description} Available after customer approval.` : description}</CardDescription>
              </CardHeader>
              <CardContent>
                {locked ? (
                  <div className="space-y-3">
                    <Badge variant="secondary" className="gap-1.5">
                      <LockKeyhole className="h-3.5 w-3.5" />
                      Customer-only
                    </Badge>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/profile/account">Complete setup</Link>
                    </Button>
                  </div>
                ) : (
                  <Button asChild variant="outline" className="w-full">
                    <Link to={to}>Open section</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default Profile;
