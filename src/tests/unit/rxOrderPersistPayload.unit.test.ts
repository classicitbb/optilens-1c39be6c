import { beforeEach, describe, expect, it, vi } from "vitest";
import { persistPayload } from "@/features/rx-order/embed/rx-order-adapter";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc, from: vi.fn() } }));

const addon = { id: "ar", name: "Super AR", sku: "AR-1", price: 30, cost: 5, category: "ar_coating" } as any;

const payload = (over: Record<string, any> = {}) => ({
  schema: "cv.rxorder/1",
  account: { id: "776", name: "Retail" },
  patient: { first: "Ann", last: "Lee" },
  job: { scope: "remote", eyes: "pair", vision: "sv", purpose: "dist" },
  frame: { name: "Ray", mount: "rimless", a: 52, b: 40, ed: 55, dbl: 18 },
  lens: { material: "m", design: "d", colour: "c" },
  rx: { od: { sph: -1, ht: "18", prism: 2, base: "OUT" }, os: { sph: -1, ht: "19" } },
  treatments: ["ar"],
  delivery: { service: "pri", notes: "" },
  quote: {
    rate: 1,
    total: 0,
    lines: [
      { label: "OD Single vision", amount: 50, eye: "od", lens: true },
      { label: "OS Single vision", amount: 50, eye: "os", lens: true },
      { label: "OD Super AR", amount: 15, eye: "od" },
      { label: "OS Super AR", amount: 15, eye: "os" },
      { label: "OD Tint colour", detail: "Extra over Clear", amount: 4, eye: "od" },
      { label: "Prism", detail: "2.00Δ ground in", amount: 24 },
      { label: "OD Oversize blank", detail: "76 mm", amount: 11, eye: "od" },
      { label: "OS Oversize blank", detail: "76 mm", amount: 11, eye: "os" },
      { label: "Remote edge to trace", detail: "Rimless drill mount", amount: 48 },
      { label: "Priority service", detail: "3 working days", amount: 25 },
    ],
  },
  ...over,
});

const ctx = () => ({
  lensIndex: new Map(),
  addons: [addon],
  lensPriceBBD: () => 50,
  resolveAlias: () => ({ alias: "A1", label: "lens" }),
});

describe("persistPayload → save_rx_order", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: { quote_id: "q1", quote_number: "Q-1", rx_order_number: 80000001, total: 253, created: true }, error: null });
  });

  it("makes every priced engine line a quote line so the total is their sum", async () => {
    const p = payload();
    await persistPayload(null, p, ctx());
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe("save_rx_order");
    expect(args.p_quote_id).toBeNull();
    const lines = args.p_payload.lines as any[];
    const sum = lines.reduce((s, l) => s + l.qty * l.unit_sell_price_bbd, 0);
    expect(sum).toBeCloseTo(50 + 50 + 30 + 4 + 24 + 22 + 48 + 25, 2);

    expect(lines.filter((l) => l.line_type === "Lens")).toHaveLength(2);
    // one coating line at the sum of its eye lines — the lab gets ONE item
    expect(lines.filter((l) => l.sku === "AR-1")).toEqual([expect.objectContaining({ unit_sell_price_bbd: 30 })]);
    // surcharges cite their rule; the unrecognised colour upcharge is a SKU-less AddOn
    const fees = lines.filter((l) => l.line_type === "Fee").map((l) => l.group_key).sort();
    expect(fees).toEqual([
      "surcharge:oversize_blank", "surcharge:oversize_blank", "surcharge:priority_service",
      "surcharge:prism", "surcharge:remote_edge",
    ]);
    expect(lines.find((l) => /Tint colour/.test(l.item_name))).toMatchObject({ line_type: "AddOn", sku: "", product_id: null });
  });

  it("saves one height per eye and the frame mount and remote-edge scope in their own columns", async () => {
    await persistPayload("q1", payload(), ctx());
    const { rx, frame } = rpc.mock.calls[0][1].p_payload;
    expect(rx).toMatchObject({ od_height: "18", os_height: "19", od_prism_value: 2, od_prism_dir: "OUT" });
    expect(frame).toMatchObject({ job_scope: "remote_edge", mount_type: "rimless" });
    expect(frame).not.toHaveProperty("model_colour");
  });

  it("tags test-bench saves and returns the server's quote identity and total", async () => {
    const out = await persistPayload(null, payload(), { ...ctx(), isTest: true });
    expect(rpc.mock.calls[0][1].p_is_test).toBe(true);
    expect(out).toMatchObject({ quoteId: "q1", quoteNumber: "Q-1", rxOrderNumber: 80000001, totalBBD: 253, created: true });
  });

  it("surfaces a database refusal instead of reporting a save", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "This Rx order has been released and can no longer be edited." } });
    await expect(persistPayload("q1", payload(), ctx())).rejects.toMatchObject({ message: expect.stringMatching(/released/) });
  });
});
