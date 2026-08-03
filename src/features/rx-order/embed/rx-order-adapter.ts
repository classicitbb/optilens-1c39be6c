// Adapter between the verbatim prototype engine (rx-order-engine.js) and the
// live CVWeb backend. Two responsibilities:
//   1. buildEngineData — reshape live lenses/addons/accounts/clash rules into
//      the engine's own data model (MATERIALS/DESIGNS/COLOURS/MATRIX/COMBOS/
//      TREAT/CLASH/BRANCHES) so the prototype UI runs unmodified on real data.
//   2. persistPayload — write the engine's order payload (cv.rxorder/1) into
//      quotes / quote_lines / rx_details / quote_frame_details so the rest of
//      the pipeline (pricing, print, cart→outbox→InnovaAPI) sees a normal quote.
import { supabase } from "@/integrations/supabase/client";
import { Lens } from "@/hooks/useLenses";
import { Addon } from "@/hooks/useAddons";
import { CustomerAccountOption } from "@/hooks/useCustomerAccounts";
import { computeLineProfit } from "@/hooks/useQuotes";

// ── Engine data shapes (mirror the prototype's constants) ──
export interface EngineBranch { id: string; code: string; name: string; info: string; cur: string; prices: boolean }
export interface EngineItem { id: string; n: string; up?: number; base?: number; v?: string; prog?: boolean; needsAdd?: boolean }
export interface EngineTreat { id: string; c: string; n: string; d: string; p: number; grp?: string; pop?: boolean; rev?: boolean }
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

  const treatments: EngineTreat[] = opts.addons.map((a, i) => {
    const g = CATEGORY_GROUPS[a.category] ?? { c: "Specialty" };
    return {
      id: a.id,
      c: g.c,
      n: a.name,
      d: a.description || "",
      p: Math.round(opts.addonPriceFor(a.id, a.price) * 100) / 100,
      grp: g.grp,
      pop: i < 6 && !!g.grp, // first few grouped items surface as "popular"
    };
  });

  const data: EngineData = {
    branches: opts.accounts.map((a) => ({
      id: String(a.id),
      code: initials(a.name),
      name: a.name,
      info: a.account_number ? `Account #${a.account_number}` : "ERP account",
      cur: "USD",
      prices: true,
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

// ── Persistence: cv.rxorder/1 payload → quote rows ──
// The payload is also stored whole on the quote's internal notes so nothing
// the prototype captures (shape radii, tint config, Chemistrie clips…) is lost
// even where the relational schema has no column for it yet.
export async function persistPayload(
  quoteId: string,
  payload: any,
  ctx: { lensIndex: Map<string, LensRef>; addons: Addon[]; lensPriceBBD: (m: string, d: string, c: string) => number | null },
): Promise<{ totalBBD: number }> {
  const rate = payload?.quote?.rate || 1;
  const toBBD = (amt: number) => Math.round((amt / rate) * 100) / 100;

  const lensKey = `${payload.lens.material}|${payload.lens.design}|${payload.lens.colour}`;
  const lens = ctx.lensIndex.get(lensKey) ?? null;

  // The embedded form selects a live finish-type, while Innovations needs its
  // 13-digit colour alias. Resolve only an exact normalized colour match; a
  // primary alias is not a safe substitute because it can describe a different
  // tint/finish. Approval below then keeps unmatched colours out of production.
  const normaliseColour = (value: string) => value
    .toLowerCase()
    .replace(/transitions?/g, "photochromic")
    .replace(/photo(?!chromic)/g, "photochromic")
    .replace(/colou?r/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  let innovationsAlias: string | null = null;
  if (lens?.colourName) {
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

  // Replace all lines for this quote (the engine is the source of truth).
  const { error: delErr } = await (supabase.from("quote_lines") as any).delete().eq("quote_id", quoteId);
  if (delErr) throw delErr;

  const lines: any[] = [];
  const quoteLines: any[] = Array.isArray(payload?.quote?.lines) ? payload.quote.lines : [];
  const lensAmount = quoteLines.length
    ? toBBD(quoteLines[0].amount)
    : ctx.lensPriceBBD(payload.lens.material, payload.lens.design, payload.lens.colour) ?? lens?.listPrice ?? 0;
  const assistNote = payload.assistance?.length ? `Assistance requested: ${payload.assistance.join(", ")}` : null;

  lines.push({
    quote_id: quoteId,
    line_type: "Lens",
    product_id: lens?.lensId ?? null,
    innovations_alias: innovationsAlias,
    sku: "",
    item_name: lens?.name ?? `${payload.lens.material} ${payload.lens.design} ${payload.lens.colour}`,
    qty: 1,
    unit_cost_landed_bbd: lens?.basePrice ?? 0,
    unit_base_price_bbd: lensAmount,
    unit_sell_price_bbd: lensAmount,
    threshold_percent: 48,
    ...computeLineProfit(lensAmount, lens?.basePrice ?? 0, 1, "RX"),
    sort_order: 0,
    needs_assistance: !!assistNote,
    assistance_note: assistNote,
  });

  (payload.treatments ?? []).forEach((tid: string, i: number) => {
    const addon = ctx.addons.find((a) => a.id === tid);
    if (!addon) return;
    const line = quoteLines.find((l: any) => l.label === addon.name);
    const amt = line ? toBBD(line.amount) : addon.price;
    lines.push({
      quote_id: quoteId,
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
      sort_order: i + 1,
    });
  });

  const { data: inserted, error: insErr } = await (supabase.from("quote_lines") as any)
    .insert(lines)
    .select("id, line_type");
  if (insErr) throw insErr;
  const lensLineId = (inserted ?? []).find((l: any) => l.line_type === "Lens")?.id;

  // Prescription — both eyes on the single lens line, prototype field names →
  // rx_details columns.
  if (lensLineId && payload.rx) {
    const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
    const eye = (e: "od" | "os") => {
      const r = payload.rx[e] ?? {};
      return {
        [`${e}_sph`]: num(r.sph), [`${e}_cyl`]: num(r.cyl), [`${e}_axis`]: num(r.axis), [`${e}_add`]: num(r.add),
        [`${e}_prism_value`]: num(r.prism), [`${e}_prism_dir`]: r.base ?? null,
        [`${e}_fpd`]: num(r.pd), [`${e}_npd`]: num(r.npd),
      };
    };
    const ht = num(payload.rx.od?.ht ?? payload.rx.os?.ht);
    const { error: rxErr } = await (supabase.from("rx_details") as any).insert({
      quote_line_id: lensLineId,
      ...eye("od"), ...eye("os"),
      fitting_height: ht != null ? String(ht) : null,
      rx_notes: payload.delivery?.notes || null,
    });
    if (rxErr) throw rxErr;
  }

  // Frame + shape (upsert-by-quote_id).
  const f = payload.frame ?? {};
  const frameRow = {
    quote_id: quoteId,
    job_scope: payload.job?.scope === "uncut" ? "surface_only" : "full_glaze",
    brand: f.name || null,
    model_colour: f.mount || null,
    a_mm: f.a ?? null, b_mm: f.b ?? null, ed_mm: f.ed ?? null, dbl_mm: f.dbl ?? null,
    is_uncut: payload.job?.scope === "uncut",
    shape_source_file: payload.shape?.file ?? payload.shape?.standardId ?? null,
    shape_traced_ed: payload.shape?.computed?.ed ?? null,
    shape_traced_axis: payload.shape?.computed?.edAxis ?? null,
    standard_shape_id: payload.shape?.standardId ?? null,
  };
  const { data: existingFrame } = await (supabase.from("quote_frame_details") as any)
    .select("id").eq("quote_id", quoteId).maybeSingle();
  const frameOp = existingFrame
    ? (supabase.from("quote_frame_details") as any).update(frameRow).eq("id", existingFrame.id)
    : (supabase.from("quote_frame_details") as any).insert(frameRow);
  const { error: frameErr } = await frameOp;
  if (frameErr) throw frameErr;

  // Quote header + full payload snapshot (nothing captured is lost).
  const totalBBD = payload?.quote?.total != null ? toBBD(payload.quote.total) : lines.reduce((s, l) => s + l.unit_sell_price_bbd, 0);
  const patient = [payload.patient?.first, payload.patient?.last].filter(Boolean).join(" ");
  const { error: qErr } = await (supabase.from("quotes") as any).update({
    account_id: payload.account?.id ? Number(payload.account.id) : null,
    customer_name: payload.account?.name ?? patient ?? "Rx order",
    contact_name: patient || null,
    notes_customer: payload.delivery?.notes || null,
    notes_internal: `[[RXORDER:${JSON.stringify(payload)}]]`,
    subtotal_sell: totalBBD,
    grand_total: totalBBD,
  }).eq("id", quoteId);
  if (qErr) throw qErr;

  return { totalBBD };
}

// Deterministic negative int from the quote id — synthetic cart product_id so
// distinct Rx orders never collide on the cart's unique index.
export const syntheticCartProductId = (quoteId: string) => {
  let h = 5381;
  for (let i = 0; i < quoteId.length; i++) h = ((h << 5) + h + quoteId.charCodeAt(i)) | 0;
  return -Math.abs(h || 1);
};
