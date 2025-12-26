import { Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent">
            <Eye className="h-5 w-5 text-accent-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">OptiLens Pro</span>
        </Link>
        
        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/store" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Store
          </Link>
          <Link to="/knowledge" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Knowledge Base
          </Link>
          <a href="#products" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Products
          </a>
          <a href="#about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            About
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
            Contact
          </Button>
          <Button variant="hero" size="sm" asChild>
            <Link to="/store">Shop Now</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
