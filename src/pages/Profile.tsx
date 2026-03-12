import { Link } from "react-router-dom";
import { BookUser, BadgeDollarSign, FileSignature, LifeBuoy, Package, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    description: "Manage saved shipping addresses.",
    to: "/profile/address-book",
    icon: BookUser,
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

const Profile = () => (
  <section className="space-y-6">
    <header className="space-y-1">
      <h2 className="text-2xl font-semibold text-foreground">Customer Account</h2>
      <p className="text-sm text-muted-foreground">Choose a section to manage your account.</p>
    </header>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {quickSections.map(({ title, description, to, icon: Icon }) => (
        <Card key={to}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to={to}>Open section</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </section>
);

export default Profile;
