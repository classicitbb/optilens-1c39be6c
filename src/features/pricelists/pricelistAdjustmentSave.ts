import type { ChildSection, PricelistVersion } from "@/hooks/usePricelistVersions";

const numeric = (value: number | string | null | undefined) => {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

export const pricelistAdjustmentSignature = ({
  version,
  childSections,
}: {
  version: Pick<PricelistVersion, "markup_percent" | "discount_percent" | "master_markup_percent" | "master_discount_percent">;
  childSections: Pick<ChildSection, "section_type" | "child_markup_percent" | "child_discount_percent">[];
}) => JSON.stringify({
  markup: numeric(version.markup_percent),
  discount: numeric(version.discount_percent),
  masterMarkup: numeric(version.master_markup_percent),
  masterDiscount: numeric(version.master_discount_percent),
  children: [...childSections]
    .sort((left, right) => left.section_type.localeCompare(right.section_type))
    .map((section) => [
      section.section_type,
      numeric(section.child_markup_percent),
      numeric(section.child_discount_percent),
    ]),
});
