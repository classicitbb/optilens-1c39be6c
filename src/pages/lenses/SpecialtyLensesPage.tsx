import { Link } from "react-router";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { getSpecialtyLensActionPaths, specialtyLenses, type SpecialtyLens } from "@/data/specialtyLenses";

const DetailList = ({ items }: { items: string[] }) => (
  <ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-muted-foreground marker:text-primary">
    {items.map((item) => <li key={item}>{item}</li>)}
  </ul>
);

const SpecialtyLensDetails = ({ lens }: { lens: SpecialtyLens }) => {
  const actions = getSpecialtyLensActionPaths(lens);

  return (
    <div className="border-t border-border/60 px-5 pb-6 pt-5 sm:px-7 sm:pb-7">
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h3 className="text-base font-semibold text-foreground">Overview</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{lens.overview}</p>
        </section>
        <section>
          <h3 className="text-base font-semibold text-foreground">Ideal wearer / use cases</h3>
          <DetailList items={lens.idealFor} />
        </section>
        <section>
          <h3 className="text-base font-semibold text-foreground">Key benefits</h3>
          <DetailList items={lens.benefits} />
        </section>
        {(lens.technology || lens.technologyDetails) && (
          <section>
            <h3 className="text-base font-semibold text-foreground">
              {lens.technology ? "Technology" : "How the design differs"}
            </h3>
            {lens.technology && <DetailList items={lens.technology} />}
            {lens.technologyDetails?.map((detail) => (
              <p key={detail} className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>
            ))}
          </section>
        )}
        <section>
          <h3 className="text-base font-semibold text-foreground">Ordering and fitting information</h3>
          <DetailList items={lens.orderingInformation} />
        </section>
        {lens.practiceBenefits && (
          <section>
            <h3 className="text-base font-semibold text-foreground">Practice benefits</h3>
            <DetailList items={lens.practiceBenefits} />
          </section>
        )}
      </div>

      <div className="mt-8 flex flex-col justify-between gap-5 border-t border-border/60 pt-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-foreground">Classification</p>
          <p className="mt-1 text-sm text-muted-foreground">{lens.classification}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link to={actions.pricing}>View My Price</Link>
          </Button>
          <Button asChild>
            <Link to={actions.ordering}>Order This Lens</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

const SpecialtyLensesPage = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main id="main-content" className="pb-16 pt-24 sm:pb-24">
      <div className="container mx-auto max-w-5xl px-4 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Lifestyle Lenses</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Specialty Lenses</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Find innovative lens solutions for unique visual needs. These specialty lenses are designed for patients whose requirements go beyond conventional single vision and progressive lenses.
          </p>
        </div>

        <Accordion type="single" collapsible className="mt-10 space-y-4" aria-label="Specialty lens information">
          {specialtyLenses.map((lens) => (
            <AccordionItem key={lens.id} value={lens.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              <AccordionTrigger aria-controls={`${lens.id}-details`} className="group px-5 py-5 text-left hover:no-underline sm:px-7 sm:py-6">
                <span className="pr-4">
                  <span className="block text-xl font-semibold text-foreground">{lens.name}</span>
                  <span className="mt-2 block max-w-3xl text-sm font-normal leading-6 text-muted-foreground">{lens.shortDescription}</span>
                  <span className="mt-4 inline-block text-sm font-semibold text-primary group-hover:underline">Read more</span>
                </span>
              </AccordionTrigger>
              <AccordionContent forceMount id={`${lens.id}-details`} className="pb-0 pt-0">
                <SpecialtyLensDetails lens={lens} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </main>
    <Footer />
  </div>
);

export default SpecialtyLensesPage;
