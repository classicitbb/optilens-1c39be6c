// Adapter between the verbatim prototype engine (rx-order-engine.js) and the
// live CVWeb backend. Two responsibilities:
//   1. buildEngineData — reshape live lenses/addons/accounts/clash rules into
//      the engine's own data model (MATERIALS/DESIGNS/COLOURS/MATRIX/COMBOS/
//      TREAT/CLASH/BRANCHES) so the prototype UI runs unmodified on real data.
//   2. persistPayload — save the engine's order payload (cv.rxorder/1) through
//      the save_rx_order RPC into quotes / quote_lines / rx_details /
//      quote_frame_details so the rest of the pipeline (pricing, print,
//      cart→outbox→InnovaAPI) sees a normal quote.
import { supabase } from "@/integrations/supabase/client";
import { Lens } from "@/hooks/useLenses";
import { Addon } from "@/hooks/useAddons";
import { CustomerAccountOption } from "@/hooks/useCustomerAccounts";
import { computeLineProfit } from "@/hooks/useQuotes";

// ── Engine data shapes (mirror the prototype's constants) ──
export interface EngineBranch { id: string; code: string; name: string; info: string; cur: string; prices: boolean; country: string | null }
export interface EngineItem { id: string; n: string; up?: number; base?: number; v?: string; prog?: boolean; needsAdd?: boolean }
export interface EngineTreat { id: string; c: string; n: string; d: string; p: number; grp?: string; pop?: boolean; rev?: boolean; unpriced?: boolean }
export interface EngineData {
  branches: EngineBranch[];
  materials: EngineItem[];
  designs: EngineItem[];
  colours: EngineItem[];
  matrix: Record<string, { d: string[]; c: string[] }>;
  combos: { m: string; d: string; c: string }[];
  treatments: EngineTreat[];
  clashes: [string, string, string][];
}

