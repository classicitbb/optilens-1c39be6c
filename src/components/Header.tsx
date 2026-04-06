import { useState, useRef, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LogOut, User, Package, Shield, ChevronDown, Menu, Phone, Sun, Moon, Monitor, Search, Sparkles, Settings, Palette, ShoppingCart } from "lucide-react";
import cleanLogoSmooth from "@/assets/clean_logo_smooth.svg";
import { Link, useLocation } from "react-router";
import { Button } from "@/components/ui/button";

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useAccountRequestDismissed } from "@/components/AccountRequestBanner";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "next-themes";
import { CartSheet } from "@/components/CartSheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { resolveUserAvatar, resolveUserFullName } from "@/lib/profileData";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { LABLINK_PORTAL_URL, LABLINK_TRACKING_URL } from "@/config/externalLinks";

type MegaMenuLink = {
  label: string;
  description: string;
  to?: string;
  href?: string;
  externalLabel?: string;
  isCta?: boolean;
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
    { label: "Bifocals", description: "Classic bifocal options and freeform alternatives", to: "/lenses/bifocals" }]

  },
  {
    title: "Lifestyle Lenses",
    links: [
    { label: "Photochromic", description: "Adaptive light-responsive lens technology", to: "/photochromic" },
    { label: "Blue Filter", description: "Lens options for long digital sessions", to: "/lenses/blue-filter" },
    { label: "Polarized", description: "Outdoor glare-cutting sun lens solutions", to: "/lenses/polarized" },
    { label: "Tints & Fashion Colors", description: "Style and performance tint palettes", to: "/lenses/tints-fashion-colors" },
    { label: "Myopia Control", description: "Evidence-based options for slowing myopia progression", to: "/lenses/myopia-control" }]

  },
  {
    title: "ZenVue Collection",
    links: [
    { label: "Brilliance™ Progressive", description: "Featured progressive product page", to: "/zenvue/brilliance" },
    { label: "Single Vision", description: "Featured single-vision product page", to: "/zenvue/single-vision" },
    { label: "Photochromic Guide", description: "Compare Darkun™, Transitions® families, and use-cases", to: "/photochromic" },
    { label: "ZenVue Wholesale", description: "Partner application for optical professionals", to: "/zenvue/wholesale" }]

  },
  {
    title: "Technical Specs",
    links: [
    { label: "Materials (1.50–1.74)", description: "Compare index and material performance", to: "/lenses/materials" },
    { label: "Thickness Chart", description: "Thickness guidance across prescriptions", to: "/lenses/thickness-chart" },
    { label: "Lens Design Guide", description: "Design and recommendation support", to: "/lenses/lens-types" }]

  }]

},
{
  label: "Coatings",
  sections: [
  {
    title: "Premium Performance",
    links: [
    { label: "UltraClear AR (Super AR)", description: "Multi-layer anti-reflective for maximum clarity", to: "/coatings/ultraclear-ar" },
    { label: "BlueBlock AR (Blue Defense)", description: "Blue-violet management with AR clarity", to: "/coatings/blueblock-ar" },
    { label: "Mirror Finish", description: "Fashion and sport mirror coatings", to: "/coatings/mirror" }]

  },
  {
    title: "Everyday Protection",
    links: [
    { label: "Scratch-Resistant", description: "Hard coat durability foundation", to: "/coatings/scratch-resistant" },
    { label: "UV Shield — UVA, UVB, BV", description: "Ultraviolet and blue-violet filtering", to: "/coatings/uv-shield" },
    { label: "Hydrophobic & Oleophobic", description: "Water and oil repellent top coats", to: "/coatings/hydrophobic-oleophobic" }]

  },
  {
    title: "Resources",
    links: [
    { label: "How AR Coating Works", description: "The science behind anti-reflective layers", to: "/knowledge#how-ar-coating-works" },
    { label: "Caring for Your Coated Lenses", description: "Maintenance tips and best practices", to: "/knowledge#caring-for-coated-lenses" }]

  }]

},
{
  label: "Professionals",
  sections: [
  {
    title: "For Optical Stores & Clinics",
    links: [
    { label: "Apply for a Trade Account", description: "Lead form", to: "/professionals/trade-account" },
    { label: "Online Ordering Portal", description: "Login to LabLink", href: LABLINK_PORTAL_URL, externalLabel: "External" },
    { label: "Order Tracking", description: "Track shipments and job status", href: LABLINK_TRACKING_URL, externalLabel: "External" },
    { label: "Price List Request", description: "Form", to: "/professionals/price-list-request" }]

  },
  {
    title: "Technical Resources",
    links: [
    { label: "Dispensing Tips & Guide", description: "Professional dispensing videos and patient-care coaching", to: "/dispensing-tips" },
    { label: "Lab Process Overview", description: "Production flow and checkpoints", to: "/professionals/lab-process-overview" },
    { label: "Tracing & Cutting Guide", description: "Frame tracing best practices", to: "/professionals/tracing-cutting-guide" },
    { label: "Lens Ordering Tips", description: "Reduce hold-ups and remakes", to: "/professionals/lens-ordering-tips" },
    { label: "Chemistrie Lens System", description: "Magnetic clip system overview", to: "/professionals/chemistrie-lens-system" },
    { label: "ZenVue Wholesale", description: "Feature-page application for optical partners", to: "/zenvue/wholesale" }]

  },
  {
    title: "Support",
    links: [
    { label: "Knowledge Hub", description: "Browse guides, FAQs, and support articles", to: "/knowledge", isCta: true },
    { label: "Customer Service", description: "Contact channels and service hours", to: "/professionals/customer-service" },
    { label: "Freight & Delivery Policy", description: "Transit times, customs, tracking, and delivery support", to: "/professionals/freight-delivery-policy" },
    { label: "Returns / Replacements", description: "Eligibility, reporting windows, and remake requests", to: "/professionals/returns-replacements" },
    { label: "Repairs Policy", description: "Repair assessment, risk, and liability terms", to: "/professionals/repairs-policy" },
    { label: "Customer-Supplied Frames", description: "At-risk glazing terms for customer-owned frames", to: "/professionals/customer-supplied-frames-policy" }]

  }]

},
{
  label: "Patients",
  sections: [
  {
    title: "Understanding Your Lenses",
    links: [
    { label: "What’s the Difference Between Lenses?", description: "Single vision, progressives, and specialty options", to: "/patients/lens-differences" },
    { label: "Why Choose Progressive?", description: "All-distance vision in one pair", to: "/patients/progressive-lenses" },
    { label: "Eye Strain & Anti-Fatigue Lenses", description: "Support for screen-heavy days", to: "/patients/anti-fatigue-lenses" },
    { label: "Caring for Your Glasses", description: "Simple habits that protect lens coatings", to: "/patients/caring-for-glasses" }]

  },
  {
    title: "Find Care",
    links: [
    { label: "Find a Vision Expert Near You", description: "Search by island, retailer, or clinic type", to: "/find-a-retailer" },
    { label: "Barbados Retailers", description: "Explore the Barbados-focused retailer guide", to: "/find-a-retailer/barbados" },
    { label: "Ask Your Optician About Classic Visions", description: "Discuss lens options for your routine", to: "/patients#find-care" }]

  },
  {
    title: "Vision Tips",
    links: [
    { label: "Computer & Mobile Use", description: "Reduce digital eye strain with practical habits", to: "/patients/computer-mobile-use" },
    { label: "Sunlight & Protection", description: "UV and glare guidance for outdoor comfort", to: "/patients/sunlight-protection" },
    { label: "Regular Eye Exams", description: "Protect long-term vision health", to: "/patients/regular-eye-exams" },
    { label: "Night Driving Aids", description: "Reduce glare and improve clarity after dark", to: "/patients/night-driving-aids" }]

  }]

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
    { label: "News & Articles", description: "Latest updates and insights", to: "/knowledge" }]

  },
  {
    title: "For Careers & Partnerships",
    links: [
    { label: "Join Our Team", description: "Career opportunities and culture", to: "/#contact" },
    { label: "Become a Partner", description: "Work with our wholesale network", to: "/professionals" },
    { label: "Media & Resources", description: "Press and informational materials", to: "/knowledge" }]

  },
  {
    title: "Contact & Legal",
    links: [
    { label: "Contact Us", description: "Reach our team", to: "/#contact" },
    { label: "Terms of Use", description: "Read the terms for using our services", to: "/terms" },
    { label: "Privacy Policy", description: "Understand how we collect and use data", to: "/privacy-policy" }]

  }]

}];


