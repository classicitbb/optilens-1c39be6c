import { Eye, ExternalLink, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useLegalPage } from "@/hooks/useContentArticles";

const footerColumns = [
  {
    title: "Lenses",
    links: [
      { label: "Progressive (All-Day Use)", to: "/zenvue/brilliance" },
      { label: "ZenVue Brilliance™", to: "/zenvue/brilliance" },
      { label: "Office / Occupational", to: "/lenses/office-occupational" },
      { label: "Anti-Fatigue", to: "/lenses/anti-fatigue" },
      { label: "Single Vision", to: "/zenvue/single-vision" },
      { label: "ZenVue Single Vision", to: "/zenvue/single-vision" },
      { label: "Blue Filter", to: "/lenses/blue-filter" },
      { label: "Lens Design Guide", to: "/lenses/lens-types" },
    ],
  },
  {
    title: "Coatings",
    links: [
      { label: "Mirror & Finish Guide", to: "/mirror-finish-guide" },
      { label: "Sun & Specialty", to: "/zenvue/sundun" },
      { label: "ZenVue Darkun™", to: "/zenvue/darkun" },
      { label: "ZenVue Compare", to: "/zenvue/compare" },
      { label: "Knowledge Articles", to: "/knowledge#lens-coatings" },
    ],
  },
  {
    title: "Professionals",
    links: [
      { label: "Professionals Overview", to: "/for-professionals" },
      { label: "Lens Design Guide", to: "/lenses/lens-types" },
      { label: "Wholesale Program", to: "/zenvue/wholesale" },
      { label: "ZenVue Feature Hub", to: "/zenvue" },
    ],
  },
  {
    title: "Patients",
    links: [
      { label: "Understanding Lenses", to: "/patients#understanding-lenses" },
      { label: "Find Care", to: "/patients#find-care" },
      { label: "Vision Tips", to: "/patients#vision-tips" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Our Story", to: "/#about" },
      { label: "News & Articles", to: "/knowledge" },
      { label: "Contact Us", to: "/#contact" },
      { label: "Terms of Use", to: "/terms" },
      { label: "Privacy Policy", to: "/privacy-policy" },
    ],
  },
] as const;

const Footer = () => {
  const { data: copyrightArticle } = useLegalPage("copyright");
  const copyrightText = copyrightArticle?.content || "© 2024 OptiLens Pro. All rights reserved.";

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 border-b border-primary-foreground/10 pb-10 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <Eye className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-xl font-bold">OptiLens Pro</span>
          </Link>
          <p className="max-w-2xl text-sm text-primary-foreground/70">
            Your trusted wholesale partner for premium prescription lenses with quality, precision, and reliable fulfillment.
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          {footerColumns.map((column) => (
            <div key={column.title} className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider">{column.title}</h4>
              <nav className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <Link key={link.label} to={link.to} className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}

          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider">Classic Visions</h4>
            <div className="space-y-3 text-sm text-primary-foreground/70">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Regency Park, Christ Church, Barbados</span>
              </p>
              <a
                href="https://maps.google.com/?q=Regency+Park+Christ+Church+Barbados"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-primary-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                Directions
              </a>
              <a href="tel:+12464334928" className="flex items-center gap-2 transition-colors hover:text-primary-foreground">
                <Phone className="h-4 w-4" />
                Call +1 246 433-4928
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-primary-foreground/10 pt-8 text-center text-sm text-primary-foreground/60 md:flex md:items-center md:justify-between md:text-left">
          <p>{copyrightText}</p>
          <p className="mt-2 md:mt-0">Powered by Classic Visions Digital</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
