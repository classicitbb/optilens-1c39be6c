import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Link } from "react-router";
import { useMemo, useState } from "react";
import {
  Eye,
  Monitor,
  ArrowRight,
  Check,
  Armchair,
  Users,
  Maximize2,
  ScanLine,
  Layers,
  Move,
} from "lucide-react";
import {
  buildAddOptions,
  buildSphOptions,
  calculateOfficeLensValues,
  formatMeters,
  formatSignedDiopters,
  OFFICE_RANGE_OPTIONS,
} from "@/features/lenses/officeRangeCalculator";

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const CONFIGURATIONS = [
  {
    label: "1.3 m",
    subtitle: "Desk Focus",
    range: "35 cm – 1.3 m (14 in – 4.2 ft)",
    typesOfUse:
      "When clear vision is required at desk level, prolonged use at very near distances.",
    idealWearer:
      "Presbyopes who work in a small space and spend a significant amount of time focusing on very near distances. For example, office workers who spend most of their time viewing monitors on a desk.",
    icon: <Monitor className="h-6 w-6" />,
  },
  {
    label: "2 m",
    subtitle: "Workstation",
    range: "35 cm – 2 m (14 in – 6.5 ft)",
    typesOfUse:
      "When clear vision is required at desk level, prolonged use at intermediate and near distances.",
    idealWearer:
      "Presbyopes who work in a room-sized space and spend a significant amount of time focusing at intermediate and near distances. For example, office workers who utilize monitors but have a need to view another person at a conversational distance.",
    icon: <Users className="h-6 w-6" />,
  },
  {
    label: "4 m",
    subtitle: "Room",
    range: "35 cm – 4 m (14 in – 13.1 ft)",
    typesOfUse:
      "When clear vision is required in a room-sized space and extra viewing is needed at intermediate and near distances.",
    idealWearer:
      "Presbyopes who work in a larger space and spend time focusing on intermediate and near distances. For example, people who utilize monitors and have a need to view another person at a conversational distance and move about their workspace.",
    icon: <Maximize2 className="h-6 w-6" />,
  },
];

const BENEFITS = [
  {
    icon: <Maximize2 className="h-5 w-5" />,
    title: "Maximum Near & Intermediate FOV",
    text: "Wider usable zones at near and intermediate distances than any general-purpose progressive.",
  },
  {
    icon: <Armchair className="h-5 w-5" />,
    title: "Improved Postural Ergonomics",
    text: "Avoid unnecessary head movements for a more natural and comfortable working posture.",
  },
  {
    icon: <Monitor className="h-5 w-5" />,
    title: "Digital Device Comfort",
    text: "Comfortable and precise focusing especially when using electronic devices and monitors.",
  },
  {
    icon: <Move className="h-5 w-5" />,
    title: "Immediate Adaptation",
    text: "Excellent dynamic vision with easy transition between near and intermediate visual fields.",
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Peripheral Blur Elimination",
    text: "Near elimination of peripheral blur for uninterrupted workspace awareness.",
  },
  {
    icon: <ScanLine className="h-5 w-5" />,
    title: "Superior Digital Quality",
    text: "Superior visual quality with digital devices thanks to IOT Digital Ray-Path 2 optimization.",
  },
];

