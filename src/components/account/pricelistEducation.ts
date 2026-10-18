import { progressiveProducts } from "@/data/progressiveProducts";
import { photochromicProfiles } from "@/data/photochromicProfiles";

export interface LensEducation {
  summary: string;
  traits: string[];
  href: string;
}

const guide = (summary: string, href: string, traits: string[] = []): LensEducation => ({ summary, href, traits });

const progressiveKeys = ["progressive_best", "progressive_better", "progressive_good", "progressive_adapt"];
export const designEducation: Record<string, LensEducation> = Object.fromEntries(
  progressiveProducts.map((product, index) => [progressiveKeys[index], guide(
    `${product.name}: ${product.description}`,
    "/lenses/progressive",
    product.features.slice(0, 3),
  )]),
);

Object.assign(designEducation, {
  specific_use_office: guide("Designed for near and intermediate tasks such as reading and computer work. Different from an all-distance progressive: its focus is the working area around you.", "/lenses/office-occupational"),
  specific_use_sport: guide("Lens designs for sports and active outdoor use, with options for activities such as cycling, golf and boating. Frame fit and the activity help determine the right design.", "/lenses/sport"),
  single_vision_antifatigue: guide("Adds a little extra support for close work, reading and screens. Different from a full progressive: it is designed around reducing the effort of near tasks.", "/lenses/anti-fatigue"),
  specific_use_bifocal_ft: guide("Conventional bifocals have separate distance and reading zones with a visible dividing line. This is the conventional bifocal category on this pricelist.", "/lenses/bifocals"),
  specific_use_bifocal_round: guide("Digital bifocals use free-form surfacing for a two-zone distance-and-reading design. Unlike a progressive, the reading zone is distinct.", "/lenses/bifocals"),
  single_vision_hd: guide("Personalized free-form single vision, for one viewing distance. This digital category differs from conventional single vision in how the lens is designed and surfaced.", "/lenses/single-vision"),
  single_vision_regular: guide("Conventional single vision corrects one viewing distance, such as distance or reading. It does not combine distance and reading zones like a multifocal lens.", "/lenses/single-vision"),
});

const photo = (name: string) => guide(photochromicProfiles.find((profile) => profile.name === name)!.summary, "/photochromic");
export const treatmentEducation: Record<string, LensEducation> = {
  clear: guide("Lenses without a sun tint or light-changing treatment. Anti-reflective and other coatings are separate choices.", "/lenses/lens-types"),
  transitions_gen_s: photo("Transitions® GEN S™"),
  transitions_xtractive_new_generation: photo("Transitions® XTRActive® New Generation"),
  transitions_xtractive_polarized: photo("Transitions® XTRActive® Polarized"),
  photochromic_gray: photo("Generic Photochromics"),
  polarized: guide("Sun lenses that reduce reflected glare from surfaces such as roads and water. Useful for outdoor comfort; they are different from ordinary tinted lenses.", "/lenses/polarized"),
  uv420: guide("A lens option for managing blue-violet light. Compare it with the site's blue-filter guide and ask which lens and coating combination suits the wearer.", "/lenses/blue-filter"),
};
treatmentEducation.trans_gen_s = treatmentEducation.transitions_gen_s;
treatmentEducation.transitions_gen_s_2 = treatmentEducation.transitions_gen_s;
