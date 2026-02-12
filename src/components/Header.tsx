import { useState, useRef, useEffect } from "react";
import { Eye, LogOut, User, Package, Shield, ChevronDown, Layers, Lightbulb, Droplets, Sun, Sparkles, CloudSun, Moon, Menu, FlaskConical, Glasses, Watch } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CartSheet } from "@/components/CartSheet";
import { useUserRole } from "@/hooks/useUserRole";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const KB_CATEGORIES = [
  { icon: Layers, label: "Lens Materials", hash: "lens-materials" },
  { icon: Lightbulb, label: "Lens Designs", hash: "lens-designs" },
  { icon: Droplets, label: "Lens Coatings", hash: "lens-coatings" },
  { icon: Sun, label: "Specialty Lenses", hash: "specialty-lenses" },
];

const ZENVUE_BRANDS = [
  { icon: Sparkles, label: "Brilliance™", url: "https://zvuedemo.lovable.app/brilliance" },
  { icon: CloudSun, label: "SunDun™", url: "https://zvuedemo.lovable.app/sundun" },
  { icon: Moon, label: "Darkun™", url: "https://zvuedemo.lovable.app/darkun" },
];

const SUPPLIES_CATEGORIES = [
  { icon: FlaskConical, label: "Lab Supplies" },
  { icon: Glasses, label: "Optical Supplies" },
  { icon: Watch, label: "Eyewear Accessories" },
];

const KnowledgeDropdown = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Knowledge Base
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-52 rounded-lg border border-border bg-background shadow-lg py-1">
          {KB_CATEGORIES.map((cat) => (
            <Link
              key={cat.hash}
              to={`/knowledge#${cat.hash}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const ProductsDropdown = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Products
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-48 rounded-lg border border-border bg-background shadow-lg py-1">
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ZenVue Brands</div>
          {ZENVUE_BRANDS.map((brand) => (
            <a
              key={brand.label}
              href={brand.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <brand.icon className="h-4 w-4" />
              {brand.label}
            </a>
          ))}
          <div className="my-1 h-px bg-border" />
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supplies</div>
          {SUPPLIES_CATEGORIES.map((item) => (
            <button
              key={item.label}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Header = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out."
    });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent">
            <Eye className="h-5 w-5 text-accent-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">OptiVisionNow</span>
        </Link>
        
        <nav className="hidden items-center gap-8 lg:flex">
          <Link to="/store" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Store
          </Link>
          <KnowledgeDropdown />
          <ProductsDropdown />
          <a href="#about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            About
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetTitle className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-accent">
                  <Eye className="h-4 w-4 text-accent-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">OptiVisionNow</span>
              </SheetTitle>
              <nav className="flex flex-col gap-1">
                <Link to="/store" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  Store
                </Link>
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Knowledge Base</div>
                {KB_CATEGORIES.map((cat) => (
                  <Link
                    key={cat.hash}
                    to={`/knowledge#${cat.hash}`}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors pl-5"
                  >
                    <cat.icon className="h-4 w-4" />
                    {cat.label}
                  </Link>
                ))}
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ZenVue Brands</div>
                {ZENVUE_BRANDS.map((brand) => (
                  <a
                    key={brand.label}
                    href={brand.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors pl-5"
                  >
                    <brand.icon className="h-4 w-4" />
                    {brand.label}
                  </a>
                ))}
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supplies</div>
                {SUPPLIES_CATEGORIES.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors pl-5"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </div>
                ))}
                <a href="#about" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  About
                </a>
                {user && (
                  <>
                    <div className="my-2 h-px bg-border" />
                    <Link to="/profile" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <User className="h-4 w-4" /> Profile
                    </Link>
                    <Link to="/orders" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <Package className="h-4 w-4" /> Orders
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                        <Shield className="h-4 w-4" /> Admin
                      </Link>
                    )}
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          {user ? (
            <>
              <CartSheet />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Profile</span>
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
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">
                  <User className="mr-2 h-4 w-4" />
                  Sign In
                </Link>
              </Button>
              <Button variant="hero" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/store">Shop Now</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>);

};

export default Header;