// One order format for every outbound order, whichever transport carries it.
//
// Both order types in this system — prescription orders (rx_order_submissions,
// built by the Rx order form) and stock/SKU orders (stock_order_submissions,
// built by the Stock Order Builder) — normalise into the same CanonicalOrder
// and render through the same Hashref v2.5 writer here.  Gatekeeper's
// /api/v2/orders/push_order_to_lab takes the rendered text as `rx_content`;
// the optilens-local office worker receives the identical text on its claim
// response so a file drop and a Gatekeeper push carry byte-identical orders.
//
// Format reference: Ocuco "3rd Party Integrations: Order Sending", Hashref
// v2.5 (docs/gatekeeper-order-sending.md).  Rules that shape this file:
//   - Field identifier and value are separated by a colon, no extra spaces,
//     so a colon may never appear inside a value.
//   - Field identifiers and values are case-sensitive.
//   - An order is bracketed by start_order/end_order; anything outside those
//     directives is ignored.  file_version is therefore the first field
//     *inside* start_order, followed by agent_name then agent_version.
//   - Order items are bracketed by item_start/item_end and may repeat.
//   - rx_eye 5 means "stock order only" — that is what makes a SKU-only order
//     expressible in the same format as a prescription order.

export type OrderKind = "rx" | "stock";

/** Where the order is being routed. Both values come from the active
 *  Gatekeeper sending contract (webrx_lab_id_receiver /
 *  webrx_retailer_name_receiver), or from the office lab config when the
 *  order is going out through optilens-local instead. */
export interface HashrefRouting {
  labNum: string;
  custNum: string;
  agentName?: string;
  agentVersion?: string;
}

export interface CanonicalOrderItem {
  sku: string;
  /** Free-form on the way in; normalised to the v2.5 vocabulary on the way out. */
  source: string;
  description: string;
  quantity: number;
  comment?: string;
  /** 'Y' for anything that is part of the Rx (tints, coatings, lenses), 'N' otherwise. */
  partRx?: string;
  side?: string;
  /** Tint colour / percentage — item_value, conditional use only for tints. */
  value?: string;
  unitPrice?: number | null;
}

export interface CanonicalOrderFrame {
  isUncut: boolean;
  brand?: string | null;
  model?: string | null;
  aMm?: number | null;
  bMm?: number | null;
  edMm?: number | null;
  dblMm?: number | null;
  bridgeMm?: number | null;
}

export interface CanonicalOrderLens {
  alias: string;
  materialCode: string;
  materialDescription?: string | null;
  styleCode: string;
  styleDescription?: string | null;
  colorCode: string;
  colorDescription?: string | null;
}

export interface CanonicalOrder {
  kind: OrderKind;
  /** Numeric order identifier the receiving lab sees (order_id / cust_seq_num). */
  orderId: string;
  /** Our own submission uuid, carried through as x_gk_guid for reconciliation. */
  submissionId: string;
  patientName: string;
  poNumber?: string;
  instructions?: string;
  /** "YYYY-MM-DD-HH-MM-SS". */
  dateOrdered: string;
  frame?: CanonicalOrderFrame;
  lens?: CanonicalOrderLens;
  /** Left-eye lens when it differs from `lens` (a split-lens order). */
  lensOs?: CanonicalOrderLens;
  rx?: Record<string, unknown>;
  items: CanonicalOrderItem[];
}

// ── Field helpers ──────────────────────────────────────────────────────────

/** Colons separate identifier from value, and newlines separate fields, so
 *  neither may survive inside a value. */
export function text(value: unknown, max = 255): string {
  return String(value ?? "").replace(/[\r\n:]/g, " ").trim().slice(0, max);
}

