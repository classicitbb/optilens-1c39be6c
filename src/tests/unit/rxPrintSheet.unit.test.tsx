import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import { derive } from "@/features/rx-order/form/model";
import { PrintSheet } from "@/features/rx-order/form/PrintSheet";
import { defaultValues, type RxCatalog, type RxFormValues } from "@/features/rx-order/form/types";

const catalog = (over: Partial<RxCatalog> = {}): RxCatalog => ({
  materials: [{ id: "plastic", n: "Plastic 1.50", up: 0 }],
  designs: [{ id: "sv", n: "Single Vision", v: "sv", base: 0 }],
  colours: [{ id: "clear", n: "Clear", up: 0 }],
  combos: [{ m: "plastic", d: "sv", c: "clear" }],
  treatments: [{ id: "ar1", c: "Anti-reflective", n: "Super AR", d: "", p: 48, grp: "ar" }],
  clashes: [],
  lensPrice: () => 100,
  hasPriceSource: true,
  blockUnpricedOrders: false,
  surchargeRules: DEFAULT_SURCHARGE_RULES,
  accountCountry: "BB",
  pricesVisible: true,
  ...over,
});

const valid = (): RxFormValues => {
  const v = defaultValues(776);
  v.patient = { first: "Ann", last: "Lee" };
  v.reference = "PO-7";
  v.frame = { ...v.frame, name: "Ray", mount: "plastic", a: "52", b: "38", dbl: "18" };
  v.lens.od = { m: "plastic", d: "sv", c: "clear" };
  v.lens.diameter = "70";
  v.treatments = ["ar1"];
  v.delivery.notes = "Keep the <tint> light";
  for (const e of ["od", "os"] as const) v.rx[e] = { ...v.rx[e], sph: "-2.00", cyl: "-0.75", axis: "90", pd: "32.0" };
  return v;
};

const render = (v: RxFormValues, c: RxCatalog) =>
  renderToStaticMarkup(<PrintSheet values={v} derived={derive(v, c)} catalog={c} orderNo={1042} accountName="Acme Optical" />);

describe("PrintSheet", () => {
  it("prints the order, the Rx for both eyes and the quoted total", () => {
    const html = render(valid(), catalog());
    expect(html).toContain("No. 1042");
    expect(html).toContain("Ref PO-7");
    expect(html).toContain("Acme Optical");
    expect(html).toContain("Ann Lee");
    expect(html).toContain("−2.00");
    expect(html).toContain("<th scope=\"row\">OD</th>");
    expect(html).toContain("<th scope=\"row\">OS</th>");
    expect(html).toContain("Super AR");
    expect(html).toContain("BBD $");
    expect(html).not.toContain("prototype");
  });

  it("escapes lab notes rather than injecting them", () => {
    expect(render(valid(), catalog())).toContain("Keep the &lt;tint&gt; light");
  });

  it("shows no price on an account without pricing", () => {
    const html = render(valid(), catalog({ pricesVisible: false }));
    expect(html).toContain("Pricing not enabled on this account");
    expect(html).not.toContain("BBD $");
  });

  it("omits the shape section when there is no outline", () => {
    expect(render(valid(), catalog())).not.toContain("Frame shape");
  });
});
