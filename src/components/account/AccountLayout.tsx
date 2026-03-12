import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BookUser,
  BadgeDollarSign,
  ChevronDown,
  CircleHelp,
  FileSignature,
  LifeBuoy,
  Search,
  ArrowLeft,
  User,
  Package,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const accountNav = [
  { label: "Account Home", to: "/profile", icon: User },
  { label: "My Account", to: "/profile/account", icon: User },
  { label: "Orders", to: "/profile/orders", icon: Package },
  { label: "Address Book", to: "/profile/address-book", icon: BookUser },
  { label: "Quotes", to: "/profile/quotes", icon: FileSignature },
  { label: "Helpdesk", to: "/profile/helpdesk", icon: LifeBuoy },
  { label: "Pricelists", to: "/profile/pricelists", icon: BadgeDollarSign },
];

const getPageTitle = (pathname: string) => {
  if (pathname === "/profile") return "Customer Account";
  if (pathname === "/profile/account") return "My Account";
  if (pathname === "/profile/orders") return "My Orders";
  if (pathname === "/profile/address-book") return "Address Book";
  if (pathname === "/profile/quotes") return "Quote Requests";
  if (pathname === "/profile/helpdesk") return "Helpdesk Tickets";
  if (pathname === "/profile/pricelists") return "Assigned Pricelists";
  if (pathname.startsWith("/profile/")) return "Account";
  return "Customer Account";
};

const getDisplayName = (email?: string | null) => {
  if (!email) return "Customer";
  const [name] = email.split("@");
  return name || "Customer";
};

const AccountLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const pageTitle = getPageTitle(location.pathname);
  const displayName = getDisplayName(user?.email);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          <h1 className="text-sm font-semibold tracking-wide text-foreground sm:text-base">{pageTitle}</h1>

          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <div className="relative hidden w-36 sm:block md:w-56">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value=""
                disabled
                aria-label="Search"
                placeholder="Search (coming soon)"
                className="h-9 pl-8"
              />
            </div>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Help">
              <CircleHelp className="h-4 w-4" />
            </Button>
            <span className="hidden text-sm font-medium text-foreground md:inline">{displayName}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-1.5">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs uppercase">{displayName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="hidden w-64 shrink-0 border-r pr-4 lg:block">
          <nav aria-label="Account navigation" className="space-y-1">
            {accountNav.map(({ label, to, icon: Icon, disabled }) => {
              const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);

              if (disabled) {
                return (
                  <span
                    key={to}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground opacity-60"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                );
              }

              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AccountLayout;
