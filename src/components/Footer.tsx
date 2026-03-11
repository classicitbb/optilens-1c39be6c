import { ExternalLink, MapPin, Phone } from "lucide-react";
import cleanLogo from "@/assets/clean_logo.svg";
import { Link } from "react-router-dom";
import { useLegalPage } from "@/hooks/useContentArticles";

const footerColumns = [
  {
    title: "Lenses",
    links: [
      { label: "ZenVue Brilliance™", to: "/zenvue/brilliance" },
      { label: "ZenVue Single Vision", to: "/zenvue/single-vision" },
      { label: "Office / Occupational", to: "/lenses/office-occupational" },
      { label: "Anti-Fatigue", to: "/lenses/anti-fatigue" },
      { label: "Blue Filter", to: "/lenses/blue-filter" },
      { label: "Lens Design Guide", to: "/lenses/lens-types" },
    ],
  },
  {
    title: "Coatings & Sun",
    links: [
      { label: "Mirror & Finish Guide", to: "/mirror-finish-guide" },
      { label: "ZenVue SunDun™", to: "/zenvue/sundun" },
      { label: "ZenVue Darkun™", to: "/zenvue/darkun" },
      { label: "ZenVue Compare", to: "/zenvue/compare" },
      { label: "Knowledge Articles", to: "/knowledge" },
    ],
  },
  {
    title: "Professionals",
    links: [
      { label: "Overview", to: "/for-professionals" },
      { label: "Lab Process", to: "/professionals/lab-process-overview" },
      { label: "Lens Ordering Tips", to: "/professionals/lens-ordering-tips" },
      { label: "Dispensing Tips", to: "/professionals/dispensing-tips" },
      { label: "Wholesale Program", to: "/zenvue/wholesale" },
    ],
  },
  {
    title: "Patients",
    links: [
      { label: "Understanding Lenses", to: "/patients#understanding-lenses" },
      { label: "Find Care", to: "/patients#find-care" },
      { label: "Vision Tips", to: "/patients#vision-tips" },
      { label: "Order Lenses", to: "/store" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Use", to: "/legal/terms" },
      { label: "Privacy Policy", to: "/legal/privacy-policy" },
      { label: "Cookie Policy", to: "/legal/cookie-policy" },
      { label: "Return Policy", to: "/legal/return-policy" },
      { label: "Accessibility", to: "/legal/accessibility" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Our Story", to: "/#about" },
      { label: "News & Articles", to: "/knowledge" },
      { label: "Contact Us", to: "/#contact" },
      { label: "ZenVue Hub", to: "/zenvue" },
    ],
  },
] as const;

const Footer = () => {
  const { data: copyrightArticle } = useLegalPage("copyright");
  const copyrightText = copyrightArticle?.content || "© 2026 Classic Visions. All rights reserved.";

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground" role="contentinfo">
      <div className="container mx-auto px-4 py-12 sm:py-16 lg:px-8">
        {/* Brand row */}
        <div className="mb-10 flex flex-col gap-4 border-b border-primary-foreground/10 pb-10 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Classic Visions home">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <img src={cleanLogo} alt="Classic Visions" className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold">Classic Visions</span>
          </Link>
          <p className="max-w-2xl text-sm text-primary-foreground/70">
            Your trusted wholesale partner for premium prescription lenses with quality, precision, and reliable fulfillment.
          </p>
        </div>

        {/* Link columns — responsive grid */}
        <div className="grid gap-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {footerColumns.map((column) => (
            <div key={column.title} className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider">{column.title}</h4>
              <nav className="flex flex-col gap-2" aria-label={`${column.title} links`}>
                {column.links.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="text-sm leading-snug text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}

          {/* Contact column */}
          <div className="col-span-2 space-y-3 sm:col-span-3 lg:col-span-full xl:col-span-1">
            <h4 className="text-sm font-semibold uppercase tracking-wider">Classic Visions</h4>
            <div className="space-y-3 text-sm text-primary-foreground/70">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Regency Park, Christ Church, Barbados</span>
              </p>
              <a
                href="https://maps.google.com/?q=Regency+Park+Christ+Church+Barbados"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-primary-foreground"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Directions
              </a>
              <a
                href="tel:+12464334928"
                className="flex items-center gap-2 transition-colors hover:text-primary-foreground"
              >
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
    </footer>
  );
};

export default Footer;
