import CoatingArticleLayout from "@/components/coatings/CoatingArticleLayout";

const UVShieldPage = () => (
  <CoatingArticleLayout
    title="UV Shield — UVA, UVB, and BV"
    intro="UV Shield coatings are designed to filter high-energy ultraviolet radiation (UVA and UVB) and support blue-violet (BV) control for broader environmental light protection."
    sectionTitle="What UV Shield contributes"
    bullets={[
      "Helps block UVA and UVB exposure that reaches the eye during daily outdoor activity.",
      "Adds blue-violet management support for bright daylight and reflective urban environments.",
      "Useful for patients who spend extended time commuting, exercising outdoors, or near water.",
      "Complements sun lens options and clear indoor/outdoor prescriptions.",
    ]}
    tips={[
      "Explain that UV control is important even on cloudy days.",
      "Pair with polarized or photochromic options when glare reduction is a primary complaint.",
    ]}
  />
);

export default UVShieldPage;