export function numberText(value: unknown, field: string, fallback?: number): string {
  if (value === null || value === undefined || value === "") {
    if (fallback !== undefined) return fallback.toFixed(2);
    throw new Error(`${field} is required for outbound delivery.`);
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error(`${field} must be numeric for outbound delivery.`);
  return numeric.toFixed(2);
}

export function integerText(value: unknown, field: string, fallback = 0): string {
  if (value === null || value === undefined || value === "") return String(fallback);
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) throw new Error(`${field} must be a whole number for outbound delivery.`);
  return String(numeric);
}

function line(key: string, value: unknown): string {
  return `${key}:${text(value)}`;
}

/** Hashref timestamps are lab-local, and this lab is in Barbados. */
export function hashrefDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Barbados",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}-${get("hour")}-${get("minute")}-${get("second")}`;
}

// ── item_source ────────────────────────────────────────────────────────────
// The spec's exact strings, in the spec's exact casing (values are
// case-sensitive).  Note SFLENS, not SLENS: optilens-local's own
// .stockhashref format uses SLENS for a semi-finished lens, so that spelling
// is accepted on the way in and rewritten here rather than changing the
// office-side format.
const ITEM_SOURCES = [
  "MISC", "FRAME", "FLENS", "SFLENS", "NONSTK", "REM", "PACK",
  "TINT", "COAT", "EDGING", "PACKAGE", "OVERSIZE", "RXPRISM", "RXAdd",
] as const;

const ITEM_SOURCE_ALIASES: Record<string, string> = {
  SLENS: "SFLENS",
  SEMIFINISHED: "SFLENS",
  SEMI_FINISHED: "SFLENS",
  FINISHED: "FLENS",
  RXADD: "RXAdd",
  SUPPLY: "MISC",
  ADDON: "MISC",
};

export function normalizeItemSource(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!value) return "MISC";
  const exact = ITEM_SOURCES.find((source) => source === value);
  if (exact) return exact;
  const upper = value.toUpperCase().replace(/[\s-]+/g, "_");
  if (ITEM_SOURCE_ALIASES[upper]) return ITEM_SOURCE_ALIASES[upper];
  const caseInsensitive = ITEM_SOURCES.find((source) => source.toUpperCase() === upper);
  return caseInsensitive ?? "MISC";
}

/** Infer an item_source for an Rx add-on line, which only carries a name and
 *  a line_type. Anything unrecognised falls through to MISC, which is the
 *  spec's catch-all rather than a guess. */
export function inferItemSource(name: unknown, lineType?: unknown): string {
  const value = String(name ?? "").toLowerCase();
  if (/\btint|colou?r(ed)?\b/.test(value)) return "TINT";
  if (/coat|anti[- ]?reflect|\bar\b|hard ?coat|\buv\b|mirror/.test(value)) return "COAT";
  if (/edg(e|ing)|glaz/.test(value)) return "EDGING";
  if (/prism/.test(value)) return "RXPRISM";
  if (/package|bundle/.test(value)) return "PACKAGE";
  if (/oversize/.test(value)) return "OVERSIZE";
  if (String(lineType ?? "").toLowerCase() === "addon") return "MISC";
  return "MISC";
}

// item_side describes an orientation on the physical job. A stock lens's
// left/right is already encoded in its Innova SKU (left_opc vs right_opc),
// so a side-specific SKU still ships as NONE rather than inventing a value
// outside the spec's list.
const ITEM_SIDES = new Set([
  "NONE", "COMPLETE", "FRONT", "FRONT AND LEFT", "FRONT AND RIGHT",
  "BOTH TEMPLES", "RIGHT TEMPLE", "LEFT TEMPLE",
]);

function normalizeItemSide(raw: unknown): string {
  const value = String(raw ?? "").trim().toUpperCase();
  return ITEM_SIDES.has(value) ? value : "NONE";
}

