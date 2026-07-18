import { ExternalLink, MapPin, Phone } from "lucide-react";
import cleanLogoSmooth from "@/assets/clean_logo_smooth.svg";
import { Link, useLocation } from "react-router";
import { useLegalPage } from "@/hooks/useContentArticles";
import { COMPANY_CONTACT } from "@/config/companyContact";

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
      { label: "Tracking", to: "/rx-job-status" },
      { label: "LabLink", to: "/rx-order" },
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
      { label: "Facebook", href: "https://www.facebook.com/classicvisionscb" },
      { label: "Instagram", href: "https://www.instagram.com/classicvisionscb" },
      { label: "LinkedIn", href: "https://www.linkedin.com/company/classic-visions/" },
    ],
  },
] as const;

const getLabLinkNavigationProps = (preserveLabLinkSession: boolean) =>
  preserveLabLinkSession ? { target: "_blank", rel: "noopener noreferrer" } : {};

const FooterColumnLink = ({ link, preserveLabLinkSession }: { link: FooterLink; preserveLabLinkSession: boolean }) => {
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
        {...getLabLinkNavigationProps(preserveLabLinkSession)}
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
  const location = useLocation();
  const copyrightText = copyrightArticle?.content || COMPANY_CONTACT.copyright;
  const preserveLabLinkSession = location.pathname === "/rx-order" || location.pathname === "/rx-job-status";
  const labLinkNavigationProps = getLabLinkNavigationProps(preserveLabLinkSession);

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground" role="contentinfo">
      <div className="container mx-auto px-4 py-12 sm:py-16 lg:px-8">
        {/* Brand row */}
        <div className="mb-10 flex flex-col gap-4 border-b border-primary-foreground/10 pb-10 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" {...labLinkNavigationProps} className="flex items-center gap-2" aria-label="Classic Visions home">
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
                {column.links.map((link) => <FooterColumnLink key={link.label} link={link} preserveLabLinkSession={preserveLabLinkSession} />)}
              </nav>
            </div>
          )}

          {/* Contact column */}
          <div className="col-span-2 space-y-3 sm:col-span-3 lg:col-span-full xl:col-span-1">
            <h4 className="text-sm font-semibold uppercase tracking-wider">Classic Visions</h4>
            <div className="space-y-3 text-sm text-primary-foreground/70">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{COMPANY_CONTACT.addressLine}</span>
              </p>
              <a

                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-primary-foreground" href={COMPANY_CONTACT.mapUrl}>
                
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Directions
              </a>
              <a
                href={COMPANY_CONTACT.phoneHref}
                className="flex items-center gap-2 transition-colors hover:text-primary-foreground">
                
                <Phone className="h-4 w-4" aria-hidden="true" />
                <span>Call {COMPANY_CONTACT.phoneDisplay}</span>
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
