import { Eye, Award, Users, Globe, Target, Handshake } from "lucide-react";

const stats = [
  { value: "25+", label: "Years in Business" },
  { value: "5,000+", label: "Optical Partners" },
  { value: "1M+", label: "Lenses Delivered" },
  { value: "99.8%", label: "Quality Rate" },
];

const values = [
  {
    icon: Target,
    title: "Precision",
    description: "Every lens is crafted to meet the highest optical standards, ensuring clear and accurate vision for every patient.",
  },
  {
    icon: Handshake,
    title: "Partnership",
    description: "We build lasting relationships with optical professionals, growing together through trust and mutual success.",
  },
  {
    icon: Award,
    title: "Innovation",
    description: "Continuously investing in the latest lens technology and manufacturing processes to stay ahead of industry trends.",
  },
];

const About = () => {
  return (
    <section id="about" className="py-24">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Intro */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent">
            <Eye className="h-7 w-7 text-accent-foreground" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            About OptiVisionNow
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            OptiVisionNow is a trusted wholesale supplier of premium prescription lenses, 
            serving independent opticians, optical chains, and eye care professionals. 
            We combine decades of optical expertise with modern technology to deliver 
            lenses that meet the highest standards of clarity, durability, and value.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-20 grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="rounded-xl bg-card p-6 text-center shadow-soft opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="mb-1 text-3xl font-bold text-accent">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Mission + Values */}
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h3 className="mb-4 text-2xl font-bold text-foreground">Our Mission</h3>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              We exist to empower optical professionals with access to high-quality lenses 
              at competitive wholesale prices — without compromising on service, speed, or 
              technical support.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              From single vision to complex free-form progressives, our extensive catalog 
              and expert team ensure you always have the right lens for every patient. 
              Whether you're a single-location practice or a growing chain, OptiVisionNow 
              is your partner in delivering exceptional vision care.
            </p>
          </div>

          <div className="space-y-6">
            {values.map((item, index) => (
              <div
                key={item.title}
                className="flex gap-4 rounded-xl bg-muted/50 p-5 opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 100 + 200}ms` }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-card shadow-soft">
                  <item.icon className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h4 className="mb-1 font-semibold text-foreground">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team / Trust */}
        <div className="mt-20 rounded-2xl bg-muted/50 p-8 text-center md:p-12">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-card shadow-soft">
            <Users className="h-6 w-6 text-accent" />
          </div>
          <h3 className="mb-3 text-2xl font-bold text-foreground">Trusted by Professionals</h3>
          <p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed">
            Thousands of optical professionals across the country rely on OptiVisionNow 
            for their daily lens needs. Our dedicated account managers, fast turnaround times, 
            and industry-leading quality control make us the wholesale partner of choice 
            for practices that demand the best.
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-accent" />
              Nationwide Delivery
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Award className="h-4 w-4 text-accent" />
              ISO Certified
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