const BREADCRUMB_LABELS: Record<string, string> = {
  "professionals": "Professionals",
  "lens-types": "Lens Types",
  "office-occupational": "Office / Occupational",
  "anti-fatigue": "Anti-Fatigue",
  "single-vision": "Single Vision",
  bifocals: "Bifocals",
  "myopia-control": "Myopia Control",
  "blue-filter": "Blue Filter",
  polarized: "Polarized",
  "tints-fashion-colors": "Tints & Fashion Colors",
  "thickness-chart": "Thickness Chart",
  "ultraclear-ar": "UltraClear AR",
  "blueblock-ar": "BlueBlock AR",
  "uv-shield": "UV Shield",
  "hydrophobic-oleophobic": "Hydrophobic & Oleophobic",
  "lens-differences": "Lens Differences",
  "progressive-lenses": "Progressive Lenses",
  "anti-fatigue-lenses": "Anti-Fatigue Lenses",
  "caring-for-glasses": "Caring for Glasses",
  "computer-mobile-use": "Computer & Mobile Use",
  "sunlight-protection": "Sunlight & Protection",
  "regular-eye-exams": "Regular Eye Exams",
  "night-driving-aids": "Night Driving Aids",
  "chemistrie-lens-system": "Chemistrie Lens System",
  "dispensing-tips": "Dispensing Tips",
  "find-a-retailer": "Find a Retailer",
  "tracing-cutting-guide": "Tracing & Cutting Guide",
  "lab-process-overview": "Lab Process Overview",
  "lens-ordering-tips": "Lens Ordering Tips"
};