function renderItem(item: CanonicalOrderItem): string[] {
  const sku = text(item.sku, 15);
  if (!sku) throw new Error(`Order item "${item.description}" has no SKU to send.`);
  const quantity = Number(item.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new Error(`Order item "${item.description}" needs a quantity between 1 and 99.`);
  }
  const lines = [
    "item_start",
    line("sku", sku),
    line("item_source", normalizeItemSource(item.source)),
    line("item_description", text(item.description, 25)),
    line("item_quantity", String(quantity).padStart(2, "0")),
    line("item_part_rx", item.partRx === "N" ? "N" : "Y"),
    line("item_side", normalizeItemSide(item.side)),
  ];
  if (item.value) lines.push(line("item_value", text(item.value, 25)));
  if (item.comment) lines.push(line("x_item_comment", text(item.comment, 185)));
  if (item.unitPrice !== null && item.unitPrice !== undefined && Number.isFinite(Number(item.unitPrice))) {
    lines.push(line("x_misc_item_price", Number(item.unitPrice).toFixed(2)));
  }
  lines.push("item_end");
  return lines;
}

function renderLensAndRx(order: CanonicalOrder): string[] {
  const lens = order.lens;
  const rx = (order.rx ?? {}) as Record<string, unknown>;
  if (!lens) throw new Error("A confirmed lens alias with material, style, and colour codes is required.");

  // A single-eye order simply omits the other eye. An eye is "ordered" when it
  // carries a sphere; plano (0) counts, an empty field does not.
  const has = (v: unknown) => v !== null && v !== undefined && v !== "";
  const ordered = (["od", "os"] as const).filter((side) => has(rx[`${side}_sph`]));
  const eyes = ordered.length ? ordered : (["od", "os"] as const);

  // Prism is sent only when prescribed (pricing and calculation are Innovations'
  // job; no price lines go with it). Unprescribed prism keeps the spec's
  // explicit zero.
  const prism = (side: "od" | "os", n: "" | "2", defaultDir: string) => {
    const value = rx[`${side}_prism${n ? "2" : ""}_value`];
    const dir = rx[`${side}_prism${n ? "2" : ""}_dir`];
    const prescribed = has(value) && Number(value) !== 0;
    return [
      line(`rx_${side}_prism${n}`, prescribed ? numberText(value, `${side.toUpperCase()} prism`) : "0.00"),
      line(`rx_${side}_prism${n}_dir`, prescribed && dir ? text(dir, 10).toUpperCase() : defaultDir),
    ];
  };

  const eyeFields = (side: "od" | "os") => {
    const l = side === "os" ? order.lensOs ?? lens : lens;
    return [
      line(`x_${side}_lens_alias`, l.alias),
      line(`x_lens_${side}_material_code`, l.materialCode),
      line(`x_lens_${side}_material_desc`, l.materialDescription),
      line(`x_lens_${side}_style_code`, l.styleCode),
      line(`x_lens_${side}_style_desc`, l.styleDescription),
      line(`x_lens_${side}_color_code`, l.colorCode),
      line(`x_lens_${side}_color_desc`, l.colorDescription),
      line(`rx_${side}_sphere`, numberText(rx[`${side}_sph`], `${side.toUpperCase()} sphere`)),
      line(`rx_${side}_cylinder`, numberText(rx[`${side}_cyl`], `${side.toUpperCase()} cylinder`, 0)),
      line(`rx_${side}_axis`, integerText(rx[`${side}_axis`], `${side.toUpperCase()} axis`)),
      line(`rx_${side}_far`, numberText(rx[`${side}_fpd`], `${side.toUpperCase()} far PD`)),
      ...prism(side, "", "IN"),
      ...prism(side, "2", "UP"),
    ];
  };

  // PROVISIONAL: 1 = right only, 2 = left only, 3 = both. Single-eye codes are
  // unconfirmed until trial orders are available; pair orders stay "3".
  const rxEye = eyes.length === 2 ? "3" : eyes[0] === "od" ? "1" : "2";
  const lines = [line("rx_eye", rxEye), ...eyes.flatMap((side) => eyeFields(side))];

  // One height per eye, per lens: OC height (single vision), segment height
  // (bifocal) or fitting height (progressive) all travel in the seg-height
  // field. Per-eye values win; the single shared value is the older fallback.
  const height = (side: "od" | "os") => {
    const own = rx[`${side}_height`];
    return has(own) ? own : rx.seg_height || rx.fitting_height;
  };
  const withAdd = eyes.filter((side) => Number(rx[`${side}_add`] ?? 0) > 0);
  if (withAdd.length) {
    for (const side of withAdd) {
      lines.push(
        line(`rx_${side}_add`, numberText(rx[`${side}_add`], `${side.toUpperCase()} add`)),
        line(`rx_${side}_seg_height`, numberText(height(side), `${side.toUpperCase()} segment height`)),
      );
    }
    lines.push(line("x_rx_seg_height_qual", "1"));
  }
  return lines;
}

