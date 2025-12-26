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
    <section className="bg-muted/50 py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Why Choose OptiLens Pro?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            We're committed to providing optical professionals with the best products 
            and service in the industry.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="group text-center opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-card shadow-soft transition-all duration-300 group-hover:shadow-medium group-hover:-translate-y-1">
                <feature.icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
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