export interface LensRef {
  lensId: string;
  name: string;
  listPrice: number;
  basePrice: number;
  colourName: string;
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "AC";

// addons.category (current 6 values, pre-retag) → prototype treatment groups
const CATEGORY_GROUPS: Record<string, { c: string; grp?: string }> = {
  ar_coating: { c: "Anti-reflective", grp: "ar" },
  coating: { c: "Hard coats", grp: "hc" },
  mirror: { c: "Mirror finishes", grp: "mr" },
  tint: { c: "Tints", grp: "tn" },
  tints: { c: "Tints", grp: "tn" },
  prism: { c: "Specialty" },
  high_power: { c: "Specialty" },
  other: { c: "Specialty" },
};

export function buildEngineData(opts: {
  lenses: Lens[];
  addons: Addon[];
  clashRules: { addon_id_a: string; addon_id_b: string; reason: string }[];
  accounts: CustomerAccountOption[];
  addonPriceFor: (id: string, fallback: number) => number;
  currency?: string;
  pricesVisible?: boolean;
}): { data: EngineData; lensIndex: Map<string, LensRef> } {
  const materials = new Map<string, EngineItem>();
  const designs = new Map<string, EngineItem>();
  const colours = new Map<string, EngineItem>();
  const matrix: Record<string, { d: Set<string>; c: Set<string> }> = {};
  const combos = new Set<string>();
  const lensIndex = new Map<string, LensRef>();

  for (const l of opts.lenses) {
    const m = l.material_id;
    const dKey = `${l.mftype_id}|${l.lenstype_id}`;
    const cKey = l.finishtype_id ?? "clear";
    if (!m || !l.mftype_id || !l.lenstype_id) continue;
    if (!materials.has(m)) materials.set(m, { id: m, n: l.material?.name ?? "Material", up: 0 });
    if (!designs.has(dKey)) {
      const mf = l.mftype?.name ?? "";
      const lt = l.lenstype?.name ?? "";
      designs.set(dKey, {
        id: dKey,
        n: [mf, lt].filter(Boolean).join(" · ") || "Design",
        v: /single/i.test(mf) ? "sv" : "mf",
        base: 0,
        prog: /prog/i.test(`${mf} ${lt}`),
      });
    }
    if (!colours.has(cKey)) colours.set(cKey, { id: cKey, n: l.finishtype?.name ?? "Clear", up: 0 });
    (matrix[m] ??= { d: new Set(), c: new Set() });
    matrix[m].d.add(dKey);
    matrix[m].c.add(cKey);
    combos.add(`${m}|${dKey}|${cKey}`);
    // cheapest live lens wins the triple (same rule the guided picker used)
    const key = `${m}|${dKey}|${cKey}`;
    const existing = lensIndex.get(key);
    if (!existing || l.sell_price < existing.listPrice) {
      lensIndex.set(key, {
        lensId: l.id,
        name: l.name,
        listPrice: l.sell_price,
        basePrice: l.base_price,
        colourName: l.finishtype?.name ?? "",
      });
    }
  }

  const treatments: EngineTreat[] = opts.addons.map((a) => {
    const g = CATEGORY_GROUPS[a.category] ?? { c: "Specialty" };
    const price = Math.round(opts.addonPriceFor(a.id, a.price) * 100) / 100;
    return {
      id: a.id,
      c: g.c,
      n: a.name,
      d: a.description || "",
      p: price,
      // An add-on that resolves to nothing is not free — it is an add-on this
      // account has no price for, either because the pricelist carries no row
      // for it or because the catalogue price is unset. Charging zero for real
      // lab work is the silent failure; the form raises it instead.
      unpriced: !(price > 0),
      grp: g.grp,
      // Popular choices are intentional (addons.is_popular, set in the add-on editor),
      // not whichever records happen to be first in the RPC result.
      pop: (a as { is_popular?: boolean }).is_popular ?? false,
    };
  });

  const data: EngineData = {
    branches: opts.accounts.map((a) => ({
      id: String(a.id),
      code: initials(a.name),
      name: a.name,
      info: a.account_number ? `Account #${a.account_number}` : "ERP account",
      cur: opts.currency ?? "BBD",
      prices: opts.pricesVisible ?? true,
      country: a.country_code ?? null,
    })),
    materials: [...materials.values()].sort((a, b) => a.n.localeCompare(b.n)),
    designs: [...designs.values()].sort((a, b) => a.n.localeCompare(b.n)),
    colours: [...colours.values()].sort((a, b) => (a.id === "clear" ? -1 : b.id === "clear" ? 1 : a.n.localeCompare(b.n))),
    matrix: Object.fromEntries(Object.entries(matrix).map(([k, v]) => [k, { d: [...v.d], c: [...v.c] }])),
    combos: [...combos].map((s) => { const [m, d1, d2, c] = s.split("|"); return { m, d: `${d1}|${d2}`, c }; }),
    treatments,
    clashes: opts.clashRules.map((r) => [r.addon_id_a, r.addon_id_b, r.reason]),
  };
  return { data, lensIndex };
}

// ── Persistence: cv.rxorder/1 payload → save_rx_order RPC ──
// The whole order is saved in ONE database call (save_rx_order, migration
// 20261001130600): the quote is created on first save, lines/Rx/frame are
// replaced atomically, and the total is summed from the lines server-side.
// The payload is also stored whole on quotes.rx_payload so nothing the
// prototype captures (shape radii, tint config, Chemistrie clips…) is lost
// even where the relational schema has no column for it yet.
//
// Every priced line of the engine's quote becomes a quote line, so the saved
// total is exactly the sum of its lines: lens lines, one AddOn line per
// treatment (the lab gets one item per coating, not one per eye), surcharge
// lines (line_type 'Fee', citing rx_surcharge_rules in group_key), and any
// remaining priced extra (e.g. a colour upcharge) as a SKU-less AddOn.
type SurchargeCode =
  | "prism" | "oversize_blank" | "high_power" | "glazing_standard" | "glazing_grooved"
  | "glazing_rimless" | "remote_edge" | "priority_service";

const surchargeCodeFor = (label: string, mount: string): SurchargeCode | null => {
  if (/^Prism$/i.test(label)) return "prism";
  if (/Oversize blank$/i.test(label)) return "oversize_blank";
  if (/^High-power/i.test(label)) return "high_power";
  if (/^Remote edge/i.test(label)) return "remote_edge";
  if (/^Glazing/i.test(label)) {
    return mount === "rimless" ? "glazing_rimless" : mount === "grooved" ? "glazing_grooved" : "glazing_standard";
  }
  if (/^Priority service/i.test(label)) return "priority_service";
  return null;
};

export interface PersistedRxOrder {
  totalBBD: number;
  quoteId: string;
  quoteNumber: string | null;
  rxOrderNumber: number | null;
  created: boolean;
}

export async function persistPayload(
  /** Existing quote to update, or null to create it on this first save. */
  quoteId: string | null,
  payload: any,
  ctx: {
    lensIndex: Map<string, LensRef>;
    addons: Addon[];
    lensPriceBBD: (m: string, d: string, c: string) => number | null;
    /**
     * Innovations-sourced catalogue: the selection IS an alias, so the code to
     * order is known outright. When supplied this replaces the lens_alias_map
     * lookup entirely — see docs/rx-order-innovations-catalogue.md §2.1.
     */
    resolveAlias?: (m: string, d: string, c: string) => { alias: string; label: string } | null;
    /** Staff test-bench saves: tagged is_test, hidden from lists and reports. */
    isTest?: boolean;
  },
): Promise<PersistedRxOrder> {
  const rate = payload?.quote?.rate || 1;
  const toBBD = (amt: number) => Math.round((amt / rate) * 100) / 100;

  // Legacy path: the CV-sourced form selected a finish type, so the 13-digit
  // colour alias had to be recovered through the confirmed mapping. Only an
  // exact normalized colour match is safe — a primary alias can describe a
  // different tint. Dead once every surface is Innovations-sourced.
  const normaliseColour = (value: string) => value
    .toLowerCase()
    .replace(/transitions?/g, "photochromic")
    .replace(/photo(?!chromic)/g, "photochromic")
    .replace(/colou?r/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

  // One lens triple → everything needed to write its quote line. A split-eye
  // order resolves this twice, once per side; an unsplit order once, exactly
  // as before.
  const resolveLens = async (triple: { material: string; design: string; colour: string }) => {
    const lens = ctx.lensIndex.get(`${triple.material}|${triple.design}|${triple.colour}`) ?? null;
    const resolved = ctx.resolveAlias?.(triple.material, triple.design, triple.colour) ?? null;
    let innovationsAlias: string | null = resolved?.alias ?? null;
    if (!innovationsAlias && lens?.colourName) {
      const { data: mappedAliases, error: aliasError } = await (supabase.from("lens_alias_map") as any)
        .select("innovations_alias, innovations_lens_aliases(color_description, is_active)")
        .eq("lens_id", lens.lensId)
        .not("confirmed_at", "is", null);
      if (aliasError) throw aliasError;
      const wantedColour = normaliseColour(lens.colourName);
      innovationsAlias = (mappedAliases ?? []).find((row: any) =>
        row.innovations_lens_aliases?.is_active !== false
        && normaliseColour(row.innovations_lens_aliases?.color_description ?? "") === wantedColour,
      )?.innovations_alias ?? null;
    }
    return { lens, resolved, innovationsAlias, triple };
  };

  // `lens` is the right/shared eye; `lensOs` exists only on a split order.
  // A non-split pair still contains two physical lenses. Persist those as OD
  // and OS lines so the invoice and lab payload agree with the saved-draft
  // price breakdown.
  const splitOrder = !!payload.split && !!payload.lensOs;
  const pairOrder = payload?.job?.eyes === "pair";
  const sides: { eye: "od" | "os" | null; triple: any }[] = splitOrder
    ? [{ eye: "od", triple: payload.lens }, { eye: "os", triple: payload.lensOs }]
    : pairOrder
      ? [{ eye: "od", triple: payload.lens }, { eye: "os", triple: payload.lens }]
      : [{ eye: payload?.job?.eyes === "os" ? "os" : "od", triple: payload.lens }];
  const resolvedSides = await Promise.all(sides.map(async (s) => ({ ...s, ...(await resolveLens(s.triple)) })));

  const lines: any[] = [];
  const quoteLines: any[] = Array.isArray(payload?.quote?.lines) ? payload.quote.lines : [];
  const consumed = new Set<any>();

  // No matrix cell and no CV lens row = not offered on this account. While
  // unpriced orders are allowed (blockUnpricedOrders off) such an order can be
  // submitted; otherwise only "save as draft" reaches here. Either way it is
  // priced by hand — flagged as such rather than presented as a real price.
  //
  // The amount columns are NOT NULL DEFAULT 0, so a genuine "no price" cannot
  // be stored as null without a migration. needs_assistance + assistance_note
  // are what distinguish it from a line that is actually free.
  const priced = resolvedSides.map((side) => {
    const matrixPrice = ctx.lensPriceBBD(side.triple.material, side.triple.design, side.triple.colour);
    const unpriced = matrixPrice == null && !side.lens;
    // The engine tags each lens quote line with its eye, so a split order
    // pairs line to lens without guessing from label text or line order.
    const quoted = quoteLines.find((l: any) => l.lens && l.eye === side.eye) ?? quoteLines.find((l: any) => l.lens);
    if (quoted) consumed.add(quoted);
    const amount = unpriced
      ? 0
      : quoted
        ? toBBD(quoted.amount)
        : matrixPrice ?? side.lens?.listPrice ?? 0;
    return { ...side, unpriced, amount };
  });

  const anyUnpriced = priced.some((s) => s.unpriced);
  const assistReasons = [
    ...(payload.assistance ?? []),
    ...(anyUnpriced && !(payload.assistance ?? []).some((a: string) => /not priced/i.test(a))
      ? ["Lens not priced on this account — quote requested"]
      : []),
  ];
  const assistNote = assistReasons.length ? `Assistance requested: ${assistReasons.join(", ")}` : null;

  priced.forEach((side, i) => {
    const eyeLabel = side.eye === "od" ? "OD · " : side.eye === "os" ? "OS · " : "";
    lines.push({
      line_type: "Lens",
      product_id: side.lens?.lensId ?? null,
      innovations_alias: side.innovationsAlias,
      sku: "",
      item_name: eyeLabel + (side.lens?.name ?? side.resolved?.label
        ?? `${side.triple.material} ${side.triple.design} ${side.triple.colour}`),
      qty: 1,
      unit_cost_landed_bbd: side.lens?.basePrice ?? 0,
      unit_base_price_bbd: side.amount,
      unit_sell_price_bbd: side.amount,
      threshold_percent: 48,
      ...computeLineProfit(side.amount, side.lens?.basePrice ?? 0, 1, "RX"),
      sort_order: i,
      needs_assistance: !!assistNote,
      assistance_note: assistNote,
    });
  });

  // A treatment the catalogue no longer knows about used to be skipped here in
  // silence — it stayed in payload.treatments (so the lab saw it) but produced
  // no quote line (so nobody charged for it). The form now blocks submit on
  // exactly this condition; refusing here as well means a payload that reaches
  // persistence by any other route still cannot write a half-recorded order.
  const unknownTreatments = (payload.treatments ?? []).filter(
    (tid: string) => !ctx.addons.some((a) => a.id === tid),
  );
  if (unknownTreatments.length) {
    throw new Error(
      `This order carries ${unknownTreatments.length} coating${unknownTreatments.length > 1 ? "s" : ""} `
      + "that are no longer available on this account. Remove them and submit again.",
    );
  }

  let sort = priced.length;
  (payload.treatments ?? []).forEach((tid: string) => {
    const addon = ctx.addons.find((a) => a.id === tid);
    if (!addon) return;
    // The engine charges a coating once per eye ("OD <name>" / "OS <name>");
    // the order carries ONE line per coating (so the lab gets one item), at
    // the sum of its eye lines. With prices hidden there are none, so the
    // catalogue price stands in.
    const mine = quoteLines.filter((l: any) => !consumed.has(l)
      && (l.label === addon.name || l.label === `OD ${addon.name}` || l.label === `OS ${addon.name}`));
    mine.forEach((l) => consumed.add(l));
    const amt = mine.length
      ? Math.round(mine.reduce((s: number, l: any) => s + toBBD(l.amount), 0) * 100) / 100
      : addon.price;
    lines.push({
      line_type: "AddOn",
      product_id: addon.id,
      sku: addon.sku ?? "",
      item_name: addon.name,
      qty: 1,
      unit_cost_landed_bbd: addon.cost,
      unit_base_price_bbd: amt,
      unit_sell_price_bbd: amt,
      threshold_percent: 48,
      ...computeLineProfit(amt, addon.cost, 1, "RX"),
      sort_order: sort++,
      needs_assistance: false,
      assistance_note: null,
    });
  });

  // Everything else the engine priced. Surcharges cite their rule; anything
  // unrecognised (a colour upcharge) is a SKU-less AddOn, which the lab file
  // skips, so the total still equals the sum of the lines.
  const mount = String(payload.frame?.mount ?? "");
  quoteLines.filter((l: any) => !consumed.has(l) && Number(l.amount) !== 0).forEach((l: any) => {
    const amt = toBBD(l.amount);
    const code = surchargeCodeFor(String(l.label ?? ""), mount);
    lines.push({
      line_type: code ? "Fee" : "AddOn",
      product_id: null,
      sku: "",
      item_name: [l.label, l.detail].filter(Boolean).join(" · "),
      qty: 1,
      unit_cost_landed_bbd: 0,
      unit_base_price_bbd: amt,
      unit_sell_price_bbd: amt,
      threshold_percent: 48,
      ...computeLineProfit(amt, 0, 1, "RX"),
      group_key: code ? `surcharge:${code}` : null,
      sort_order: sort++,
      needs_assistance: false,
      assistance_note: null,
    });
  });

  // Both eyes stay on ONE rx_details row, hung off the first lens line by the
  // RPC, even for a split order. The table is shaped od_*/os_* on a single row
  // and every reader downstream (print, the lab handoff, optilens-local's
  // buildOrder) expects exactly one row per job — splitting the prescription
  // across two rows would break them for no gain, since the split is about
  // which lens each eye gets, not about the prescription itself.
  let rxRow: Record<string, unknown> | null = null;
  if (payload.rx) {
    const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
    const eye = (e: "od" | "os") => {
      const r = payload.rx[e] ?? {};
      return {
        [`${e}_sph`]: num(r.sph), [`${e}_cyl`]: num(r.cyl), [`${e}_axis`]: num(r.axis), [`${e}_add`]: num(r.add),
        [`${e}_prism_value`]: num(r.prism), [`${e}_prism_dir`]: r.base ?? null,
        [`${e}_fpd`]: num(r.pd), [`${e}_npd`]: num(r.npd),
        // One height per eye: OC / segment / fitting height by lens type.
        [`${e}_height`]: num(r.ht) != null ? String(num(r.ht)) : null,
      };
    };
    const ht = num(payload.rx.od?.ht ?? payload.rx.os?.ht);
    rxRow = {
      ...eye("od"), ...eye("os"),
      fitting_height: ht != null ? String(ht) : null,
      rx_notes: payload.delivery?.notes || null,
    };
  }

  const f = payload.frame ?? {};
  const scope = payload.job?.scope;
  const frameRow = {
    job_scope: scope === "uncut" ? "surface_only" : scope === "remote" ? "remote_edge" : "full_glaze",
    brand: f.name || null,
    mount_type: f.mount || null,
    a_mm: f.a ?? null, b_mm: f.b ?? null, ed_mm: f.ed ?? null, dbl_mm: f.dbl ?? null,
    is_uncut: scope === "uncut",
    shape_source_file: payload.shape?.file ?? payload.shape?.standardId ?? null,
    shape_traced_ed: payload.shape?.computed?.ed ?? null,
    shape_traced_axis: payload.shape?.computed?.edAxis ?? null,
    standard_shape_id: payload.shape?.standardId ?? null,
    // Full trace geometry (radii/nativeBox/computed/mirroredFrom/confirmed) —
    // build_rx_submission_payload() surfaces this column as payload.shape so
    // optilens-local's buildOrder() receives real trace data.
    trace_geometry: payload.shape ?? null,
  };

  const patient = [payload.patient?.first, payload.patient?.last].filter(Boolean).join(" ");
  const { data, error } = await (supabase.rpc as any)("save_rx_order", {
    p_quote_id: quoteId,
    p_payload: {
      schema: payload.schema ?? "cv.rxorder/1",
      order: payload,
      header: {
        account_id: payload.account?.id ? Number(payload.account.id) : null,
        customer_name: payload.account?.name ?? patient ?? "Rx order",
        contact_name: patient || null,
        notes_customer: payload.delivery?.notes || null,
      },
      lines,
      rx: rxRow,
      frame: frameRow,
    },
    p_is_test: ctx.isTest === true,
  });
  if (error) throw error;
  if (!data?.quote_id) throw new Error("The order could not be saved.");
  return {
    totalBBD: Number(data.total ?? 0),
    quoteId: data.quote_id as string,
    quoteNumber: data.quote_number ?? null,
    rxOrderNumber: data.rx_order_number ?? null,
    created: !!data.created,
  };
}

/**
 * The saved order payload of a quote, ready to replay into the form.
 * New saves keep it in quotes.rx_payload; quotes older than that carry it as a
 * [[RXORDER:{...}]] blob in notes_internal (the migration backfilled most, this
 * covers anything it skipped). Null when the quote holds no restorable payload.
 */
export function savedRxPayload(row: { rx_payload?: unknown; notes_internal?: string | null } | null | undefined): any | null {
  const direct = row?.rx_payload;
  if (direct && typeof direct === "object" && (direct as any).schema === "cv.rxorder/1") return direct;
  const blob = row?.notes_internal?.match(/\[\[RXORDER:([\s\S]*)\]\]/)?.[1];
  if (!blob) return null;
  try {
    const parsed = JSON.parse(blob);
    return parsed?.schema === "cv.rxorder/1" ? parsed : null;
  } catch {
    return null;
  }
}

// Deterministic negative int from the quote id — synthetic cart product_id so
// distinct Rx orders never collide on the cart's unique index.
export const syntheticCartProductId = (quoteId: string) => {
  let h = 5381;
  for (let i = 0; i < quoteId.length; i++) h = ((h << 5) + h + quoteId.charCodeAt(i)) | 0;
  return -Math.abs(h || 1);
};
