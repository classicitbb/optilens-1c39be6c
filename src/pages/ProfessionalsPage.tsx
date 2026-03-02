import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const sections = [
  {
    title: "For Optical Stores & Clinics",
    links: [
      { label: "Apply for a Trade Account", to: "/professionals/trade-account" },
      { label: "Online Ordering Portal (LabLink)", href: "https://lablink.com", external: true },
      { label: "Order Tracking (LabLink)", href: "https://lablink.com/tracking", external: true },
      { label: "Price List Request", to: "/professionals/price-list-request" },
    ],
  },
  {
    title: "Technical Resources",
    links: [
      { label: "Lab Process Overview", to: "/professionals/lab-process-overview" },
      { label: "Tracing & Cutting Guide", to: "/professionals/tracing-cutting-guide" },
      { label: "Lens Ordering Tips", to: "/professionals/lens-ordering-tips" },
      { label: "Chemistrie Lens System", to: "/professionals/chemistrie-lens-system" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Customer Service", to: "/professionals/customer-service" },
      { label: "Freight & Delivery Policy", to: "/professionals/freight-delivery-policy" },
      { label: "Returns / Replacements", to: "/professionals/returns-replacements" },
    ],
  },
];

const ProfessionalsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto max-w-6xl px-4 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-8">
            <h1 className="text-4xl font-bold text-foreground">Professionals Hub</h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              Odoo-backed portal pages and forms for trade onboarding, technical references, and service support.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/professionals/trade-account">Apply for Trade Account</Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://lablink.com" target="_blank" rel="noopener noreferrer">Open LabLink (External)</a>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {sections.map((section) => (
              <div key={section.title} className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                <div className="mt-4 space-y-2">
                  {section.links.map((link) => (
                    link.external ? (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        key={link.label}
                        to={link.to || "/for-professionals"}
                        className="block rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProfessionalsPage;
