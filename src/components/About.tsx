import { Award, Users, Globe, Target, Handshake } from "lucide-react";
import cleanLogoSmooth from "@/assets/clean_logo_smooth.svg";

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
    <section id="about" className="py-16 sm:py-24" aria-label="About Classic Visions">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Intro */}
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
            <img src={cleanLogoSmooth} alt="Classic Visions" className="h-20 w-20" />
          </div>
          <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            About Classic Visions
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            Classic Visions is a trusted wholesale supplier of premium prescription lenses, 
            serving independent opticians, optical chains, and eye care professionals. 
            We combine decades of optical expertise with modern technology to deliver 
            lenses that meet the highest standards of clarity, durability, and value.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-16 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 sm:mb-20">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="rounded-xl bg-card p-4 text-center shadow-soft opacity-0 animate-fade-in sm:p-6"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="mb-1 text-2xl font-bold text-accent sm:text-3xl">{stat.value}</div>
              <div className="text-xs text-muted-foreground sm:text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Mission + Values */}
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
          <div>
            <h3 className="mb-4 text-xl font-bold text-foreground sm:text-2xl">Our Mission</h3>
            <p className="mb-4 text-sm text-muted-foreground leading-relaxed sm:text-base">
              We exist to empower optical professionals with access to high-quality lenses 
              at competitive wholesale prices — without compromising on service, speed, or 
              technical support.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed sm:text-base">
              From single vision to complex free-form progressives, our extensive catalog 
              and expert team ensure you always have the right lens for every patient. 
              Whether you're a single-location practice or a growing chain, Classic Visions 
              is your partner in delivering exceptional vision care.
            </p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {values.map((item, index) => (
              <div
                key={item.title}
                className="flex gap-4 rounded-xl bg-muted/50 p-4 opacity-0 animate-fade-in sm:p-5"
                style={{ animationDelay: `${index * 100 + 200}ms` }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card shadow-soft sm:h-12 sm:w-12">
                  <item.icon className="h-5 w-5 text-accent sm:h-6 sm:w-6" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="mb-1 font-semibold text-foreground">{item.title}</h4>
                  <p className="text-xs text-muted-foreground sm:text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team / Trust */}
        <div className="mt-16 rounded-2xl bg-muted/50 p-6 text-center sm:mt-20 sm:p-8 md:p-12">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-card shadow-soft">
            <Users className="h-6 w-6 text-accent" aria-hidden="true" />
          </div>
          <h3 className="mb-3 text-xl font-bold text-foreground sm:text-2xl">Trusted by Professionals</h3>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground leading-relaxed sm:text-base">
            Thousands of optical professionals across the country rely on Classic Visions 
            for their daily lens needs. Our dedicated account managers, fast turnaround times, 
            and industry-leading quality control make us the wholesale partner of choice 
            for practices that demand the best.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-muted-foreground sm:gap-6">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Globe className="h-4 w-4 text-accent" aria-hidden="true" />
              Nationwide Delivery
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Award className="h-4 w-4 text-accent" aria-hidden="true" />
              ISO Certified
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
