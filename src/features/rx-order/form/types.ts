// Shapes shared by the React Rx form (Phase 1b).
import type { Combo, Triple } from "../domain/catalog";
import type { SurchargeRule } from "../domain/price";

/** Everything a person can type or pick. Numbers stay strings until derived. */
export interface RxEyeText {
  sph: string;
  cyl: string;
  axis: string;
  add: string;
  pd: string;
  npd: string;
  /** OC height (single vision) / segment height (bifocal) / fitting height (progressive). */
  ht: string;
  prism: string;
  base: string;
}

export interface PlusCylText {
  sph: string;
  cyl: string;
  axis: string;
}

export interface TintText {
  colour: string;
  density: string;
  gradTop: string;
  gradBottom: string;
  finish: string;
  match: boolean;
}

export interface RxFormValues {
  patient: { first: string; last: string };
  reference: string;
  /** The account the order is for (staff pick; portal users are locked). */
  accountId: number | null;
  job: {
    scope: "uncut" | "remote" | "glaze";
    eyes: "pair" | "od" | "os";
    vision: "sv" | "mf";
    purpose: "dist" | "read" | "inter";
  };
  frame: {
    name: string;
    mount: string;
    source: string;
    a: string;
    b: string;
    ed: string;
    dbl: string;
    /** The person typed their own ED, so stop auto-estimating it. */
    edTouched: boolean;
  };
  lens: {
    /** The job's lens — the right eye's when `split` is on. */
    od: Triple;
    /** The left eye's own lens; only read when `split` is on. */
    os: Triple;
    split: boolean;
    /** "auto" or a blank size in mm. */
    diameter: string;
    corridor: string;
    baseCurve: string;
  };
  rx: { od: RxEyeText; os: RxEyeText };
  plusCyl: { on: boolean; od: PlusCylText; os: PlusCylText };
  treatments: string[];
  tint: TintText;
  delivery: { service: string; method: string; methodTouched: boolean; notes: string };
  /** Warning ids the person has dismissed ("sign", "ht-od"). */
  dismissedWarnings: string[];
  /** Assistance flags raised by hand ("Lens not priced…" is added automatically). */
  assistance: string[];
}

export const emptyEye = (): RxEyeText => ({ sph: "", cyl: "", axis: "", add: "", pd: "", npd: "", ht: "", prism: "", base: "" });
export const emptyTriple = (): Triple => ({ m: "", d: "", c: "" });

export const DEFAULT_DELIVERY = "Weekly courier run";
export const EXPORT_DELIVERY = "Export — freight forwarder";

export const defaultValues = (accountId: number | null = null): RxFormValues => ({
  patient: { first: "", last: "" },
  reference: "",
  accountId,
  job: { scope: "uncut", eyes: "pair", vision: "sv", purpose: "dist" },
  frame: { name: "", mount: "", source: "Customer — shipping to lab", a: "", b: "", ed: "", dbl: "", edTouched: false },
  lens: { od: emptyTriple(), os: emptyTriple(), split: false, diameter: "auto", corridor: "13", baseCurve: "auto" },
  rx: { od: emptyEye(), os: emptyEye() },
  plusCyl: { on: false, od: { sph: "", cyl: "", axis: "" }, os: { sph: "", cyl: "", axis: "" } },
  treatments: [],
  tint: { colour: "Grey", density: "75", gradTop: "80", gradBottom: "10", finish: "Standard", match: false },
  delivery: { service: "std", method: DEFAULT_DELIVERY, methodTouched: false, notes: "" },
  dismissedWarnings: [],
  assistance: [],
});

// ── catalogue the form works from ────────────────────────────────────────────

export interface CatalogItem {
  id: string;
  n: string;
  v?: "sv" | "mf";
  prog?: boolean;
  needsAdd?: boolean;
  up?: number;
  base?: number;
}

export interface CatalogTreatment {
  id: string;
  /** Category label (shown as the line detail). */
  c: string;
  n: string;
  d: string;
  /** Price in BBD for the pair. */
  p: number;
  /** Mutual-exclusion group: AR, hard coat, tint, mirror… choosing one replaces another. */
  grp?: string;
  pop?: boolean;
  /** No price on this account — cannot be added at no charge. */
  unpriced?: boolean;
}

export interface RxCatalog {
  materials: CatalogItem[];
  designs: CatalogItem[];
  colours: CatalogItem[];
  combos: Combo[];
  treatments: CatalogTreatment[];
  /** [treatment id, treatment id, reason] pairs that cannot share a lens. */
  clashes: [string, string, string][];
  /**
   * What the account's pricelist says for a combination: a price, `null` for
   * "not offered on this account", `undefined` when there is no price source.
   */
  lensPrice: (m: string, d: string, c: string) => number | null | undefined;
  hasPriceSource: boolean;
  /** An unpriced lens may be saved as a draft but not submitted. */
  blockUnpricedOrders: boolean;
  surchargeRules: readonly SurchargeRule[];
  /** ISO country of the ordering account, for the export delivery default. */
  accountCountry: string | null;
  /** Prices are hidden on this account: the quote shows masked values. */
  pricesVisible: boolean;
}
