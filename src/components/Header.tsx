import { useState, useRef, useEffect } from "react";
import { Eye, LogOut, User, Package, Shield, ChevronDown, Menu, Search, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useAccountRequestDismissed } from "@/components/AccountRequestBanner";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

type MegaMenuLink = {
  label: string;
  description: string;
  to: string;
};

type MegaMenuSection = {
  title: string;
  links: MegaMenuLink[];
};

type PrimaryMenuItem = {
  label: string;
  sections: MegaMenuSection[];
};

const PRIMARY_MENU: PrimaryMenuItem[] = [
  {
    label: "Lenses",
    sections: [
      {
        title: "Everyday Vision",
        links: [
          { label: "Progressive (All-Day Use)", description: "Premium multifocal options", to: "/zenvue/brilliance" },
          { label: "Office / Occupational", description: "Task-focused near and intermediate designs", to: "/lenses/office-occupational" },
          { label: "Anti-Fatigue", description: "Digital comfort with near support", to: "/lenses/anti-fatigue" },
          { label: "Single Vision", description: "Everyday distance and near correction", to: "/zenvue/single-vision" },
        ],
      },
      {
        title: "Lifestyle Lenses",
        links: [
          { label: "Photochromic", description: "Adaptive light-responsive lens technology", to: "/zenvue/darkun" },
          { label: "Blue Filter", description: "Lens options for long digital sessions", to: "/lenses/blue-filter" },
          { label: "Polarized", description: "Outdoor glare-cutting sun lens solutions", to: "/zenvue/sundun" },
          { label: "Tints & Fashion Colors", description: "Style and performance tint palettes", to: "/lenses/tints-fashion-colors" },
        ],
      },
      {
        title: "Technical Specs",
        links: [
          { label: "Materials (1.50, 1.56, 1.60, 1.67, 1.74)", description: "Compare index and material performance", to: "/lenses/materials" },
          { label: "Edge & Center Thickness Chart", description: "Thickness guidance across prescriptions", to: "/lenses/thickness-chart" },
          { label: "Lens Design Guide", description: "Design and recommendation support", to: "/lenses/lens-types" },
        ],
      },
    ],
  },
  {
    label: "Coatings",
    sections: [
      {
        title: "Lens Treatments",
        links: [
          { label: "Mirror & Finish Guide", description: "Compare coating and finish options", to: "/mirror-finish-guide" },
          { label: "Sun & Specialty", description: "Photochromic and tinted offerings", to: "/zenvue/sundun" },
          { label: "Knowledge Articles", description: "Technical coating resources", to: "/knowledge#lens-coatings" },
        ],
      },
    ],
  },
  {
    label: "Professionals",
    sections: [
      {
        title: "For Optical Teams",
        links: [
          { label: "Professionals Overview", description: "Programs built for practices", to: "/for-professionals" },
          { label: "Lens Design Guide", description: "Design and recommendation support", to: "/lenses/lens-types" },
          { label: "Wholesale Program", description: "Partner with our lab network", to: "/zenvue/wholesale" },
        ],
      },
    ],
  },
  {
    label: "Patients",
    sections: [
      {
        title: "Patient Education",
        links: [
          { label: "ZenVue Overview", description: "Learn about lens families", to: "/zenvue" },
          { label: "Compare Lens Options", description: "See lifestyle recommendations", to: "/zenvue/compare" },
          { label: "Knowledge Base", description: "Patient-friendly lens education", to: "/knowledge" },
        ],
      },
    ],
  },
  {
    label: "About",
    sections: [
      {
        title: "Company",
        links: [
          { label: "About OptiVisionNow", description: "Our mission and values", to: "/#about" },
          { label: "Contact Us", description: "Reach our team", to: "/#contact" },
          { label: "Legal", description: "Policies and terms", to: "/legal" },
        ],
      },
    ],
  },
];

const MegaMenu = ({ item }: { item: PrimaryMenuItem }) => {
  const [open, setOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setIsPinnedOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleTriggerClick = () => {
    if (isPinnedOpen) {
      setOpen(false);
      setIsPinnedOpen(false);
      return;
    }

    setOpen(true);
    setIsPinnedOpen(true);
  };

  const handleLinkClick = () => {
    setOpen(false);
    setIsPinnedOpen(false);
  };

  return (
    <div
      className="relative"
      ref={ref}
    >
      <button
        type="button"
        onClick={handleTriggerClick}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {item.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-3 w-[62rem] max-w-[95vw] -translate-x-1/2 rounded-xl border border-border bg-background p-4 shadow-lg">
          <div className={`grid gap-4 ${item.sections.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            {item.sections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</p>
                <div className="grid gap-1">
                  {section.links.map((link) => (
                    <Link
                      key={link.label}
                      to={link.to}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                    >
                      <p className="text-sm font-medium text-foreground">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Header = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { hasAccess, role, isLoading: roleLoading } = useUserRole();
  const bannerDismissed = useAccountRequestDismissed();
  const showRequestInMenu = !!user && !roleLoading && !role && bannerDismissed;

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent">
            <Eye className="h-5 w-5 text-accent-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">OptiVisionNow</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {PRIMARY_MENU.map((item) => (
            <MegaMenu key={item.label} item={item} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetTitle className="mb-6 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-accent">
                  <Eye className="h-4 w-4 text-accent-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">OptiVisionNow</span>
              </SheetTitle>
              <nav className="flex flex-col gap-3">
                {PRIMARY_MENU.map((item) => (
                  <div key={item.label} className="rounded-lg border border-border/60 p-3">
                    <p className="mb-2 text-sm font-semibold text-foreground">{item.label}</p>
                    <div className="space-y-2">
                      {item.sections.flatMap((section) => section.links).map((link) => (
                        <Link key={link.label} to={link.to} className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link to="/store">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Link>
          </Button>

          <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
            <a href="tel:+12464334928">
              <Phone className="mr-2 h-4 w-4" />
              +1 246 433-4928
            </a>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <User className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Account</span>
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/orders" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Orders
                  </Link>
                </DropdownMenuItem>
                {hasAccess && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                {showRequestInMenu && (
                  <DropdownMenuItem
                    onClick={() => {
                      toast({ title: "Request Submitted", description: "Your customer account request has been sent. We'll be in touch shortly!" });
                    }}
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Request Account
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">
                <User className="mr-2 h-4 w-4" />
                Sign in
              </Link>
            </Button>
          )}

          <Button variant="hero" size="sm" asChild>
            <Link to="/store">Order Lenses</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
