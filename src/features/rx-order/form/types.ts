// Shapes shared by the React Rx form (Phase 1b).
import type { Combo, Triple } from "../domain/catalog";
import type { SurchargeRule } from "../domain/price";
import type { ChemClip } from "../domain/chemistrie";
import type { ShapeData, ShapeSource } from "../domain/shape";
import type { RxFlag } from "../domain/schema";
import type { AdviceRule } from "../domain/advice";

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

/** The frame outline in play: a standard shape, or the outline read from a trace file. */
export interface ShapeText {
  source: ShapeSource | null;
  standardId: string | null;
  /** The trace file's name, kept even when no outline could be read from it. */
  fileName: string | null;
  fileSize: number | null;
  /** The outline (null while none is chosen, or when the file held none). */
  data: ShapeData | null;
  /** The person has confirmed this is the right shape for the frame in hand. */
  confirmed: boolean;
}

export const emptyShape = (): ShapeText => ({ source: null, standardId: null, fileName: null, fileSize: null, data: null, confirmed: false });

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
  shape: ShapeText;
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
  /** Chemistrie clip-on layers (lab instructions only — never priced). */
  chemClips: ChemClip[];
  tint: TintText;
  delivery: { service: string; method: string; methodTouched: boolean; notes: string };
  /** Warning ids the person has dismissed ("sign", "ht-od"). */
  dismissedWarnings: string[];
  /** Assistance flags raised by hand ("Lens not priced…" is added automatically). */
  assistance: string[];
  /** Fields a capture could not read with confidence; cleared as they are reviewed. */
  flags: RxFlag[];
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
  shape: emptyShape(),
  lens: { od: emptyTriple(), os: emptyTriple(), split: false, diameter: "auto", corridor: "13", baseCurve: "auto" },
  rx: { od: emptyEye(), os: emptyEye() },
  plusCyl: { on: false, od: { sph: "", cyl: "", axis: "" }, os: { sph: "", cyl: "", axis: "" } },
  treatments: [],
  chemClips: [],
  tint: { colour: "Grey", density: "75", gradTop: "80", gradBottom: "10", finish: "Standard", match: false },
  delivery: { service: "std", method: DEFAULT_DELIVERY, methodTouched: false, notes: "" },
  dismissedWarnings: [],
  assistance: [],
  flags: [],
});

// ── catalogue the form works from ────────────────────────────────────────────

export interface CatalogItem {
  id: string;
  n: string;
  v?: string;
  prog?: boolean;
  needsAdd?: boolean;
  up?: number;
  base?: number;
}

/** A design always belongs to one vision type. */
export interface CatalogDesignItem extends CatalogItem {
  v: "sv" | "mf";
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
  designs: CatalogDesignItem[];
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
  /** The catalogue selection an Innovations lens alias stands for (office-captured orders arrive with one). */
  /** Thresholds behind the lens tips; the seeded defaults when absent. */
  adviceRules?: readonly AdviceRule[];
  tripleForAlias?: (alias: string) => Triple | null;
  hasPriceSource: boolean;
  /** An unpriced lens may be saved as a draft but not submitted. */
  blockUnpricedOrders: boolean;
  surchargeRules: readonly SurchargeRule[];
  /** ISO country of the ordering account, for the export delivery default. */
  accountCountry: string | null;
  /** Prices are hidden on this account: the quote shows masked values. */
  pricesVisible: boolean;
}
