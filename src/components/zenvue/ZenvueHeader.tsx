import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", to: "/zenvue" },
  { label: "Brilliance™", to: "/zenvue/brilliance" },
  { label: "Single Vision", to: "/zenvue/single-vision" },
  { label: "SunDun™", to: "/zenvue/sundun" },
  { label: "Darkun™", to: "/zenvue/darkun" },
  { label: "Compare", to: "/zenvue/compare" },
];

const ZenvueHeader = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link to="/zenvue" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center bg-primary">
            <span className="text-lg font-bold text-primary-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>Z</span>
          </div>
          <span className="text-xl font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>ZenVue</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                pathname === link.to ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            OptiLens
          </Link>
          <Button asChild variant="outline" size="sm" className="border-border text-foreground hover:bg-muted">
            <Link to="/zenvue/wholesale">Become a Partner</Link>
          </Button>
          <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/store">
              <ShoppingBag className="mr-1.5 h-4 w-4" />
              Shop Now
            </Link>
          </Button>
        </div>

        {/* Mobile menu */}
        <div className="flex items-center gap-2 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-background">
              <SheetTitle className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center bg-primary">
                  <span className="text-base font-bold text-primary-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>Z</span>
                </div>
                <span className="text-lg font-semibold" style={{ fontFamily: "'Crimson Pro', serif" }}>ZenVue</span>
              </SheetTitle>
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                      pathname === link.to ? "text-foreground bg-muted" : "text-muted-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="my-3 h-px bg-border" />
                <Link
                  to="/zenvue/wholesale"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Become a Partner
                </Link>
                <Link
                  to="/store"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-accent hover:bg-muted transition-colors"
                >
                  Shop Now
                </Link>
                <div className="my-3 h-px bg-border" />
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to OptiLens
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default ZenvueHeader;
