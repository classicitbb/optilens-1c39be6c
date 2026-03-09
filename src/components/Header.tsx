import { useState, useRef, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Eye, LogOut, User, Package, Shield, ChevronDown, Menu, Search, Phone, Sun, Moon, Monitor } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useAccountRequestDismissed } from "@/components/AccountRequestBanner";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "next-themes";

type MegaMenuLink = {
  label: string;
  description: string;
  to?: string;
  href?: string;
  externalLabel?: string;
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
          { label: "Progressive", description: "Premium multifocal options for all-day use", to: "/lenses/progressive" },
          { label: "Office / Occupational", description: "Task-focused near and intermediate designs", to: "/lenses/office-occupational" },
          { label: "Anti-Fatigue", description: "Digital comfort with near support boost", to: "/lenses/anti-fatigue" },
          { label: "Single Vision", description: "Everyday distance and near correction", to: "/lenses/single-vision" },
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
        title: "ZenVue Collection",
        links: [
          { label: "Brilliance™ Progressive", description: "Featured progressive product page", to: "/zenvue/brilliance" },
          { label: "Single Vision", description: "Featured single-vision product page", to: "/zenvue/single-vision" },
          { label: "SunDun™ Polarized", description: "Featured polarized lens page", to: "/zenvue/sundun" },
          { label: "Darkun™ Photochromic", description: "Featured photochromic lens page", to: "/zenvue/darkun" },
          { label: "ZenVue Wholesale", description: "Partner application for optical professionals", to: "/zenvue/wholesale" },
        ],
      },
      {
        title: "Technical Specs",
        links: [
          { label: "Materials (1.50–1.74)", description: "Compare index and material performance", to: "/lenses/materials" },
          { label: "Thickness Chart", description: "Thickness guidance across prescriptions", to: "/lenses/thickness-chart" },
          { label: "Lens Design Guide", description: "Design and recommendation support", to: "/lenses/lens-types" },
        ],
      },
    ],
  },
  {
    label: "Coatings",
    sections: [
      {
        title: "Premium Performance",
        links: [
          { label: "UltraClear AR (Super AR)", description: "Multi-layer anti-reflective for maximum clarity", to: "/coatings/ultraclear-ar" },
          { label: "BlueBlock AR (BlueGuard)", description: "Blue-violet management with AR clarity", to: "/coatings/blueblock-ar" },
          { label: "Mirror Finish", description: "Fashion and sport mirror coatings", to: "/coatings/mirror" },
        ],
      },
      {
        title: "Everyday Protection",
        links: [
          { label: "Scratch-Resistant", description: "Hard coat durability foundation", to: "/coatings/scratch-resistant" },
          { label: "UV Shield — UVA, UVB, BV", description: "Ultraviolet and blue-violet filtering", to: "/coatings/uv-shield" },
          { label: "Hydrophobic & Oleophobic", description: "Water and oil repellent top coats", to: "/coatings/hydrophobic-oleophobic" },
        ],
      },
      {
        title: "Resources",
        links: [
          { label: "How AR Coating Works", description: "The science behind anti-reflective layers", to: "/knowledge#how-ar-coating-works" },
          { label: "Caring for Your Coated Lenses", description: "Maintenance tips and best practices", to: "/knowledge#caring-for-coated-lenses" },
        ],
      },
    ],
  },
  {
    label: "Professionals",
    sections: [
      {
        title: "For Optical Stores & Clinics",
        links: [
          { label: "Apply for a Trade Account", description: "Lead form (Odoo)", to: "/professionals/trade-account" },
          { label: "Online Ordering Portal", description: "Login to LabLink", href: "https://lablink.com", externalLabel: "External" },
          { label: "Order Tracking", description: "Track shipments and job status", href: "https://lablink.com/tracking", externalLabel: "External" },
          { label: "Price List Request", description: "Form (Odoo)", to: "/professionals/price-list-request" },
        ],
      },
      {
        title: "Technical Resources",
        links: [
          { label: "Dispensing Tips & Guide", description: "Professional dispensing and patient care", to: "/professionals/dispensing-tips" },
          { label: "Lab Process Overview", description: "Production flow and checkpoints", to: "/professionals/lab-process-overview" },
          { label: "Tracing & Cutting Guide", description: "Frame tracing best practices", to: "/professionals/tracing-cutting-guide" },
          { label: "Lens Ordering Tips", description: "Reduce hold-ups and remakes", to: "/professionals/lens-ordering-tips" },
          { label: "Chemistrie Lens System", description: "Magnetic clip system overview", to: "/professionals/chemistrie-lens-system" },
        ],
      },
      {
        title: "Support",
        links: [
          { label: "Customer Service", description: "Contact channels and service hours", to: "/professionals/customer-service" },
          { label: "Freight & Delivery Policy", description: "Shipping methods and SLAs", to: "/professionals/freight-delivery-policy" },
          { label: "Returns / Replacements", description: "RMA and remake policy", to: "/professionals/returns-replacements" },
        ],
      },
    ],
  },
  {
    label: "Patients",
    sections: [
      {
        title: "Understanding Your Lenses",
        links: [
          { label: "What’s the Difference Between Lenses?", description: "Single vision, progressives, and specialty options", to: "/patients#understanding-lenses" },
          { label: "Why Choose Progressive?", description: "All-distance vision in one pair", to: "/patients#understanding-lenses" },
          { label: "Eye Strain & Anti-Fatigue Lenses", description: "Support for screen-heavy days", to: "/patients#understanding-lenses" },
          { label: "Caring for Your Glasses", description: "Simple habits that protect lens coatings", to: "/patients#understanding-lenses" },
        ],
      },
      {
        title: "Find Care",
        links: [
          { label: "Find a Vision Expert Near You", description: "Connect with a licensed eye care professional", to: "/patients#find-care" },
          { label: "Ask Your Optician About Classic Visions", description: "Discuss lens options for your routine", to: "/patients#find-care" },
        ],
      },
      {
        title: "Vision Tips",
        links: [
          { label: "Computer & Mobile Use", description: "Reduce digital eye strain with practical habits", to: "/patients#vision-tips" },
          { label: "Sunlight & Protection", description: "UV and glare guidance for outdoor comfort", to: "/patients#vision-tips" },
          { label: "Regular Eye Exams", description: "Protect long-term vision health", to: "/patients#vision-tips" },
        ],
      },
    ],
  },
  {
    label: "About",
    sections: [
      {
        title: "About Us",
        links: [
          { label: "Our Story", description: "Learn how our company started", to: "/#about" },
          { label: "What Drives Us", description: "Our mission and values", to: "/#about" },
          { label: "Our Vision", description: "Where we are heading", to: "/#about" },
          { label: "News & Articles", description: "Latest updates and insights", to: "/knowledge" },
        ],
      },
      {
        title: "For Careers & Partnerships",
        links: [
          { label: "Join Our Team", description: "Career opportunities and culture", to: "/#contact" },
          { label: "Become a Partner", description: "Work with our wholesale network", to: "/for-professionals" },
          { label: "Media & Resources", description: "Press and informational materials", to: "/knowledge" },
        ],
      },
      {
        title: "Contact & Legal",
        links: [
          { label: "Contact Us", description: "Reach our team", to: "/#contact" },
          { label: "Terms of Use", description: "Read the terms for using our services", to: "/terms" },
          { label: "Privacy Policy", description: "Understand how we collect and use data", to: "/privacy-policy" },
        ],
      },
    ],
  },
];