function renderFrame(order: CanonicalOrder): string[] {
  // A stock order has no job to glaze: rx_eye 5 already says "stock order
  // only", and the mandatory frame descriptors carry the values that mean
  // "no frame involved" rather than being omitted.
  if (order.kind === "stock") {
    return [
      line("frame_status", "LENSES ONLY"),
      line("frame_tracing", "NO TRACE"),
      line("frame_mounting", "STANDARD"),
      line("frame_edge", "UNCUT"),
    ];
  }

  const frame = order.frame;
  if (!frame) throw new Error("Frame details are required for a prescription order.");
  const lines = [
    line("frame_status", frame.isUncut ? "LENSES ONLY" : "SUPPLIED"),
    line("frame_tracing", "NO TRACE"),
    line("frame_mounting", "STANDARD"),
    line("frame_edge", frame.isUncut ? "UNCUT" : "EDGED"),
    line("frame_vendor", frame.brand),
    line("frame_model", frame.model),
  ];

  if (frame.isUncut) {
    if (frame.edMm == null) throw new Error("Frame ED is required to derive the uncut diameter.");
    const diameter = Math.ceil(Number(frame.edMm));
    if (!Number.isFinite(diameter) || diameter < 30 || diameter > 80) {
      throw new Error("Frame ED must yield an uncut diameter between 30 and 80 mm.");
    }
    lines.push(
      line("x_uncut_by_diam", "Y"),
      line("x_od_uncut_diam", diameter),
      line("x_os_uncut_diam", diameter),
    );
    return lines;
  }

  if (frame.aMm == null || frame.bMm == null || frame.edMm == null) {
    throw new Error("Frame A, B, and ED measurements are required for an edged order.");
  }
  lines.push(
    line("frame_a", numberText(frame.aMm, "Frame A")),
    line("frame_b", numberText(frame.bMm, "Frame B")),
    line("frame_ed", numberText(frame.edMm, "Frame ED")),
    line("frame_dbl", numberText(frame.dblMm, "Frame DBL", 0)),
    line("frame_bridge", numberText(frame.bridgeMm, "Frame bridge", 0)),
  );
  return lines;
}

