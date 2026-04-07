import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { barbadosFaqs, retailerMarketMap } from "@/data/retailers";
import { Building2, ChevronRight, MapPin, Phone, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { useRetailerAssistantPrompt } from "@/features/assistant/CompanionAssistantContext";

const barbadosMarket = retailerMarketMap.get("barbados");

const BarbadosRetailersPage = () => {
  const openRetailerAssistant = useRetailerAssistantPrompt();
  if (!barbadosMarket) {
    return null;
  }

  const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Barbados optical retailers and eye clinics",
    description: barbadosMarket.seoDescription,
    url: "https://www.classicvisions.net/find-a-retailer/barbados",
    isPartOf: {
      "@type": "WebSite",
      name: "Classic Visions",
      url: "https://www.classicvisions.net/"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: barbadosFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  }];


  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Find an optical in Barbados | Classic Visions retailer guide"
        description={barbadosMarket.seoDescription}
        canonicalPath="/find-a-retailer/barbados"
        jsonLd={jsonLd} />
      
      <Header />
      <main className="pb-16 pt-24">
        <div className="container mx-auto max-w-6xl px-4 lg:px-8">
          <section className="rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
            <Badge variant="secondary">Barbados retailer guide</Badge>
            <div className="mt-5 grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Find an optical in Barbados</h1>
                <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
                  Find trusted Barbados optical stores and eye clinics faster. 
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to="/find-a-retailer">Browse all islands</Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openRetailerAssistant({ marketSlug: "barbados", marketName: "Barbados" })}
                  >
                    Need help choosing a retailer?
                  </Button>
                </div>
              </div>
              









              
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <Card className="rounded-3xl border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-semibold text-foreground">{barbadosMarket.entries.length}</p>
                <p className="mt-2 text-sm text-muted-foreground">Optical retailers and clinics across Barbados.</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Ideal for</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-foreground">Patients and visitors</p>
                <p className="mt-2 text-sm text-muted-foreground">Quick local discovery for exams, dispensing, and eyewear shopping.</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Fallback CTA</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-foreground">Need another option?</p>
                <p className="mt-2 text-sm text-muted-foreground">Contact Classic Visions for help finding the closest suitable partner.</p>
              </CardContent>
            </Card>
          </section>

          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <Badge variant="outline">Barbados providers</Badge>
                <h2 className="mt-3 text-3xl font-semibold text-foreground">Featured Barbados retailers and clinics</h2>
              </div>
              <Button variant="outline" asChild>
                <Link to="/find-a-retailer">
                  Return to all islands
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {barbadosMarket.entries.map((entry) =>
              <Card key={`${entry.name}-${entry.location}`} className="h-full rounded-3xl border-border shadow-sm">
                  <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl">{entry.name}</CardTitle>
                        <p className="mt-2 text-sm text-muted-foreground">{entry.category}</p>
                      </div>
                      <div className="rounded-full bg-primary/10 p-2 text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{entry.location}</span>
                    </div>
                    {entry.phone ?
                  <a href={`tel:${entry.phone.replace(/[^+\d]/g, "")}`} className="flex items-start gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{entry.phone}</span>
                      </a> :
                  null}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {entry.website ?
                    <Button size="sm" asChild>
                          <a href={entry.website} target="_blank" rel="noopener noreferrer">Visit website</a>
                        </Button> :
                    null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openRetailerAssistant({
                          marketSlug: "barbados",
                          marketName: "Barbados",
                          retailerName: entry.name,
                          location: entry.location,
                        })}
                      >
                        Request help
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          <section className="mt-10">
            <Card className="rounded-3xl border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Barbados FAQ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {barbadosFaqs.map((faq) =>
                <div key={faq.question}>
                    <h3 className="text-base font-semibold text-foreground">{faq.question}</h3>
                    <p className="mt-2 text-sm text-muted-foreground sm:text-base">{faq.answer}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>);

};

export default BarbadosRetailersPage;
