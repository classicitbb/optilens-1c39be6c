import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Layers, Target, FlaskConical, Glasses, Wrench, Globe, ArrowRight } from "lucide-react";

const products = [
{
  icon: Layers,
  title: "Semi-Finished Lenses",
  description: "Custom-surfaced prescription lenses tailored to your exact specifications. Available in single vision, bifocal, and progressive designs.",
  features: ["Custom prescriptions", "Multiple materials", "AR coatings available"],
  link: "/store?category=surfaced"
},
{
  icon: Target,
  title: "Finished Lenses",
  description: "Ready-to-edge stock lenses for quick turnaround. High-quality finished lenses in popular prescriptions and designs.",
  features: ["Fast delivery", "Bulk pricing", "Wide Rx range"],
  link: "/store?category=finished"
},
{
  icon: FlaskConical,
  title: "Lab Supplies",
  description: "Essential consumables and equipment for your surfacing and finishing lab. Blocks, pads, polishing compounds, and more.",
  features: ["Surfacing consumables", "Finishing supplies", "Equipment parts"],
  link: "/store?category=lab"
},
{
  icon: Glasses,
  title: "Optical Supplies",
  description: "Retail and dispensary essentials including frames, cases, cleaning solutions, and display accessories.",
  features: ["Frames & accessories", "Cleaning products", "Display solutions"],
  link: "/store?category=optical"
},
{
  icon: Wrench,
  title: "Rx Lab Services",
  description: "Professional prescription laboratory services including surfacing, edging, tinting, and specialty coatings.",
  features: ["Custom surfacing", "Precision edging", "Specialty coatings"],
  link: "/store?category=services"
},
{
  icon: Globe,
  title: "Optician Website Design",
  description: "Professional, modern websites built specifically for opticians and optical retailers. Showcase your practice and drive appointments.",
  features: ["Custom branding", "Online booking", "Mobile responsive"],
  link: "#contact",
  cta: true
}];


const Products = () => {
  return (
    <section id="products" className="bg-background py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Our Product Lines
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            From custom-surfaced prescriptions to ready-stock finished lenses, we provide 
            comprehensive solutions for optical professionals.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 border-0">
          {products.map((product, index) =>
          <Card
            key={product.title}
            variant="feature"
            className="group opacity-0 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}>

              <CardHeader className="pb-4">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-accent transition-transform group-hover:scale-110">
                  <product.icon className="h-7 w-7 text-accent-foreground" />
                </div>
                <CardTitle className="text-2xl">{product.title}</CardTitle>
                <CardDescription className="text-base">
                  {product.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-2">
                  {product.features.map((feature) =>
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                      {feature}
                    </li>
                )}
                </ul>
                <Button
                variant={product.cta ? "default" : "outline"}
                className="group/btn w-full"
                asChild>

                  {product.cta ?
                <a href={product.link}>
                      Contact Us
                      <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </a> :

                <Link to={product.link}>
                      View Products
                      <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                }
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>);

};

export default Products;