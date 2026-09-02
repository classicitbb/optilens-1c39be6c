import {
  Boxes,
  Building2,
  ClipboardCheck,
  Eye,
  FlaskConical,
  Gauge,
  Glasses,
  Globe,
  Headphones,
  Layers,
  LifeBuoy,
  MapPin,
  PackageSearch,
  ScanEye,
  ShieldCheck,
  Sparkles,
  Sun,
  Truck,
  Wrench,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  ⚠ PLACEHOLDERS — see docs/homepage-version-b-audit.md for the fill-in list */
/*  Everything outside this block is sourced from copy already published on    */
/*  the live site (Products, Features, Professionals, navigation registry).    */
/* -------------------------------------------------------------------------- */
export const PLACEHOLDERS = {
  /** Year the lab was established. Used in the hero eyebrow + LocalBusiness schema. */
  foundingYear: "",
  /** e.g. "3–5 business days". Used in the FAQ + onboarding step 4. */
  standardTurnaround: "",
  /** e.g. "1–2 business days". Used in onboarding step 1. */
  accountApprovalTime: "",
  /** Territories you actively ship to, in order of volume. */
  servedTerritories: "",
  /** Trade partner quotes. Section is hidden until at least one is supplied. */
  testimonials: [] as Array<{ quote: string; name: string; role: string; practice: string }>,
  /** Supplier / brand logos for the credibility strip. Strip is hidden while empty. */
  partnerLogos: [] as Array<{ name: string; src: string }>,
} as const;

/* -------------------------------------------------------------------------- */
/*  Verified facts                                                             */
/* -------------------------------------------------------------------------- */
export const BUSINESS = {
  name: "Classic Visions",
  url: "https://www.classicvisions.net",
  phoneDisplay: "+1 246 433-4928",
  phoneHref: "tel:+12464334928",
  streetAddress: "Uplands Factory, Four Roads",
  addressLocality: "Saint George",
  postalCode: "BB20031",
  addressCountry: "BB",
  sameAs: [
    "https://www.facebook.com/classicvisionscb",
    "https://www.instagram.com/classicvisionscb",
    "https://www.linkedin.com/company/classic-visions/",
  ],
} as const;

/**
 * The answer-first definition sentence. This is the single most quotable line
 * on the page for AI answer engines — keep it factual, self-contained, and
 * front-load the entity name, category, and service area.
 */
export const DEFINITION_SENTENCE =
  "Classic Visions is a Barbados-based wholesale optical laboratory that supplies prescription lenses, lens coatings, and optical and lab supplies to opticians, eye clinics, and optical retailers across the Caribbean.";

/* -------------------------------------------------------------------------- */
/*  Hero — dual audience                                                       */
/* -------------------------------------------------------------------------- */
export type Audience = "professional" | "visitor";

export const heroPaths = {
  professional: {
    eyebrow: "For opticians, clinics & optical retailers",
    title: "Open a trade account",
    description:
      "Trade pricing, LabLink ordering, order tracking, and a technical team that answers. Apply once — we handle onboarding from there.",
    primaryLabel: "Apply for a trade account",
    primaryHref: "/professionals/trade-account",
    secondaryLabel: "Already a customer? Start an Rx order",
    secondaryHref: "/profile/rx-order",
    actions: [
      { label: "Request a price list", href: "/professionals/price-list-request", icon: ClipboardCheck },
      { label: "Track an order", href: "/profile/orders", icon: PackageSearch },
      { label: "Find a lens & price", href: "/profile/rx-order", icon: ScanEye },
    ],
  },
  visitor: {
    eyebrow: "For patients & spectacle wearers",
    title: "Find an optician near you",
    description:
      "We don't sell directly to the public — we make the lenses your optician fits. Find a participating Caribbean retailer and understand your options before you go.",
    primaryLabel: "Find an optical retailer",
    primaryHref: "/find-a-retailer",
    secondaryLabel: "Compare lens types in plain English",
    secondaryHref: "/patients/lens-differences",
    actions: [
      { label: "Why choose progressives?", href: "/patients/progressive-lenses", icon: Eye },
      { label: "Caring for your glasses", href: "/patients/caring-for-glasses", icon: Glasses },
      { label: "Screen strain & anti-fatigue", href: "/patients/anti-fatigue-lenses", icon: Sparkles },
    ],
  },
} as const;

/** Published, defensible claims only — no unverified numbers. */
export const heroProofPoints = [
  { label: "Lab location", value: "Barbados", icon: MapPin },
  { label: "Order processing", value: "Same day before 2 PM", icon: Gauge },
  { label: "Delivery", value: "Caribbean-wide freight", icon: Truck },
  { label: "Material range", value: "Index 1.50 – 1.74", icon: Layers },
] as const;

/* -------------------------------------------------------------------------- */
/*  What we supply — internal linking to money pages                           */
/* -------------------------------------------------------------------------- */
export const capabilityPillars = [
  {
    icon: Wrench,
    title: "Rx lab services",
    description:
      "Custom surfacing, precision edging, tinting, and specialty coating handled in-house so a job doesn't cross three suppliers before it reaches your bench.",
    href: "/rx-lab-services",
    links: [
      { label: "Lab process overview", href: "/professionals/lab-process-overview" },
      { label: "Tracing & cutting guide", href: "/professionals/tracing-cutting-guide" },
      { label: "Lens ordering tips", href: "/professionals/lens-ordering-tips" },
    ],
  },
  {
    icon: Layers,
    title: "Semi-finished & finished lenses",
    description:
      "Custom-surfaced single vision, bifocal, and progressive prescriptions, plus ready-to-edge stock lenses when the patient needs them this week.",
    href: "/store?category=surfaced",
    links: [
      { label: "Finished lens stock", href: "/store?category=finished" },
      { label: "Materials 1.50 – 1.74", href: "/lenses/materials" },
      { label: "Thickness chart", href: "/lenses/thickness-chart" },
    ],
  },
  {
    icon: ShieldCheck,
    title: "Coatings & treatments",
    description:
      "Anti-reflective, blue-violet management, mirror finishes, hard coat, UV filtering, and hydrophobic top coats — specified per job, not bundled blind.",
    href: "/coatings",
    links: [
      { label: "Blue Defense AR+", href: "/coatings/blueblock-ar" },
      { label: "Mirror finish", href: "/coatings/mirror" },
      { label: "UV Shield", href: "/coatings/uv-shield" },
    ],
  },
  {
    icon: FlaskConical,
    title: "Lab & dispensary supplies",
    description:
      "Surfacing consumables, finishing supplies, equipment parts, frames, cases, cleaning solutions, and display accessories on one trade account.",
    href: "/store?category=lab",
    links: [
      { label: "Optical supplies", href: "/store?category=optical" },
      { label: "Vizionize lens cleaner", href: "/vizionize-cleaner" },
      { label: "Browse the full store", href: "/store" },
    ],
  },
  {
    icon: Boxes,
    title: "House brands",
    description:
      "ZenVue Brilliance™ progressives, single vision, and the Darkun™ photochromic family — margin-friendly lines you can build a dispensing story around.",
    href: "/zenvue/brilliance",
    links: [
      { label: "ZenVue single vision", href: "/zenvue/single-vision" },
      { label: "Photochromic guide", href: "/photochromic" },
      { label: "ZenVue wholesale", href: "/zenvue/wholesale" },
    ],
  },
  {
    icon: Globe,
    title: "Optician website design",
    description:
      "Modern, bookable websites built specifically for optical retail — custom branding, online booking, and mobile-first layouts, run by our own digital team.",
    href: "/optical-retail-websites",
    links: [
      { label: "See the approach", href: "/optical-retail-websites" },
      { label: "Latest insights", href: "/blog" },
      { label: "Knowledge hub", href: "/knowledge" },
    ],
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Lens & coating explorer — keyword-dense internal link grid                  */
/* -------------------------------------------------------------------------- */
export const lensExplorer = [
  {
    title: "Vision correction",
    icon: Eye,
    items: [
      { label: "Single vision", href: "/lenses/single-vision" },
      { label: "Progressives", href: "/lenses/progressive" },
      { label: "Bifocals", href: "/lenses/bifocals" },
      { label: "Office & occupational", href: "/lenses/office-occupational" },
      { label: "Anti-fatigue", href: "/lenses/anti-fatigue" },
      { label: "Myopia control", href: "/lenses/myopia-control" },
    ],
  },
  {
    title: "Lifestyle lenses",
    icon: Sun,
    items: [
      { label: "Photochromic", href: "/photochromic" },
      { label: "Polarized", href: "/lenses/polarized" },
      { label: "LED PRO", href: "/lenses/led-pro" },
      { label: "Blue filter", href: "/lenses/blue-filter" },
      { label: "Tints & fashion colors", href: "/lenses/tints-fashion-colors" },
      { label: "Specialty lenses", href: "/lenses/specialty" },
    ],
  },
  {
    title: "Coatings",
    icon: ShieldCheck,
    items: [
      { label: "Super AR", href: "/coatings/ultraclear-ar" },
      { label: "Blue Defense AR+", href: "/coatings/blueblock-ar" },
      { label: "Mirror finish", href: "/coatings/mirror" },
      { label: "Scratch-resistant", href: "/coatings/scratch-resistant" },
      { label: "UV Shield", href: "/coatings/uv-shield" },
      { label: "Hydrophobic & oleophobic", href: "/coatings/hydrophobic-oleophobic" },
    ],
  },
  {
    title: "Specs & guidance",
    icon: Layers,
    items: [
      { label: "Materials 1.50 – 1.74", href: "/lenses/materials" },
      { label: "Thickness chart", href: "/lenses/thickness-chart" },
      { label: "Lens design guide", href: "/lenses/lens-types" },
      { label: "Chemistrie clip system", href: "/professionals/chemistrie-lens-system" },
      { label: "Dispensing tips", href: "/dispensing-tips" },
      { label: "Knowledge hub", href: "/knowledge" },
    ],
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Onboarding — the "slick, natural" trade path                               */
/* -------------------------------------------------------------------------- */
export const onboardingSteps = [
  {
    number: "01",
    title: "Apply in a few minutes",
    text: "One short trade application. Practice details, who does the ordering, and what you dispense most — nothing you have to dig for.",
    meta: PLACEHOLDERS.accountApprovalTime
      ? `Typically approved in ${PLACEHOLDERS.accountApprovalTime}`
      : "We confirm receipt the same working day",
    href: "/professionals/trade-account",
    linkLabel: "Start the application",
    icon: Building2,
  },
  {
    number: "02",
    title: "Get your pricing",
    text: "We build your price list around what you actually sell, then walk your team through it — no guessing which column applies to you.",
    meta: "Ask for a revised list any time your mix changes",
    href: "/professionals/price-list-request",
    linkLabel: "Request a price list",
    icon: ClipboardCheck,
  },
  {
    number: "03",
    title: "Order the way that suits you",
    text: "Submit an Rx through the online form, order stock from the trade store, or call it in. Same job, same tracking, whichever route you take.",
    meta: "Rx form, trade store, phone, or LabLink",
    href: "/profile/rx-order",
    linkLabel: "Open the Rx order form",
    icon: ScanEye,
  },
  {
    number: "04",
    title: "Track it to the door",
    text: "Live job status from surfacing through dispatch, with freight and delivery handled across the region and a named person to call if anything moves.",
    meta: PLACEHOLDERS.standardTurnaround
      ? `Standard turnaround ${PLACEHOLDERS.standardTurnaround}`
      : "Turnaround varies by Rx, material, and coating",
    href: "/profile/orders",
    linkLabel: "See order tracking",
    icon: PackageSearch,
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Support promise — what existing customers actually care about              */
/* -------------------------------------------------------------------------- */
export const supportPromises = [
  {
    icon: Headphones,
    title: "A team that answers",
    text: "Dedicated optical consultants for technical questions, not a ticket queue that goes quiet.",
    href: "/professionals/customer-service",
    linkLabel: "Customer service & hours",
  },
  {
    icon: Truck,
    title: "Freight you can plan around",
    text: "Transit times, customs handling, tracking, and delivery support set out in writing before you order.",
    href: "/professionals/freight-delivery-policy",
    linkLabel: "Freight & delivery policy",
  },
  {
    icon: LifeBuoy,
    title: "Remakes handled properly",
    text: "Clear eligibility, reporting windows, and remake requests — so a problem lens doesn't become a problem week.",
    href: "/professionals/returns-replacements",
    linkLabel: "Returns & replacements",
  },
  {
    icon: ShieldCheck,
    title: "Your frames, your terms",
    text: "Repairs and customer-supplied frame glazing covered by published policy, including risk and liability.",
    href: "/professionals/customer-supplied-frames-policy",
    linkLabel: "Customer-supplied frames",
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  FAQ — the AEO surface. Answers are self-contained and quotable.            */
/* -------------------------------------------------------------------------- */
export const faqs = [
  {
    question: "Does Classic Visions sell glasses directly to the public?",
    answer:
      "No. Classic Visions is a wholesale optical laboratory and supplies optical professionals only — opticians, eye clinics, and optical retailers. If you are a patient looking for glasses, use our retailer finder to locate a participating optical practice in your island, and ask them about Classic Visions lenses.",
    links: [{ label: "Find an optical retailer", href: "/find-a-retailer" }],
  },
  {
    question: "How do I open a trade account with Classic Visions?",
    answer:
      "Complete the online trade account application with your practice details. Once your account is set up we build a price list around the products you dispense, give you access to the online Rx order form and order tracking, and introduce you to the person who will look after your account.",
    links: [
      { label: "Apply for a trade account", href: "/professionals/trade-account" },
      { label: "Request a price list", href: "/professionals/price-list-request" },
    ],
  },
  {
    question: "What lenses does Classic Visions supply?",
    answer:
      "Custom-surfaced semi-finished lenses and ready-to-edge finished stock lenses in single vision, bifocal, and progressive designs, in materials from index 1.50 to 1.74. Lifestyle options include photochromic, polarized, blue filter, LED PRO, tints, myopia control, and specialty lenses.",
    links: [
      { label: "Compare materials", href: "/lenses/materials" },
      { label: "Lens design guide", href: "/lenses/lens-types" },
    ],
  },
  {
    question: "What lens coatings are available?",
    answer:
      "Super AR multi-layer anti-reflective, Blue Defense AR+ for blue-violet management, mirror finishes for fashion and sport, scratch-resistant hard coat, UV Shield for UVA, UVB and blue-violet filtering, and hydrophobic and oleophobic top coats.",
    links: [
      { label: "Browse all coatings", href: "/coatings" },
      { label: "How AR coating works", href: "/knowledge#how-ar-coating-works" },
    ],
  },
  {
    question: "Where is Classic Visions located and where do you deliver?",
    answer:
      "The lab is at Uplands Factory, Four Roads, Saint George, Barbados. We supply optical practices across the Caribbean, with freight, customs handling, transit times, and tracking set out in our published freight and delivery policy.",
    links: [{ label: "Freight & delivery policy", href: "/professionals/freight-delivery-policy" }],
  },
  {
    question: "How do I place and track a prescription order?",
    answer:
      "Trade account holders submit prescriptions through the online Rx order form in My Account, or order stock items from the trade store. Every job appears in order tracking with live status from surfacing through dispatch. Orders placed before 2 PM are processed the same day.",
    links: [
      { label: "Rx order form", href: "/profile/rx-order" },
      { label: "Order tracking", href: "/profile/orders" },
    ],
  },
  {
    question: "How long does a prescription job take?",
    answer:
      "Turnaround depends on the prescription, the lens material, and the coatings specified — a stock finished lens leaves far sooner than a high-index progressive with a mirror finish. Your order tracking shows the live status of each job, and your account contact can confirm a date before you commit to a patient.",
    links: [{ label: "Lab process overview", href: "/professionals/lab-process-overview" }],
  },
  {
    question: "Can I send patient-owned frames for glazing?",
    answer:
      "Yes. Glazing customer-supplied frames is covered by a published at-risk policy that sets out assessment, risk, and liability, so both sides know where they stand before the frame is cut. Repairs are covered by a separate policy.",
    links: [
      { label: "Customer-supplied frames policy", href: "/professionals/customer-supplied-frames-policy" },
      { label: "Repairs policy", href: "/professionals/repairs-policy" },
    ],
  },
  {
    question: "What happens if a lens needs a remake or return?",
    answer:
      "Report it through your account contact or customer service within the reporting window in our returns and replacements policy. The policy sets out what is eligible, how remakes are requested, and what to expect once a remake is raised.",
    links: [{ label: "Returns & replacements", href: "/professionals/returns-replacements" }],
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Patient lane                                                               */
/* -------------------------------------------------------------------------- */
export const patientLinks = [
  { label: "What's the difference between lens types?", href: "/patients/lens-differences" },
  { label: "Why choose progressive lenses?", href: "/patients/progressive-lenses" },
  { label: "Eye strain & anti-fatigue lenses", href: "/patients/anti-fatigue-lenses" },
  { label: "Caring for your glasses", href: "/patients/caring-for-glasses" },
  { label: "Sunlight & UV protection", href: "/patients/sunlight-protection" },
  { label: "Night driving aids", href: "/patients/night-driving-aids" },
] as const;
