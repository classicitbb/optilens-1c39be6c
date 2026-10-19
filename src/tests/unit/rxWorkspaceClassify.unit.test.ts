import { describe, expect, it } from "vitest";
import {
  applyFilters, buildItems, captureTab, countByTab, NO_FILTERS, statusLabel, submissionTab, type CaptureRow,
} from "@/features/rx-order/workspace/classify";
import type { RxSubmissionRow } from "@/features/rx-order/types";
import type { StockSubmissionRow } from "@/features/rx-order/workspace/stockSubmissions";

const sub = (over: Partial<RxSubmissionRow> = {}): RxSubmissionRow => ({
  id: "s1", quote_id: "q1", order_id: null, account_id: 1, status: "pending_review", dispatch_provider: "innovations", transport: null,
  result_code: null, result_message: null, rxt_data: null, attempts: 0, last_error: null, approved_by: null, approved_at: null, submitted_at: null,
  created_at: "2026-10-01T10:00:00Z", gatekeeper_order_id: null, lab_status: null, lab_status_detail: null, lab_status_at: null,
  payload: { quote: { quote_number: "Q-1", customer_name: "Acme" }, account: { name: "Acme Optical" } }, ...over,
});
const cap = (over: Partial<CaptureRow> = {}): CaptureRow => ({
  id: "c1", account_id: 1, source: "web", status: "ready", error: null, quote_id: null, created_at: "2026-10-02T10:00:00Z", storage_path: "p", file_name: "a.jpg", ...over,
});

describe("statusLabel", () => {
  it("replaces every underscore", () => expect(statusLabel("pending_review_now")).toBe("pending review now"));
});

describe("submissionTab", () => {
  it.each([
    [{ status: "pending_review", lab_status: null }, "ready"],
    [{ status: "approved", lab_status: null }, "lab"],
    [{ status: "claimed", lab_status: null }, "lab"],
    [{ status: "submitted", lab_status: "In production" }, "lab"],
    [{ status: "submitted", lab_status: "On hold - awaiting frame" }, "problems"],
    [{ status: "submitted", lab_status: "Shipped" }, "done"],
    [{ status: "submitted", lab_status: "Delivered" }, "done"],
    [{ status: "failed", lab_status: null }, "problems"],
    [{ status: "cancelled", lab_status: null }, "done"],
  ] as const)("%j -> %s", (row, tab) => expect(submissionTab(row)).toBe(tab));
});

describe("captureTab", () => {
  it("waits for review, flags a failed read, and drops out once it is a submission", () => {
    expect(captureTab(cap(), false)).toBe("review");
    expect(captureTab(cap({ status: "processing" }), false)).toBe("review");
    expect(captureTab(cap({ status: "failed" }), false)).toBe("problems");
    expect(captureTab(cap({ quote_id: "q1" }), true)).toBeNull();
  });
});

describe("buildItems", () => {
  const names = (id: number | null) => (id === 1 ? "Acme Optical" : "-");
  const items = (submissions: RxSubmissionRow[], captures: CaptureRow[]) => buildItems({ submissions, captures, accountName: names, quoteNumbers: new Map([["q9", "Q-9"]]) });

  it("lists submissions and open captures newest first", () => {
    const list = items([sub()], [cap()]);
    expect(list.map((i) => i.key)).toEqual(["c:c1", "s:s1"]);
    expect(list[1]).toMatchObject({ tab: "ready", source: "form", quoteNumber: "Q-1", accountName: "Acme Optical" });
  });

  it("a capture that became a submission shows once, as a submission with its capture source", () => {
    const list = items([sub()], [cap({ quote_id: "q1", source: "local_capture" })]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "submission", source: "local_capture" });
  });

  it("a saved but unsubmitted capture stays in review, with its quote number", () => {
    const list = items([], [cap({ quote_id: "q9" })]);
    expect(list[0]).toMatchObject({ tab: "review", quoteNumber: "Q-9", source: "capture" });
  });
});

describe("filters and counts", () => {
  const all = buildItems({
    submissions: [
      sub(),
      sub({ id: "s2", quote_id: "q2", status: "submitted", lab_status: "Shipped", dispatch_provider: "gatekeeper", created_at: "2026-09-20T10:00:00Z", payload: { quote: { quote_number: "Q-2" }, account: { name: "Zed Lens" } } }),
    ],
    captures: [cap()], accountName: () => "Acme Optical", quoteNumbers: new Map(),
  });

  it("counts per tab", () => expect(countByTab(all)).toEqual({ review: 1, ready: 1, lab: 0, problems: 0, done: 1 }));
  it("filters by text, source, provider and date", () => {
    expect(applyFilters(all, { ...NO_FILTERS, text: "zed" }).map((i) => i.key)).toEqual(["s:s2"]);
    expect(applyFilters(all, { ...NO_FILTERS, text: "q-2" })).toHaveLength(1);
    expect(applyFilters(all, { ...NO_FILTERS, source: "capture" }).map((i) => i.key)).toEqual(["c:c1"]);
    expect(applyFilters(all, { ...NO_FILTERS, provider: "gatekeeper" }).map((i) => i.key)).toEqual(["s:s2"]);
    expect(applyFilters(all, { ...NO_FILTERS, from: "2026-10-01" }).map((i) => i.key)).toEqual(["c:c1", "s:s1"]);
    expect(applyFilters(all, { ...NO_FILTERS, to: "2026-09-30" }).map((i) => i.key)).toEqual(["s:s2"]);
  });
});

describe("stock submissions in the shared workspace", () => {
  const stock: StockSubmissionRow = {
    id: "stock-33", account_id: 789, order_id: "33", quote_id: null,
    order_reference: "ZZ SEED GK", po_number: "PO-33", status: "submitted",
    dispatch_provider: "gatekeeper", transport: "gatekeeper", filename: null,
    attempts: 1, last_error: null, released_at: "2026-10-19T21:00:13Z",
    gatekeeper_order_id: 33, receipt: { contrato_id: 47760 }, lab_status: null,
    lab_status_detail: null, lab_status_at: null,
    created_at: "2026-10-19T21:00:10Z", updated_at: "2026-10-19T21:00:13Z",
    payload: { account: { name: "Enhance Vision Optical" }, items: [], order_total: 453.6 },
  };
  const items = (s = stock) => buildItems({ submissions: [sub()], stocks: [s], captures: [], accountName: () => "—", quoteNumbers: new Map() });

  it("includes submitted stock order 33 at lab without converting it to Rx", () => {
    expect(items()[0]).toMatchObject({ key: "stock:stock-33", kind: "stock", tab: "lab", quoteNumber: "Stock 33", stock });
    expect(items()[0].submission).toBeUndefined();
  });
  it("keeps staged stock ready to release", () => expect(items({ ...stock, status: "staged" })[0].tab).toBe("ready"));
  it("keeps failed stock in problems", () => expect(items({ ...stock, status: "failed" })[0].tab).toBe("problems"));
  it("filters stock independently from Rx", () => {
    expect(applyFilters(items(), { ...NO_FILTERS, orderType: "stock" }).map((i) => i.key)).toEqual(["stock:stock-33"]);
    expect(applyFilters(items(), { ...NO_FILTERS, orderType: "rx" }).map((i) => i.key)).toEqual(["s:s1"]);
  });
  it("finds stock by reference and order number", () => {
    expect(applyFilters(items(), { ...NO_FILTERS, text: "ZZ SEED GK" }).map((i) => i.key)).toEqual(["stock:stock-33"]);
    expect(applyFilters(items(), { ...NO_FILTERS, text: "33" }).map((i) => i.key)).toEqual(["stock:stock-33"]);
  });
});
