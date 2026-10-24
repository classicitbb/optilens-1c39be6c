// Shared with the public photochromic guide.
type LensProfile = {
  name: string;
  family: "Darkun" | "Transitions" | "Category";
  positioning: string;
  summary: string;
  idealFor: string[];
  colors: { name: string; hex: string }[];
  cta?: { label: string; to: string };
};

export const photochromicProfiles: LensProfile[] = [
  {
    name: "Generic Photochromics",
    family: "Category",
    positioning: "Value adaptive lenses",
    summary: "Baseline photochromic lenses that darken in UV light and clear indoors. Performance varies by supplier and material.",
    idealFor: ["Budget-focused buyers", "First-time photochromic wearers", "General everyday use"],
    colors: [{ name: "Gray", hex: "#6b7280" }],
  },
  {
    name: "Darkun™",
    family: "Darkun",
    positioning: "House photochromic option",
    summary: "Darkun is our branded photochromic option with UV activation, rapid fade back, and all-day UV400 protection for one-pair convenience.",
    idealFor: ["Patients who want one pair", "Daily commuters", "Users comparing branded upgrades"],
    colors: [{ name: "Gray", hex: "#5b6470" }, { name: "Brown (special order)", hex: "#7b5538" }],
  },
  {
    name: "Transitions® GEN S™",
    family: "Transitions",
    positioning: "Fast everyday flagship + style color family",
    summary: "Transitions positions GEN S as a fast everyday generation; style color options are grouped here for shoppers comparing both performance and color personalization.",
    idealFor: ["Patients moving in/outdoors often", "Style-conscious users", "General all-day wear"],
    colors: [
      { name: "Gray", hex: "#68707b" },
      { name: "Brown", hex: "#6d4c33" },
      { name: "Graphite Green", hex: "#4f5c4f" },
      { name: "Amethyst", hex: "#6e5a7d" },
      { name: "Amber", hex: "#b2672f" },
      { name: "Emerald", hex: "#2f6f57" },
      { name: "Ruby", hex: "#8c2f3f" },
      { name: "Sapphire", hex: "#2e4d87" },
    ],
  },
  {
    name: "Transitions® XTRActive® New Generation",
    family: "Transitions",
    positioning: "Extra-light-reactive performance",
    summary: "XTRActive New Generation is designed for people sensitive to bright light, with deeper activation outdoors and noticeable in-car activation behind windshields.",
    idealFor: ["Bright climate wearers", "Frequent drivers", "Light-sensitive users"],
    colors: [{ name: "Gray", hex: "#5c6570" }, { name: "Brown", hex: "#664732" }],
  },
  {
    name: "Transitions® XTRActive® Polarized",
    family: "Transitions",
    positioning: "Adaptive + polarization",
    summary: "Lenses that darken as the light changes and reduce reflected glare outdoors, such as glare from roads and water.",
    idealFor: ["Drivers", "Boaters", "Patients wanting adaptive glare control"],
    colors: [{ name: "Gray", hex: "#5a626d" }],
  },
  {
    name: "Transitions® Drivewear®",
    family: "Transitions",
    positioning: "Driving-specialized polarized lens",
    summary: "Drivewear is a dedicated polarized driving lens that starts tinted (not clear indoors) and shifts color intensity with changing outdoor and behind-the-windshield conditions.",
    idealFor: ["Dedicated driving pair", "High-glare commuters", "Road sport enthusiasts"],
    colors: [{ name: "Olive/Amber-Copper family", hex: "#7e5d2d" }],
    cta: { label: "Night driving guide", to: "/patients/night-driving-aids" },
  },
];

