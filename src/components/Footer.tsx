import { Eye, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <Eye className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="text-xl font-bold">OptiLens Pro</span>
            </Link>
            <p className="text-sm text-primary-foreground/70">
              Your trusted wholesale partner for premium prescription lenses. Quality, precision, and reliability since 2010.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/store" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                Online Store
              </Link>
              <Link to="/knowledge" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                Knowledge Base
              </Link>
              <a href="#products" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                Our Products
              </a>
              <a href="#about" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                About Us
              </a>
            </nav>
          </div>

          {/* Products */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider">Products</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/store" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                Surfaced Lenses
              </Link>
              <Link to="/store" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                Finished Lenses
              </Link>
              <Link to="/store" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                Progressive Lenses
              </Link>
              <Link to="/store" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                Specialty Coatings
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider">Contact Us</h4>
            <div className="flex flex-col gap-3">
              <a href="tel:+1234567890" className="flex items-center gap-2 text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                <Phone className="h-4 w-4" />
                (123) 456-7890
              </a>
              <a href="mailto:info@optilens.com" className="flex items-center gap-2 text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                <Mail className="h-4 w-4" />
                info@optilens.com
              </a>
              <div className="flex items-start gap-2 text-sm text-primary-foreground/70">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>123 Optical Drive<br />Vision City, VC 12345</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-primary-foreground/10 pt-8 text-center text-sm text-primary-foreground/60">
          <p>© 2024 OptiLens Pro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
