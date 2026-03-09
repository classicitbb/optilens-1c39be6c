import { Truck, Shield, Clock, HeadphonesIcon } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Quality Guaranteed",
    description: "Every lens undergoes rigorous quality control to ensure optical precision and clarity.",
  },
  {
    icon: Truck,
    title: "Fast Shipping",
    description: "Same-day processing on orders placed before 2 PM with nationwide delivery.",
  },
  {
    icon: Clock,
    title: "Quick Turnaround",
    description: "Industry-leading turnaround times without compromising on quality.",
  },
  {
    icon: HeadphonesIcon,
    title: "Expert Support",
    description: "Dedicated optical consultants available to help with technical questions.",
  },
];

const Features = () => {
  return (
    <section className="bg-muted/50 py-16 sm:py-24" aria-label="Why choose us">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mb-12 text-center sm:mb-16">
          <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            Why Choose OptiLens Pro?
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
            We're committed to providing optical professionals with the best products 
            and service in the industry.
          </p>
        </div>

        <div className="grid gap-8 grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="group text-center opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-soft transition-all duration-300 group-hover:shadow-medium group-hover:-translate-y-1 sm:h-16 sm:w-16">
                <feature.icon className="h-6 w-6 text-accent sm:h-7 sm:w-7" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground sm:text-lg">
                {feature.title}
              </h3>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
