import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Handshake } from "lucide-react";

interface ZenvueCTAProps {
  title?: string;
  subtitle?: string;
}

const ZenvueCTA = ({
  title = "Ready to Partner with ZenVue?",
  subtitle = "Join our growing network of optical professionals across the Caribbean.",
}: ZenvueCTAProps) => {
  return (
    <section className="border-t border-border bg-primary">
      <div className="container mx-auto px-4 py-16 text-center lg:py-20 lg:px-8">
        <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/70">{subtitle}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/zenvue/wholesale">
              <Handshake className="mr-2 h-4 w-4" />
              Become a Partner
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
            <Link to="/store">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Shop Now
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ZenvueCTA;