/** Render a CanonicalOrder as a Hashref v2.5 order file. */
export function buildOrderHashref(order: CanonicalOrder, routing: HashrefRouting): string {
  if (!order.orderId) throw new Error("An order number has not been allocated yet.");
  const patientName = text(order.patientName, 255);
  if (!patientName) {
    throw new Error(
      order.kind === "stock"
        ? "A patient name or order reference is required for delivery."
        : "Patient name is required for delivery.",
    );
  }
  if (!text(routing.labNum) || !text(routing.custNum)) {
    throw new Error("The sending contract is missing its lab or customer number.");
  }

  // Gatekeeper spec constraints: agent_name is lowercase, lab_num is a
  // three-digit 001-999 value, and cust_seq_num is a three-digit integer.
  const agentName = (routing.agentName ?? "optilens").toLowerCase();
  // Previews render before a contract is attached and pass a visible
  // placeholder, which is left as-is instead of being validated.
  const isPlaceholderLab = text(routing.labNum).startsWith("<");
  const labNumRaw = text(routing.labNum).replace(/\D/g, "");
  const labNumValue = Number(labNumRaw);
  if (!isPlaceholderLab && (!labNumRaw || !Number.isFinite(labNumValue) || labNumValue < 1)) {
    throw new Error("The sending contract's lab number must be a positive number.");
  }
  // Gatekeeper issues lab ids wider than the spec's 3-digit example (e.g. 1368),
  // so only pad short values and send longer ones through unchanged.
  const labNum = isPlaceholderLab ? text(routing.labNum) : String(labNumValue).padStart(3, "0");

  const orderDigits = String(order.orderId).replace(/\D/g, "");
  const custSeqNum = String(Number(orderDigits.slice(-3) || "0")).padStart(3, "0");

  const lines: string[] = [
    "start_order",
    line("file_version", "2.5"),
    line("agent_name", agentName),
    line("agent_version", routing.agentVersion ?? "1"),
    line("lab_num", labNum),
    line("order_id", order.orderId),
    line("cust_num", routing.custNum),
    line("cust_seq_num", custSeqNum),

    line("customer_po_num", order.poNumber || order.orderId),
    line("x_gk_order", order.orderId),
    line("x_gk_guid", order.submissionId),
    line("patient_name", patientName),
    line("date_ordered", order.dateOrdered),
    line("instructions", order.instructions || `CV Web order ${order.poNumber || order.orderId}`),
    ...renderFrame(order),
  ];

  if (order.kind === "stock") {
    lines.push(line("rx_eye", "5"));
    if (!order.items.length) throw new Error("A stock order needs at least one item.");
  } else {
    lines.push(...renderLensAndRx(order));
  }

  for (const item of order.items) lines.push(...renderItem(item));
  lines.push("end_order");
  return lines.join("\r\n");
}

// ── Normalisers: submission payload -> CanonicalOrder ──────────────────────

interface SubmissionLike {
  id: string;
  gatekeeper_order_id: number | string | null;
  payload: Record<string, unknown>;
}

