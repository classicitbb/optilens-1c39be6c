export type SpecialtyLens = {
  id: string;
  name: string;
  shortDescription: string;
  overview: string;
  idealFor: string[];
  benefits: string[];
  technology?: string[];
  technologyDetails?: string[];
  orderingInformation: string[];
  practiceBenefits?: string[];
  classification: string;
  pricingLensId: string;
  orderingLensId: string;
};

export const specialtyLenses: SpecialtyLens[] = [
  {
    id: "endless-pilot-progressive",
    name: "Endless Pilot Progressive",
    shortDescription:
      "A specialised progressive lens with two near-vision zones, giving comfortable near vision through both the upper and lower parts of the lens for tasks requiring frequent changes in gaze direction.",
    overview:
      "Endless Pilot Progressive combines a standard lower progressive power progression with an additional near-vision segment in the upper part of the lens. This creates near-vision areas at both the top and bottom of the lens. It is intended for special or occasional use where the wearer must frequently view close objects both below and above eye level.",
    idealFor: [
      "Pilots and flight personnel viewing overhead instruments",
      "Dentists and surgeons",
      "Mechanics, electricians and technicians",
      "Machine operators and warehouse personnel",
      "Anyone who frequently alternates between distance, conventional near work and overhead close work",
    ],
    benefits: [
      "Precise and comfortable near vision through the upper and lower lens areas",
      "Improved postural ergonomics with fewer unnecessary head movements",
      "Easy transitions between different viewing areas",
      "Comfortable focus across working distances",
      "Reduced perceived peripheral blur",
      "Upper segment adaptable to the wearer's visual needs",
    ],
    technology: [
      "Spatial Vision Technology",
      "Eye Focus Profile",
      "Ray Tracing Technology",
      "Fitting Configuration / individualisation",
      "IOT Digital Ray-Path 2 optimisation",
    ],
    technologyDetails: [
      "Spatial Vision extends areas of clear focus and supports rapid transitions in dynamic environments.",
      "Eye Focus Profile enlarges useful clear areas and reduces perceived peripheral defocus.",
      "Ray Tracing performs point-by-point optimisation across the lens surface for more consistent perceived power.",
      "Fitting Configuration can account for prescription, facial morphology, frame shape and position-of-wear data.",
    ],
    orderingInformation: [
      "Variable minimum fitting height: 14–18 mm in 1 mm steps",
      "Variable near inset: 0–4 mm in 0.5 mm steps",
      "Upper addition: +0.75 D to +1.50 D in 0.12 D steps",
      "Standard addition: +1.00 D to +3.00 D in 0.25 D steps",
      "Upper segment typically 5–8 mm above the pupil",
      "Minimum distance from fitting cross to top of lens: 14 mm in the standard configuration",
      "Capture monocular PD and fitting height",
      "Use individual position-of-wear and frame measurements where available; defaults may be used where the ordering system permits",
    ],
    classification: "Special-purpose / occasional-use progressive lens.",
    pricingLensId: "endless-pilot-progressive",
    orderingLensId: "endless-pilot-progressive",
  },
  {
    id: "omnilux-nal",
    name: "OmniLux NAL",
    shortDescription:
      "A Natural Accommodation Lens designed to provide continuous multifocal vision with the appearance and straightforward dispensing process of a single-vision lens.",
    overview:
      "OmniLux NAL is a freeform multifocal lens based on Natural Accommodation Lens technology. It is positioned as an alternative to conventional bifocal, trifocal and progressive designs. The design aims to provide connected vision from distance through intermediate to near while retaining a single-vision appearance.",
    idealFor: [
      "First-time multifocal wearers",
      "Patients who have struggled with conventional progressive adaptation",
      "Existing multifocal wearers seeking a broader intermediate experience",
      "Wearers wanting a lens without a visible segment line",
      "Practices seeking a simpler multifocal dispensing workflow",
    ],
    benefits: [
      "No conventional fitting-height measurement required",
      "Ordered and dispensed similarly to a single-vision lens",
      "Continuous connected vision from distance to near",
      "Broad intermediate viewing area",
      "Comfortable near viewing",
      "No visible bifocal or trifocal line",
      "Available across multiple materials and treatments, subject to the current laboratory offering",
    ],
    technologyDetails: [
      "Manufacturer literature describes the useful visual fields as funnel-shaped rather than the conventional hourglass-shaped corridor associated with many progressive lenses. This is intended to create smoother connections between distance, intermediate and near zones.",
    ],
    orderingInformation: [
      "Measure and order similarly to a single-vision lens",
      "Monocular or pupil-distance measurement is required",
      "No conventional fitting-height measurement is required",
      "Manufacturer recommends a minimum frame eye size of 34 mm",
      "Verify the frame sits with approximately 9 degrees pantoscopic tilt for best performance",
      "The Distance Reference Point, Layout Reference Point and Engraving Reference Point coincide",
      "Engraving marks are 34 mm apart horizontally on the 180-degree line",
      "Distance Reference Point is 12 mm above the centred reference marks",
      "Near Reference Point is approximately 3 mm in and 12 mm below the reference marks",
      "Verify final pantoscopic tilt when dispensing",
    ],
    practiceBenefits: [
      "Simplified measuring and verification workflow",
      "Reduced risk of remakes attributed to fitting-height errors",
      "Premium specialty-lens positioning",
      "Faster dispensing process than conventional fitting-height-dependent multifocals",
    ],
    classification:
      "Natural Accommodation multifocal lens; not a conventional bifocal, trifocal or standard PAL.",
    pricingLensId: "omnilux-nal",
    orderingLensId: "omnilux-nal",
  },
];

// The current price-request and LabLink routes do not have a documented lens-preselection API.
// Preserve the selected identifier in the URL so those routes can adopt it without changing this page's contract.
export const getSpecialtyLensActionPaths = (lens: SpecialtyLens) => ({
  pricing: `/professionals/price-list-request?selectedLens=${encodeURIComponent(lens.pricingLensId)}`,
  ordering: `/rx-order?selectedLens=${encodeURIComponent(lens.orderingLensId)}`,
});
