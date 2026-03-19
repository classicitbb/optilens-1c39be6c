export type RetailerCategory = "Optical retailer" | "Ophthalmology clinic" | "Hospital eye clinic" | "Online optical";

export type RetailerEntry = {
  name: string;
  category: RetailerCategory;
  location: string;
  phone?: string;
  website?: string;
  notes?: string;
};

export type RetailerMarket = {
  slug: string;
  name: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  heroBadge: string;
  entries: RetailerEntry[];
};

export const retailerMarkets: RetailerMarket[] = [
  {
    slug: "barbados",
    name: "Barbados",
    heroBadge: "Featured market",
    seoTitle: "Find an optical in Barbados | Classic Visions retailers & eye clinics",
    seoDescription:
      "Find optical stores and eye clinics in Barbados with search-ready retailer listings, direct contact options, and a dedicated Barbados location guide.",
    intro:
      "Explore optical stores, dispensing centres, and eye care clinics across Barbados. Compare locations quickly, then call, visit, or plan your route with confidence.",
    entries: [
      { name: "Anka Optical", category: "Optical retailer", location: "Speightstown, Saint Peter, Barbados", phone: "+1 246-422-1775" },
      { name: "Belleville Optical Inc.", category: "Optical retailer", location: "8th Ave, Belleville, Barbados", phone: "+1 246-437-3564" },
      { name: "ClearVision Optical", category: "Optical retailer", location: "14 Sky Mall, Barbados", phone: "+1 246-537-3636" },
      { name: "Courts Optical Sunset Crest", category: "Optical retailer", location: "Sunset Mall, Sunset Crest, St. James, Barbados", phone: "+1 246-622-1712" },
      {
        name: "Enhance Vision Optical Inc.",
        category: "Optical retailer",
        location: "#4 Hastings Plaza, Hastings Main Rd, Barbados",
        phone: "+1 246-228-5217",
        website: "https://www.facebook.com/enhancevisionoptical/",
      },
      {
        name: "Express Optical Caveshepherd",
        category: "Optical retailer",
        location: "10-14 Broad Street, Bridgetown, Barbados",
        phone: "+1 246-539-4653",
        website: "https://www.expressoptical.net/",
      },
      {
        name: "Express Optical Sheraton Mall",
        category: "Optical retailer",
        location: "Highway 6, Sargeants Village, Barbados",
        phone: "+1 246-629-4653",
        website: "https://www.expressoptical.net/",
      },
      {
        name: "Eye Focus Inc.",
        category: "Ophthalmology clinic",
        location: "Bridgetown, Christ Church BB15156, Barbados",
        phone: "+1 246-420-3937",
        website: "http://www.eyefocusinc.com/",
      },
      { name: "EyeQ Stylist Opticians", category: "Optical retailer", location: "53 Highway 1, Barbados", phone: "+1 246-419-3937" },
      {
        name: "Harcourt Carter Optical",
        category: "Optical retailer",
        location: "ABC Hwy, Barbados",
        phone: "+1 246-417-5652",
        website: "http://www.harcourtcarteroptical.com/",
      },
      {
        name: "Harcourt Carter Optical",
        category: "Optical retailer",
        location: "5th Ave, Barbados",
        phone: "+1 246-417-5650",
        website: "http://www.harcourtcarteroptical.com/",
      },
      {
        name: "Harcourt Carter Optical",
        category: "Optical retailer",
        location: "Warrens Dome Mall, Barbados",
        phone: "+1 246-417-5651",
        website: "http://www.harcourtcarteroptical.com/",
      },
      {
        name: "Ideal Optical Supplies & Services Inc.",
        category: "Optical retailer",
        location: "29 Plumtree Ave, Barbados",
        phone: "+1 246-421-6299",
        website: "http://idealopticallab.com/",
      },
      { name: "Specs Optical", category: "Optical retailer", location: "Cheapside Rd, Bridgetown, Barbados", phone: "+1 246-426-7030" },
      { name: "Sun Collection Designer Eyewear", category: "Optical retailer", location: "Highway 1, Holetown, St. James, Barbados", phone: "+1 246-271-8250" },
      { name: "Value Optical", category: "Optical retailer", location: "Pinfold St, Bridgetown, Barbados", phone: "+1 246-426-3640" },
      { name: "Visual Oasis", category: "Optical retailer", location: "Saint Thomas, Barbados", phone: "+1 246-538-4741" },
      { name: "Warrens Eye Care Centre", category: "Ophthalmology clinic", location: "10 3rd Ave, Warrens, Barbados", phone: "+1 246-230-4146" },
    ],
  },
  {
    slug: "aruba",
    name: "Aruba",
    heroBadge: "Island directory",
    seoTitle: "Find an optical in Aruba | Classic Visions retailer network",
    seoDescription: "Browse Aruba optical retailers and eye care contacts supplied through the Classic Visions retailer network.",
    intro: "Find Aruba optical shops and eye care contacts, then use phone or web links to schedule your next visit.",
    entries: [
      { name: "Aruba Vision Center", category: "Optical retailer", location: "HW2X+QHW Super Food Plaza, Noord, Aruba", phone: "+2975870434", website: "http://aruba-vision.com/" },
      { name: "Aruba Vision Center", category: "Optical retailer", location: "Caya G. F. Betico Croes 168, Oranjestad, Aruba", phone: "+2975826300", website: "http://aruba-vision.com/" },
      { name: "Aruba Vision Center Savaneta", category: "Optical retailer", location: "F24V+G4Q, Savaneta, Aruba", phone: "+297 280 6300" },
      { name: "Eyeland Opticians", category: "Optical retailer", location: "Caya Bonaire, San Nicolas, Aruba", phone: "+2975873103" },
      { name: "KLY Eye Care", category: "Ophthalmology clinic", location: "Solito 112, Oranjestad, Aruba", phone: "+2975869211", website: "http://kly-eyecare.com/" },
      { name: "Kok Optica", category: "Optical retailer", location: "Wilhelminastraat 11, Oranjestad, Aruba", phone: "+2975837237", website: "http://www.kokoptica.com/" },
      { name: "Pearle Vision Aruba", category: "Optical retailer", location: "Lloyd G. Smith Blvd 134, Oranjestad, Aruba", phone: "+2975882701", website: "http://www.super-retail.com/" },
      { name: "The Specialists Aruba", category: "Ophthalmology clinic", location: "Caya G. F. Betico Croes 222, Oranjestad, Aruba", phone: "+2972902020", website: "https://thespecialists-aruba.com/" },
    ],
  },
  {
    slug: "anguilla",
    name: "Anguilla",
    heroBadge: "Island directory",
    seoTitle: "Find an optical in Anguilla | Classic Visions retailer network",
    seoDescription: "Browse Anguilla optical retailers and clinics in the Classic Visions retailer network.",
    intro: "Use the Anguilla listings below to connect with nearby optical shops and eye clinics.",
    entries: [
      { name: "Anguilla Vision Center & Safety Products", category: "Optical retailer", location: "George Hill 2640, Anguilla", phone: "+1 264-497-3700" },
      { name: "Eyedentity", category: "Optical retailer", location: "Albert Lake Dr, The Valley 2640, Anguilla", phone: "+1 264-772-2020" },
      { name: "Island Optical", category: "Optical retailer", location: "Lower South Hill 2640, Anguilla", phone: "+1 264-497-3700" },
      { name: "The Eye Clinic", category: "Ophthalmology clinic", location: "The Quarter 2640, Anguilla", phone: "+1 264-772-9962" },
    ],
  },
  {
    slug: "antigua-and-barbuda",
    name: "Antigua & Barbuda",
    heroBadge: "Island directory",
    seoTitle: "Find an optical in Antigua and Barbuda | Classic Visions retailer network",
    seoDescription: "Browse Antigua and Barbuda optical retailers and clinics in the Classic Visions retailer network.",
    intro: "Browse retailer and clinic contacts in Antigua and Barbuda, then call ahead to confirm services and appointment availability.",
    entries: [
      { name: "Antigua Optical Co. Ltd.", category: "Optical retailer", location: "45F6+R5R, Antigua & Barbuda", phone: "+1 268-562-1931" },
      { name: "Eye Mobile Vision Care", category: "Ophthalmology clinic", location: "Dr. Rosa Lee Drive, Gambles, Antigua & Barbuda", phone: "+1 268-562-7823", website: "http://eyemobilevisioncare.com/" },
      { name: "Eyeland Optical", category: "Optical retailer", location: "45Q7+QV4, Friars Hill Road, Antigua & Barbuda", phone: "+1 268-462-2020" },
      { name: "Paradise Vision Center", category: "Ophthalmology clinic", location: "American Road, Antigua & Barbuda", phone: "+1 268-562-9150", website: "http://www.paradisevisioncenter.com/" },
      { name: "Progressive Vision", category: "Optical retailer", location: "45GJ+4WP, Old Parham, Antigua & Barbuda", phone: "+1 268-562-6265" },
    ],
  },
  {
    slug: "bahamas",
    name: "Bahamas",
    heroBadge: "Growing network",
    seoTitle: "Find an optical in the Bahamas | Classic Visions eye care directory",
    seoDescription: "Discover featured Bahamas optical retailers and eye clinics curated for Classic Visions patients and partners.",
    intro: "Featured Bahamas partners help patients move from search to appointment faster, especially in Nassau and New Providence.",
    entries: [
      { name: "Bahamas Vision Centre", category: "Ophthalmology clinic", location: "Nassau, Bahamas", website: "https://www.bahamasvisioncentre.com/", notes: "Full-service ophthalmology and surgical eye care." },
      { name: "MJB Optical", category: "Optical retailer", location: "Harbour Bay Shopping Plaza, Nassau, Bahamas", website: "https://www.mjboptical.com/", notes: "Retail eyewear and prescription lens dispensing." },
      { name: "OOGP Vision Division", category: "Ophthalmology clinic", location: "Nassau, Bahamas", website: "https://www.oogpvision.com/", notes: "Eye health, exams, and specialty ophthalmic services." },
    ],
  },
  {
    slug: "bonaire",
    name: "Bonaire",
    heroBadge: "Growing network",
    seoTitle: "Find an optical in Bonaire | Classic Visions eye care directory",
    seoDescription: "Discover featured Bonaire optical and eye care listings curated for Classic Visions visitors.",
    intro: "These Bonaire listings give patients a short list of local optical and eye care options while the network continues to expand.",
    entries: [
      { name: "Bonaire Vision Center", category: "Optical retailer", location: "Kralendijk, Bonaire", notes: "Local optical contact frequently referenced by island residents." },
      { name: "Optica Vista Bonaire", category: "Optical retailer", location: "Kaya Grandi, Kralendijk, Bonaire", notes: "Retail eyewear and prescription support." },
      { name: "Fundashon Mariadal Eye Clinic", category: "Hospital eye clinic", location: "Kralendijk, Bonaire", website: "https://www.fundashonmariadal.com/", notes: "Hospital-based eye care and referrals." },
    ],
  },
  {
    slug: "cayman-islands",
    name: "Cayman Islands",
    heroBadge: "Growing network",
    seoTitle: "Find an optical in the Cayman Islands | Classic Visions eye care directory",
    seoDescription: "Browse featured Cayman Islands optical retailers and eye clinics for exams, dispensing, and frame selection.",
    intro: "Patients in Grand Cayman and beyond can use these featured providers as a fast starting point for exams, eyewear, and follow-up care.",
    entries: [
      { name: "Optique Ltd.", category: "Optical retailer", location: "George Town, Grand Cayman", website: "https://www.optique.ky/", notes: "Eyewear styling, prescription lenses, and dispensing." },
      { name: "Optical Outlook", category: "Optical retailer", location: "Grand Cayman", website: "https://www.opticaloutlook.com/", notes: "Frames, eye exams, and contact lens support." },
      { name: "Caribbean Vision Center", category: "Ophthalmology clinic", location: "George Town, Grand Cayman", website: "https://www.caribbeanvisioncenter.com/", notes: "Specialty ophthalmology and medical eye care." },
    ],
  },
  {
    slug: "dominican-republic",
    name: "Dominican Republic",
    heroBadge: "Growing network",
    seoTitle: "Find an optical in the Dominican Republic | Classic Visions eye care directory",
    seoDescription: "Browse featured Dominican Republic optical retailers and eye clinics curated for Classic Visions visitors.",
    intro: "Use the Dominican Republic section to identify eyewear retailers and ophthalmic clinics for consultations, lenses, and follow-up care.",
    entries: [
      { name: "Óptica Oviedo", category: "Optical retailer", location: "Santo Domingo, Dominican Republic", website: "https://opticaoviedo.com/", notes: "Retail optical and prescription eyewear services." },
      { name: "Centro Láser", category: "Ophthalmology clinic", location: "Santo Domingo, Dominican Republic", website: "https://centrolaser.com.do/", notes: "Advanced ophthalmology and refractive care." },
      { name: "Instituto Espaillat Cabral", category: "Ophthalmology clinic", location: "Santo Domingo, Dominican Republic", website: "https://espaillatcabral.com/", notes: "Medical and surgical eye care." },
    ],
  },
  {
    slug: "grenada",
    name: "Grenada",
    heroBadge: "Growing network",
    seoTitle: "Find an optical in Grenada | Classic Visions eye care directory",
    seoDescription: "Browse featured Grenada optical retailers and eye clinics curated for Classic Visions visitors.",
    intro: "Grenada patients can use these featured listings as a starting point for examinations, eyewear fitting, and specialty eye care.",
    entries: [
      { name: "Grenada Optical", category: "Optical retailer", location: "St. George's, Grenada", notes: "Optical dispensing and everyday eyewear support." },
      { name: "Clear Vision Eye Centre", category: "Ophthalmology clinic", location: "St. George's, Grenada", notes: "Clinic-focused eye care and specialist referrals." },
      { name: "General Hospital Eye Clinic", category: "Hospital eye clinic", location: "St. George's, Grenada", notes: "Hospital eye clinic for referrals and follow-up treatment." },
    ],
  },
  {
    slug: "guadeloupe",
    name: "Guadeloupe",
    heroBadge: "Growing network",
    seoTitle: "Find an optical in Guadeloupe | Classic Visions eye care directory",
    seoDescription: "Browse featured Guadeloupe optical retailers and eye clinics curated for Classic Visions visitors.",
    intro: "Use the Guadeloupe list to quickly identify a local optical or eye care option before you book your visit.",
    entries: [
      { name: "Optic 2000 Guadeloupe", category: "Optical retailer", location: "Pointe-à-Pitre, Guadeloupe", website: "https://www.optic2000.com/", notes: "National optical retailer with Guadeloupe presence." },
      { name: "Kaz Optic", category: "Optical retailer", location: "Baie-Mahault, Guadeloupe", notes: "Independent optical retail and eyewear support." },
      { name: "Centre Ophtalmologique de Guadeloupe", category: "Ophthalmology clinic", location: "Les Abymes, Guadeloupe", notes: "Specialist eye care and ophthalmology services." },
    ],
  },
  {
    slug: "jamaica",
    name: "Jamaica",
    heroBadge: "Growing network",
    seoTitle: "Find an optical in Jamaica | Classic Visions eye care directory",
    seoDescription: "Browse featured Jamaica optical retailers and eye clinics for eyewear, exams, and specialist eye care.",
    intro: "The Jamaica directory highlights a mix of eyewear retailers and specialist eye care providers to speed up retailer discovery.",
    entries: [
      { name: "Optical Solutions International", category: "Optical retailer", location: "Kingston, Jamaica", website: "https://www.opticalsolutionsja.com/", notes: "Prescription eyewear, eye exams, and contact lens support." },
      { name: "Fontana Opticals", category: "Optical retailer", location: "Kingston and Montego Bay, Jamaica", website: "https://www.fontanapharmacy.com/", notes: "Retail optical services through a trusted national brand." },
      { name: "Jamaica Eye Centre", category: "Ophthalmology clinic", location: "Kingston, Jamaica", website: "https://jamaicaeyecentre.com/", notes: "Ophthalmology, diagnostics, and specialist eye care." },
    ],
  },
  {
    slug: "montserrat",
    name: "Montserrat",
    heroBadge: "Growing network",
    seoTitle: "Find an optical in Montserrat | Classic Visions eye care directory",
    seoDescription: "Browse featured Montserrat eye care contacts and escalation options curated for Classic Visions visitors.",
    intro: "Eye care choice is limited on Montserrat, so this section highlights starting points and referral-friendly providers.",
    entries: [
      { name: "Glendon Hospital Eye Clinic", category: "Hospital eye clinic", location: "St. John's, Montserrat", notes: "Public hospital referral point for eye care and visiting specialists." },
      { name: "Montserrat Medical Outreach Eye Clinics", category: "Ophthalmology clinic", location: "Island-wide visiting clinic schedule, Montserrat", notes: "Visiting eye clinics may operate on scheduled outreach days." },
    ],
  },
  {
    slug: "saint-lucia",
    name: "Saint Lucia",
    heroBadge: "Growing network",
    seoTitle: "Find an optical in Saint Lucia | Classic Visions eye care directory",
    seoDescription: "Browse featured Saint Lucia optical retailers and eye clinics curated for Classic Visions visitors.",
    intro: "Saint Lucia patients can use these featured providers for eyewear, eye exams, and specialist care discussions.",
    entries: [
      { name: "Vision Express St. Lucia", category: "Optical retailer", location: "Castries, Saint Lucia", website: "https://visionexpressslu.com/", notes: "Retail optical and prescription eyewear support." },
      { name: "Island Optical St. Lucia", category: "Optical retailer", location: "Castries, Saint Lucia", notes: "Independent optical retail and eyewear dispensing." },
      { name: "Tapion Hospital Eye Clinic", category: "Hospital eye clinic", location: "Castries, Saint Lucia", website: "https://tapionhospital.com/", notes: "Hospital-based consultations and specialist referrals." },
    ],
  },
  {
    slug: "trinidad-and-tobago",
    name: "Trinidad & Tobago",
    heroBadge: "Growing network",
    seoTitle: "Find an optical in Trinidad and Tobago | Classic Visions eye care directory",
    seoDescription: "Browse featured Trinidad and Tobago optical retailers and eye clinics for eyewear, exams, and specialist eye care.",
    intro: "Find a shortlist of Trinidad and Tobago providers for exams, frames, prescription lenses, and follow-up eye care.",
    entries: [
      { name: "Eye Assist", category: "Optical retailer", location: "Trinidad & Tobago", website: "https://www.eyeassisttt.com/", notes: "Retail optical care and prescription eyewear support." },
      { name: "Look Opticians", category: "Optical retailer", location: "Port of Spain, Trinidad", website: "https://lookopticians.com/", notes: "Optical dispensing and designer eyewear." },
      { name: "St. Clair Eye Centre", category: "Ophthalmology clinic", location: "St. Clair, Port of Spain, Trinidad", website: "https://stclaireyecentre.com/", notes: "Medical and surgical eye care." },
    ],
  },
  {
    slug: "turks-and-caicos",
    name: "Turks & Caicos",
    heroBadge: "Growing network",
    seoTitle: "Find an optical in Turks and Caicos | Classic Visions eye care directory",
    seoDescription: "Browse featured Turks and Caicos optical retailers and eye clinics curated for Classic Visions visitors.",
    intro: "These Turks and Caicos listings provide a practical starting point for island visitors and residents who need optical support.",
    entries: [
      { name: "TCI Optical", category: "Optical retailer", location: "Providenciales, Turks & Caicos", notes: "Local dispensing support and eyewear services." },
      { name: "InterHealth Canada Eye Clinic", category: "Hospital eye clinic", location: "Cheshire Hall Medical Centre, Providenciales, Turks & Caicos", website: "https://www.interhealthcanadaturksandcaicos.com/", notes: "Public hospital eye care referrals and specialist support." },
      { name: "Associated Medical Practices Eye Clinic", category: "Ophthalmology clinic", location: "Providenciales, Turks & Caicos", website: "https://www.amps.tc/", notes: "Private practice consultations and follow-up care." },
    ],
  },
  {
    slug: "caribbean-online-opticals",
    name: "Caribbean Online Opticals",
    heroBadge: "Digital option",
    seoTitle: "Caribbean online optical options | Classic Visions eye care directory",
    seoDescription: "Discover digital-first Caribbean optical options and remote appointment pathways curated for Classic Visions visitors.",
    intro: "Some patients prefer digital-first eyewear support. This section highlights online and appointment-request pathways for the region.",
    entries: [
      { name: "GlassesOnline Caribbean", category: "Online optical", location: "Regional Caribbean shipping", notes: "Online ordering option for patients who know their prescription and frame fit preferences." },
      { name: "Classic Visions retailer request", category: "Online optical", location: "Barbados-based support for Caribbean routing", website: "/#contact", notes: "Use the contact form if you need help locating a local partner or arranging the right referral." },
    ],
  },
];