const TECHNOLOGIES = [
  {
    icon: <ScanLine className="h-6 w-6" />,
    name: "IOT Digital Ray-Path 2",
    description:
      "Point-by-point ray-tracing optimization over the entire lens surface for precise vision at every working distance.",
  },
  {
    icon: <Layers className="h-6 w-6" />,
    name: "Personalized Design",
    description:
      "Each lens is fully customized to the individual wearer's prescription and frame parameters.",
  },
  {
    icon: <Eye className="h-6 w-6" />,
    name: "Spatial Vision",
    description:
      "99.5% of gaze directions optimized for clear vision from edge to edge across the workspace.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

const OfficeOccupationalPage = () => {
  const sphOptions = useMemo(() => buildSphOptions(), []);
  const addOptions = useMemo(() => buildAddOptions(), []);
  const [distanceSphRight, setDistanceSphRight] = useState(0);
  const [distanceSphLeft, setDistanceSphLeft] = useState(0);
  const [addPower, setAddPower] = useState(1.5);
  const [selectedRangeId, setSelectedRangeId] = useState<(typeof OFFICE_RANGE_OPTIONS)[number]["id"]>("6m_plus");

  const calculator = useMemo(
    () =>
      calculateOfficeLensValues({
        distanceSphRight,
        distanceSphLeft,
        addPower,
        rangeId: selectedRangeId,
      }),
    [addPower, distanceSphLeft, distanceSphRight, selectedRangeId],
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-20 pt-24">
        {/* ── Hero ────────────────────────────────────────── */}
        <section className="container mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Everyday Vision
          </p>
          <h1 className="mt-3 text-4xl font-bold text-foreground sm:text-5xl">
            Office / Occupational Lenses
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Personalized occupational lenses with maximum near and intermediate
            vision zones for superb vision in the workspace. Choose from three
            distance configurations to match your patient's environment.
          </p>
          <Badge variant="outline" className="mt-4">
            Personalized · IOT Digital Ray-Path 2
          </Badge>
        </section>

        {/* ── Configurations ─────────────────────────────── */}
        <section className="container mx-auto mt-16 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">
            Three Distance Configurations
          </h2>
          <p className="mt-1 text-muted-foreground">
            Select the maximum viewing distance that best fits the wearer's
            workspace.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {CONFIGURATIONS.map((c) => (
              <Card
                key={c.label}
                className="relative flex flex-col border-border"
              >
                <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {c.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {c.subtitle}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({c.label})
                      </span>
                    </h3>
                    <p className="text-xs text-accent font-medium">{c.range}</p>
                  </div>
                </div>
                <CardContent className="flex flex-1 flex-col gap-3 p-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Types of Use
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {c.typesOfUse}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Ideal Wearer
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {c.idealWearer}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="container mx-auto mt-16 max-w-6xl px-4 lg:px-8">
          <Card className="border-border">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-foreground">Office Range Calculator</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Replicated calculator workflow for Optilux & Essential Office / Start Office:
                select distance sphere, ADD power, and a far distance range to generate shift guidance and pupil-centre references.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="distance-sph-right">Distance SPH (R)</Label>
                  <select
                    id="distance-sph-right"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={distanceSphRight}
                    onChange={(event) => setDistanceSphRight(Number(event.target.value))}
                  >
                    {sphOptions.map((option) => (
                      <option key={`r-${option}`} value={option}>
                        {formatSignedDiopters(option)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="distance-sph-left">Distance SPH (L)</Label>
                  <select
                    id="distance-sph-left"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={distanceSphLeft}
                    onChange={(event) => setDistanceSphLeft(Number(event.target.value))}
                  >
                    {sphOptions.map((option) => (
                      <option key={`l-${option}`} value={option}>
                        {formatSignedDiopters(option)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-power">ADD</Label>
                  <select
                    id="add-power"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={addPower}
                    onChange={(event) => setAddPower(Number(event.target.value))}
                  >
                    {addOptions.map((option) => (
                      <option key={`add-${option}`} value={option}>
                        {option.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-medium text-foreground">Choose far distance range</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {OFFICE_RANGE_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={`rounded-md border px-3 py-2 text-sm transition ${
                        selectedRangeId === option.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      }`}
                      onClick={() => setSelectedRangeId(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shift</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {calculator.shift === null ? "—" : formatSignedDiopters(calculator.shift)}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shift at Pupil Centre</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {calculator.shiftAtPupilCenter === null ? "—" : formatSignedDiopters(calculator.shiftAtPupilCenter)}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Range at Pupil Centre</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {calculator.rangeAtPupilCenterMeters === null ? "—" : formatMeters(calculator.rangeAtPupilCenterMeters)}
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rx at Pupil Centre</p>
                  <p className="mt-1 text-sm text-foreground">
                    R: {calculator.rxAtPupilCenterRight === null ? "—" : formatSignedDiopters(calculator.rxAtPupilCenterRight)}
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    L: {calculator.rxAtPupilCenterLeft === null ? "—" : formatSignedDiopters(calculator.rxAtPupilCenterLeft)}
                  </p>

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Final Office Lens Rx (reference)</p>
                  <p className="mt-1 text-sm text-foreground">
                    R: {formatSignedDiopters(distanceSphRight)} / SHIFT {calculator.shift === null ? "—" : formatSignedDiopters(calculator.shift)}
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    L: {formatSignedDiopters(distanceSphLeft)} / SHIFT {calculator.shift === null ? "—" : formatSignedDiopters(calculator.shift)}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Near reference from distance + ADD: R {formatSignedDiopters(calculator.nearReferenceRight)}, L {formatSignedDiopters(calculator.nearReferenceLeft)}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ── Key Benefits ───────────────────────────────── */}
        <section className="mt-20 bg-muted/40 py-16">
          <div className="container mx-auto max-w-6xl px-4 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground">Key Benefits</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                    {b.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {b.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {b.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Technologies ───────────────────────────────── */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">
            Technology Inside
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {TECHNOLOGIES.map((t) => (
              <Card key={t.name} className="border-border">
                <CardContent className="flex flex-col gap-2 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {t.icon}
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────── */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <Card className="border-none bg-primary text-primary-foreground">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <h2 className="text-xl font-bold">
                  Optimize your patient's workspace vision
                </h2>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  Contact us or browse our store to find the right
                  configuration.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" asChild>
                  <Link to="/#contact">Contact Us</Link>
                </Button>
                <Button
                  variant="outline"
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link to="/store">
                    Shop Lenses <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default OfficeOccupationalPage;