const MegaMenu = ({ item }: { item: PrimaryMenuItem }) => {
  const [open, setOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [arrowLeft, setArrowLeft] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (open && btnRef.current && panelRef.current) {
      const btnRect = btnRef.current.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();
      const btnCenter = btnRect.left + btnRect.width / 2;
      setArrowLeft(btnCenter - panelRect.left);
    }
  }, [open]);

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
        ref={btnRef}
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
        <div ref={panelRef} className="fixed left-1/2 top-16 z-50 mt-3 w-[64rem] max-w-[95vw] -translate-x-1/2 rounded-xl border border-border bg-background p-4 shadow-lg">
          {/* Arrow pointing up at the trigger button */}
          <div style={{ left: arrowLeft }} className="absolute -top-2 -translate-x-1/2 h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-border" />
          <div style={{ left: arrowLeft }} className="absolute -top-[7px] -translate-x-1/2 h-0 w-0 border-x-[7px] border-b-[7px] border-x-transparent border-b-background" />
          <div className="grid gap-4 md:grid-cols-3">
          {item.sections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</p>
              <div className="grid gap-1">
                {section.links.map((link) => (
                  link.href ? (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleLinkClick}
                      className="rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                    >
                      <p className="text-sm font-medium text-foreground">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                      {link.externalLabel && <p className="text-[11px] font-semibold text-primary">{link.externalLabel}</p>}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      to={link.to || "/"}
                      onClick={handleLinkClick}
                      className="rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                    >
                      <p className="text-sm font-medium text-foreground">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    </Link>
                  )
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
  const { theme, resolvedTheme, setTheme } = useTheme();
  const activeTheme = theme ?? "system";

  const cycleThemeIcon = () => {
    if (activeTheme === "system") {
      return resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
    }

    return activeTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
  };

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
              <Button variant="ghost" size="sm" className="lg:hidden" aria-label="Open mobile navigation menu">
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
              <nav>
                <Accordion type="multiple" className="space-y-3">
                  {PRIMARY_MENU.map((item) => (
                    <AccordionItem key={item.label} value={item.label} className="rounded-lg border border-border/60 px-3">
                      <AccordionTrigger className="py-3 text-sm font-semibold text-foreground hover:no-underline">
                        {item.label}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pb-2">
                          {item.sections.map((section) => (
                            <div key={`${item.label}-${section.title}`}>
                              <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</p>
                              <div className="space-y-1">
                                {section.links.map((link) => (
                                  link.href ? (
                                    <a
                                      key={link.label}
                                      href={link.href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                      {link.label} {link.externalLabel ? `(${link.externalLabel})` : ""}
                                    </a>
                                  ) : (
                                    <Link key={link.label} to={link.to || "/"} className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                                      {link.label}
                                    </Link>
                                  )
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
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
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center gap-2">
                    {cycleThemeIcon()}
                    Theme
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={activeTheme} onValueChange={(value) => setTheme(value)}>
                      <DropdownMenuRadioItem value="light" className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark" className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="system" className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        System
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
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