const BREADCRUMB_NAV_TARGETS = new Set<string>([
"/",
"/auth",
"/reset-password",
"/store",
"/knowledge",
"/profile",
"/orders",
"/lenses",
"/patients",
"/professionals",
"/find-a-retailer",
"/dispensing-tips",
"/zenvue"]
);

const resolveBreadcrumbTarget = (candidatePath: string) =>
BREADCRUMB_NAV_TARGETS.has(candidatePath) ? candidatePath : "/";


const getBreadcrumbLabel = (segment: string) => {
  const normalized = segment.toLowerCase();
  if (BREADCRUMB_LABELS[normalized]) {
    return BREADCRUMB_LABELS[normalized];
  }

  return segment.
  split("-").
  map((part) => part.charAt(0).toUpperCase() + part.slice(1)).
  join(" ");
};

const MegaMenu = ({ item }: {item: PrimaryMenuItem;}) => {
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
      ref={ref}>
      
      <button
        ref={btnRef}
        type="button"
        onClick={handleTriggerClick}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        aria-haspopup="menu"
        aria-expanded={open}>
        
        {item.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open &&
      <div ref={panelRef} className="fixed left-1/2 top-16 z-50 mt-3 w-[64rem] max-w-[95vw] -translate-x-1/2 rounded-xl border border-border bg-background p-4 shadow-lg">
          {/* Arrow pointing up at the trigger button */}
          <div
          style={{ left: arrowLeft }}
          className="absolute -top-1.5 z-10 h-3 w-3 -translate-x-1/2 rotate-45 rounded-[2px] border shadow-none border-amber-400 bg-[#e7b318]" />
        
          <div className="grid gap-4 md:grid-cols-3">
          {item.sections.map((section) =>
          <div key={section.title}>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</p>
              <div className="grid gap-1">
                {section.links.map((link) =>
              link.href ?
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleLinkClick}
                className={`rounded-lg px-2 py-2 transition-colors ${link.isCta ? "border border-primary/40 bg-primary/5 hover:bg-primary/10" : "hover:bg-muted"}`}>
                
                      <p className={`text-sm font-medium ${link.isCta ? "text-primary" : "text-foreground"}`}>{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                      {link.externalLabel && <p className="text-[11px] font-semibold text-primary">{link.externalLabel}</p>}
                    </a> :

              link.to?.includes("#") && !link.to.startsWith("#") ?
              <a
                key={link.label}
                href={link.to}
                onClick={handleLinkClick}
                className={`rounded-lg px-2 py-2 transition-colors ${link.isCta ? "border border-primary/40 bg-primary/5 hover:bg-primary/10" : "hover:bg-muted"}`}>
                
                        <p className={`text-sm font-medium ${link.isCta ? "text-primary" : "text-foreground"}`}>{link.label}</p>
                        <p className="text-xs text-muted-foreground">{link.description}</p>
                      </a> :

              <Link
                key={link.label}
                to={link.to || "/"}
                onClick={handleLinkClick}
                className={`rounded-lg px-2 py-2 transition-colors ${link.isCta ? "border border-primary/40 bg-primary/5 hover:bg-primary/10" : "hover:bg-muted"}`}>
                
                      <p className={`text-sm font-medium ${link.isCta ? "text-primary" : "text-foreground"}`}>{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    </Link>


              )}
              </div>
            </div>
          )}
          </div>
        </div>
      }
    </div>);

};