export const retailerMarketMap = new Map(retailerMarkets.map((market) => [market.slug, market]));

export const retailerCountries = retailerMarkets.map((market) => ({
  slug: market.slug,
  name: market.name,
  count: market.entries.length,
}));

export const retailerSearchIndex = retailerMarkets.flatMap((market) =>
  market.entries.map((entry) => ({
    marketSlug: market.slug,
    marketName: market.name,
    ...entry,
    searchValue: [market.name, entry.name, entry.category, entry.location, entry.phone ?? "", entry.website ?? "", entry.notes ?? ""]
      .join(" ")
      .toLowerCase(),
  })),
);

export const barbadosFaqs = [
  {
    question: "Where can I find an optical in Barbados?",
    answer:
      "The Barbados directory groups dispensing centres, optical retailers, and eye care clinics so patients can search quickly and compare contact options before they visit.",
  },
  {
    question: "Can I search Barbados retailers by area or provider name?",
    answer:
      "Yes. The retailer finder supports search filtering across island name, retailer name, location details, phone, and care category.",
  },
  {
    question: "What should I bring before visiting a Barbados retailer?",
    answer:
      "Bring your latest prescription, any previous pair of glasses, and notes about your routine such as screen time, night driving, or outdoor use so the team can guide lens selection.",
  },
];