/** rx_order_submissions.payload (build_rx_submission_payload) -> CanonicalOrder. */
export function canonicalOrderFromRxSubmission(submission: SubmissionLike, now?: Date): CanonicalOrder {
  const payload = (submission.payload ?? {}) as any;
  const quote = payload.quote ?? {};
  const frame = payload.frame ?? {};
  const lensLines: any[] = Array.isArray(payload.lenses) ? payload.lenses : [];
  // A split-lens order is saved as an "OD · …" line and an "OS · …" line (see
  // persistPayload). Pair them by that label; anything else is a single lens.
  const eyeOf = (l: any) => (/^OS\s*·/.test(String(l?.item_name ?? "")) ? "os" : "od");
  const lensLine = lensLines.find((l) => eyeOf(l) === "od") ?? lensLines[0] ?? null;
  const osLine = lensLines.find((l) => l !== lensLine && eyeOf(l) === "os") ?? null;
  const codes = lensLine?.codes ?? {};
  if (!lensLine || !lensLine.alias || !codes.material_code || !codes.style_code || !codes.color_code) {
    throw new Error("A confirmed lens alias with material, style, and colour codes is required for delivery.");
  }

  const orderId = submission.gatekeeper_order_id;
  if (orderId === null || orderId === undefined || orderId === "") {
    throw new Error("An outbound order number has not been allocated for this submission.");
  }

  // Coatings, tints and supplies bought alongside the lens are part of the
  // job. They ride as order items so the receiving lab gets the whole order,
  // not just the lens.
  const addons = Array.isArray(payload.addons) ? payload.addons : [];
  const items: CanonicalOrderItem[] = addons
    .filter((addon: any) => text(addon?.sku, 15))
    .map((addon: any) => ({
      sku: String(addon.sku),
      source: inferItemSource(addon.item_name, addon.line_type),
      description: String(addon.item_name ?? addon.sku),
      quantity: Math.max(1, Number(addon.qty ?? 1) || 1),
      partRx: "Y",
    }));

  const lensFrom = (l: any): CanonicalOrderLens | null => {
    const c = l?.codes ?? {};
    if (!l?.alias || !c.material_code || !c.style_code || !c.color_code) return null;
    return {
      alias: String(l.alias),
      materialCode: String(c.material_code),
      materialDescription: c.material_description ?? null,
      styleCode: String(c.style_code),
      styleDescription: c.style_description ?? null,
      colorCode: String(c.color_code),
      colorDescription: c.color_description ?? null,
    };
  };
  const lensOs = osLine && osLine.alias !== lensLine.alias ? lensFrom(osLine) : null;
  // rx_details hangs off the first lens line only.
  const rxSource = lensLines.find((l) => l?.rx) ?? lensLine;

  return {
    kind: "rx",
    orderId: String(orderId),
    submissionId: submission.id,
    patientName: quote.contact_name || quote.customer_name || "",
    poNumber: quote.quote_number || String(orderId),
    instructions: quote.notes_customer || "",
    dateOrdered: hashrefDate(now),
    frame: {
      isUncut: frame.is_uncut === true || frame.job_scope === "surface_only",
      brand: frame.brand ?? null,
      model: frame.model_colour ?? null,
      aMm: frame.a_mm ?? null,
      bMm: frame.b_mm ?? null,
      edMm: frame.ed_mm ?? null,
      dblMm: frame.dbl_mm ?? null,
      bridgeMm: frame.bridge_mm ?? null,
    },
    lens: {
      alias: String(lensLine.alias),
      materialCode: String(codes.material_code),
      materialDescription: codes.material_description ?? null,
      styleCode: String(codes.style_code),
      styleDescription: codes.style_description ?? null,
      colorCode: String(codes.color_code),
      colorDescription: codes.color_description ?? null,
    },
    ...(lensOs ? { lensOs } : {}),
    rx: rxSource?.rx ?? {},
    items,
  };
}

/** stock_order_submissions.payload (stage_stock_order_submission) -> CanonicalOrder. */
export function canonicalOrderFromStockSubmission(submission: SubmissionLike, now?: Date): CanonicalOrder {
  const payload = (submission.payload ?? {}) as any;
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  if (!rawItems.length) throw new Error("This stock order has no items.");

  const orderId = submission.gatekeeper_order_id;
  if (orderId === null || orderId === undefined || orderId === "") {
    throw new Error("An outbound order number has not been allocated for this submission.");
  }

  return {
    kind: "stock",
    orderId: String(orderId),
    submissionId: submission.id,
    // A stock order has no patient, but patient_name is mandatory — the
    // customer's own order reference is the useful thing to show the lab.
    patientName: payload.order_reference || payload.po_number || "Stock Order",
    poNumber: payload.po_number || String(orderId),
    instructions: payload.instructions || "",
    dateOrdered: hashrefDate(now),
    items: rawItems.map((item: any) => ({
      sku: String(item.sku ?? ""),
      source: item.source,
      description: String(item.description ?? item.sku ?? ""),
      quantity: Math.max(1, Number(item.quantity ?? 1) || 1),
      comment: item.comment ?? "",
      partRx: item.part_rx === "N" ? "N" : "Y",
      side: item.item_side,
      unitPrice: item.unit_price ?? null,
    })),
  };
}

export function canonicalOrderFor(kind: OrderKind, submission: SubmissionLike, now?: Date): CanonicalOrder {
  return kind === "stock"
    ? canonicalOrderFromStockSubmission(submission, now)
    : canonicalOrderFromRxSubmission(submission, now);
}