const THEME_OPTIONS = [
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
] as const;

const getAccountInitials = (name: string, email: string) => {
  const source = name || email;
  const parts = source
    .split(/\s+|@|\.|_|-/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "AC";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "AC";
};

const Header = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { hasAccess, role, isLoading: roleLoading } = useUserRole();
  const bannerDismissed = useAccountRequestDismissed();
  const showRequestInMenu = !!user && !roleLoading && !role && bannerDismissed;
  const { theme, resolvedTheme, setTheme } = useTheme();
  const activeTheme = theme ?? "system";
  const activeUserName = resolveUserFullName(user) || user?.email?.split("@")[0] || "Account";
  const activeUserEmail = user?.email?.trim() || "";
  const activeUserAvatar = resolveUserAvatar(user);
  const activeUserInitials = getAccountInitials(activeUserName, activeUserEmail);
  const resolvedThemeValue = activeTheme === "system" ? resolvedTheme ?? "system" : activeTheme;
  const { data: storeProducts = [] } = useStoreProducts();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out."
    });
  };

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const storeProductMatch = location.pathname.match(/^\/store\/product\/(lens|supply|addon)\/([^/]+)$/i);
  const storeProductType = storeProductMatch?.[1]?.toLowerCase() as "lens" | "supply" | "addon" | undefined;
  const storeProductId = storeProductMatch?.[2];
  const storeProduct = storeProductType && storeProductId
    ? storeProducts.find((product) => product.product_type === storeProductType && product.id === storeProductId)
    : null;

  const customBreadcrumbs = storeProductMatch
    ? [
      { label: "Home", to: "/" },
      { label: "Store", to: "/store" },
      { label: "Product", to: "/store" },
      { label: storeProductType === "lens" ? "Lenses" : storeProductType === "supply" ? "Supplies" : "Services", to: `/store?tab=${storeProductType === "lens" ? "lenses" : storeProductType === "supply" ? "supplies" : "services"}` },
      { label: storeProduct?.name ?? "Product", to: null },
    ]
    : null;

  const showBreadcrumbs = (customBreadcrumbs?.length ?? pathSegments.length) >= 2;

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md" role="banner">
      <a href="#main-content" className="skip-to-content">Skip to content</a>
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2" aria-label="Classic Visions home">
          <div className="flex h-10 w-10 items-center justify-center">
              <img src={cleanLogoSmooth} alt="Classic Visions" className="h-8 w-8" />
            </div>
          <span className="text-xl font-bold text-foreground">Classic Visions</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
          {PRIMARY_MENU.map((item) =>
            <MegaMenu key={item.label} item={item} />
            )}
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
                <div className="flex h-8 w-8 items-center justify-center">
                  <img src={cleanLogoSmooth} alt="Classic Visions" className="h-6 w-6" />
                </div>
                <span className="text-lg font-bold text-foreground">Classic Visions</span>
              </SheetTitle>
              <nav>
                <Accordion type="multiple" className="space-y-3">
                  {PRIMARY_MENU.map((item) =>
                    <AccordionItem key={item.label} value={item.label} className="rounded-lg border border-border/60 px-3">
                      <AccordionTrigger className="py-3 text-sm font-semibold text-foreground hover:no-underline">
                        {item.label}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pb-2">
                          {item.sections.map((section) =>
                          <div key={`${item.label}-${section.title}`}>
                              <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</p>
                              <div className="space-y-1">
                                {section.links.map((link) =>
                              link.href ?
                              <a
                                key={link.label}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`block rounded-md px-2 py-1.5 text-sm ${link.isCta ? "border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                                
                                      {link.label} {link.externalLabel ? `(${link.externalLabel})` : ""}
                                    </a> :

                              <Link key={link.label} to={link.to || "/"} className={`block rounded-md px-2 py-1.5 text-sm ${link.isCta ? "border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                                      {link.label}
                                    </Link>

                              )}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    )}
                </Accordion>
              </nav>
            </SheetContent>
          </Sheet>

              <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => {
                if (location.pathname !== "/") {
                  window.location.href = "/#site-search";
                  return;
                }
                const el = document.getElementById("site-search");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  const input = el.querySelector("input");
                  if (input) setTimeout(() => input.focus(), 600);
                }
              }}>
              
                <Search className="h-4 w-4" />
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </Button>

              <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
                <a href="tel:+12464334928">
                  <Phone className="mr-2 h-4 w-4" />
                  Call Us
                </a>
              </Button>

              {user ?
            <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-11 rounded-full border border-border/60 bg-background/70 px-1.5 shadow-sm transition-all hover:bg-muted/80 sm:gap-2 sm:px-2.5"
                    >
                      <Avatar className="h-8 w-8 border border-border/60">
                        <AvatarImage src={activeUserAvatar || undefined} alt={activeUserName} />
                        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-foreground">
                          {activeUserInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="sr-only">Open account menu for {activeUserName}</span>
                      <span className="hidden min-w-0 flex-1 text-left sm:block">
                        <span className="block truncate text-sm font-semibold text-foreground">{activeUserName}</span>
                        <span className="hidden truncate text-xs text-muted-foreground md:block">Account</span>
                      </span>
                      <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={10}
                    className="w-[min(88vw,18rem)] rounded-2xl border-border/60 bg-background/95 p-0 shadow-2xl shadow-black/10 backdrop-blur-xl"
                  >
                    <div className="space-y-1 p-2.5 sm:p-3">
                      <div className="flex items-center gap-2.5 rounded-xl px-1 py-1">
                        <Avatar className="h-10 w-10 border border-primary/15 shadow-sm">
                          <AvatarImage src={activeUserAvatar || undefined} alt={activeUserName} />
                          <AvatarFallback className="bg-primary/25 text-sm font-semibold text-foreground">
                            {activeUserInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{activeUserName}</p>
                          <p className="truncate text-xs text-muted-foreground">{activeUserEmail}</p>
                        </div>
                      </div>

                      <div className="space-y-1 pt-1">
                        <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 focus:bg-accent/70">
                          <Link to="/profile/account" className="flex items-center gap-3">
                            <Settings className="h-4.5 w-4.5 text-foreground/80" />
                            <span className="text-sm font-medium">Account settings</span>
                          </Link>
                        </DropdownMenuItem>

                        <div className="rounded-xl px-2.5 py-2 text-foreground outline-none ring-0 transition-colors hover:bg-accent/50 focus-within:bg-accent/70">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              <Palette className="h-4.5 w-4.5 text-foreground/80" />
                              <div>
                                <p className="text-sm font-medium leading-none">Appearance</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">Theme follows your preference instantly.</p>
                              </div>
                            </div>
                            <ToggleGroup
                              type="single"
                              value={activeTheme}
                              onValueChange={(value) => {
                                if (value) setTheme(value);
                              }}
                              aria-label="Appearance theme"
                              className="w-full justify-start rounded-full border border-border/70 bg-muted/60 p-0.5 sm:w-auto sm:justify-center"
                            >
                              {THEME_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                const isActive = activeTheme === option.value;
                                const isResolved = activeTheme === "system" && resolvedThemeValue === option.value;

                                return (
                                  <ToggleGroupItem
                                    key={option.value}
                                    value={option.value}
                                    aria-label={option.label}
                                    className={cn(
                                      "h-7 flex-1 rounded-full border-0 px-2 text-muted-foreground shadow-none hover:bg-background/80 hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm sm:flex-none",
                                      isActive && "ring-1 ring-border/60",
                                    )}
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                    <span className="sr-only">{option.label}</span>
                                    {isResolved && !isActive ? <span className="sr-only">Active via system theme</span> : null}
                                  </ToggleGroupItem>
                                );
                              })}
                            </ToggleGroup>
                          </div>
                        </div>
                      </div>

                      <DropdownMenuSeparator className="mx-0 my-2" />

                      <div className="space-y-1">
                        <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 focus:bg-accent/70">
                          <Link to="/orders" className="flex items-center gap-3">
                            <Package className="h-4.5 w-4.5 text-foreground/80" />
                            <span className="text-sm font-medium">Orders</span>
                          </Link>
                        </DropdownMenuItem>
                        {hasAccess &&
                <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 focus:bg-accent/70">
                            <Link to="/admin" className="flex items-center gap-3">
                              <Shield className="h-4.5 w-4.5 text-foreground/80" />
                              <span className="text-sm font-medium">Admin</span>
                            </Link>
                          </DropdownMenuItem>
                }
                        {showRequestInMenu &&
                <DropdownMenuItem
                            onClick={() => {toast({ title: "Request Submitted", description: "Your customer account request has been sent. We'll be in touch shortly!" });}}
                            className="rounded-xl px-2.5 py-2 focus:bg-accent/70"
                          >
                            <User className="h-4.5 w-4.5 text-foreground/80" />
                            <span className="text-sm font-medium">Request Account</span>
                          </DropdownMenuItem>
                }
                      </div>

                      <DropdownMenuSeparator className="mx-0 my-2" />

                      <DropdownMenuItem onClick={handleSignOut} className="rounded-xl px-2.5 py-2 focus:bg-accent/70">
                        <LogOut className="h-4.5 w-4.5 text-foreground/80" />
                        <span className="text-sm font-medium">Sign out</span>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu> :

            <Button variant="ghost" size="sm" asChild>
                  <Link to={`/auth?redirect=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}` || "/")}`}>
                    <User className="mr-2 h-4 w-4" />
                    Sign in
                  </Link>
                </Button>
            }

              {user ? (
                <CartSheet triggerVariant="hero" triggerSize="sm" showLabel className="min-w-[7.5rem] justify-center" />
              ) : (
                <Button variant="hero" size="sm" className="min-w-[7.5rem] justify-center" asChild>
                  <Link to="/store">
                    <ShoppingCart className="h-5 w-5" />
                    <span>Shop</span>
                  </Link>
                </Button>
              )}
        </div>
      </div>


      </header>

      {showBreadcrumbs &&
      <nav aria-label="Breadcrumb" className="mt-16">
          <div className="container mx-auto max-w-5xl px-4 pt-4 lg:px-8">
            <div className="text-sm text-muted-foreground">
              {(customBreadcrumbs ?? [{ label: "Home", to: "/" }, ...pathSegments.map((segment, index) => ({
                label: getBreadcrumbLabel(segment),
                to: index === pathSegments.length - 1 ? null : resolveBreadcrumbTarget(`/${pathSegments.slice(0, index + 1).join("/")}`),
              }))]).map((crumb, index) => (
                <span key={`${crumb.label}-${index}`}>
                  {index > 0 && <span className="mx-2">/</span>}
                  {crumb.to ? (
                    <Link to={crumb.to} className={index === 0 ? "text-foreground hover:text-foreground/80" : "hover:text-foreground"}>
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground">{crumb.label}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </nav>
      }
    </>);

};

export default Header;
