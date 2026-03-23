import { ExternalLink, MapPin, Phone } from "lucide-react";
import cleanLogoSmooth from "@/assets/clean_logo_smooth.svg";
import { Link } from "react-router-dom";
import { useLegalPage } from "@/hooks/useContentArticles";

type FooterLink = {
  label: string;
  to?: string;
  href?: string;
};

const footerColumns = [
  {
    title: "Company",
    links: [
      { label: "About", to: "/#about" },
      { label: "Professionals", to: "/professionals" },
      { label: "Patients", to: "/patients" },
      { label: "Find a Retailer", to: "/find-a-retailer" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact", to: "/#contact" },
      { label: "Tracking", href: "https://tracking.classicvisions.net" },
      { label: "LabLink", href: "https://lablink.classicvisions.net" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy-policy" },
      { label: "Terms of Use", to: "/terms" },
      { label: "Returns", to: "/professionals/returns-replacements" },
    ],
  },
  {
    title: "Social",
    links: [
      { label: "Facebook", href: "https://facebook.com/classicvisions" },
      { label: "Instagram", href: "https://instagram.com/classicvisions" },
    ],
  },
  {
    title: "Utility",
    links: [{ label: "Sitemap", href: "/sitemap.xml" }],
  },
] as const;

const FooterColumnLink = ({ link }: { link: FooterLink }) => {
  if (link.href) {
    const isExternal = link.href.startsWith("http");
    return (
      <a
        key={link.label}
        href={link.href}
        className="text-sm leading-snug text-primary-foreground/70 transition-colors hover:text-primary-foreground"
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {link.label}
      </a>
    );
  }

  if (link.to) {
    return (
      <Link
        key={link.label}
        to={link.to}
        className="text-sm leading-snug text-primary-foreground/70 transition-colors hover:text-primary-foreground"
      >
        {link.label}
      </Link>
    );
  }

  return null;
};

const Footer = () => {
  const { data: copyrightArticle } = useLegalPage("copyright");
  const copyrightText = copyrightArticle?.content || "© 2026 Classic Visions. All rights reserved.";

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground" role="contentinfo">
      <div className="container mx-auto px-4 py-12 sm:py-16 lg:px-8">
        {/* Brand row */}
        <div className="mb-10 flex flex-col gap-4 border-b border-primary-foreground/10 pb-10 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Classic Visions home">
            <div className="flex h-10 w-10 items-center justify-center">
              <img src={cleanLogoSmooth} alt="Classic Visions" className="h-8 w-8" />
            </div>
            <span className="text-xl font-bold">Classic Visions</span>
          </Link>
          <p className="max-w-2xl text-sm text-primary-foreground/70">
            Your trusted wholesale partner for premium prescription lenses with quality, precision, and reliable fulfillment.
          </p>
        </div>

        {/* Link columns — responsive grid */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {footerColumns.map((column) =>
            <div key={column.title} className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider">{column.title}</h4>
              <nav className="flex flex-col gap-2" aria-label={`${column.title} links`}>
                {column.links.map((link) => <FooterColumnLink key={link.label} link={link} />)}
              </nav>
            </div>
          )}

          {/* Contact column */}
          <div className="col-span-2 space-y-3 sm:col-span-3 lg:col-span-full xl:col-span-1">
            <h4 className="text-sm font-semibold uppercase tracking-wider">Classic Visions</h4>
            <div className="space-y-3 text-sm text-primary-foreground/70">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Uplands Factory, Four Roads, Saint George BB20031 Barbados</span>
              </p>
              <a

                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-primary-foreground" href="https://www.google.com/maps/dir//Classic+Visions,+Barbados/@13.1232918,-59.5772745,13z/data=!4m8!4m7!1m0!1m5!1m1!1s0x8c43f24ff1e738cb:0xc8d2dbeed2e8c9c8!2m2!1d-59.5306801!2d13.1653583">
                
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Directions
              </a>
              <a
                href="tel:+12464334928"
                className="flex items-center gap-2 transition-colors hover:text-primary-foreground">
                
                <Phone className="h-4 w-4" aria-hidden="true" />
                <span>Call +1 246 433-4928</span>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 border-t border-primary-foreground/10 pt-8 text-center text-sm text-primary-foreground/60 sm:flex sm:items-center sm:justify-between sm:text-left">
          <p>{copyrightText}</p>
          <p className="mt-2 sm:mt-0">Powered by Classic Visions Digital</p>
        </div>
      </div>
    </footer>);

};

export default Footer;
