// A combination with no matrix price must never look like it costs nothing.
//
// The engine used to fall back to `d.base + m.up` whenever the adapter returned
// no price. Under the Innovations-sourced catalogue both of those are 0, so an
// unpriced lens quoted at $0.00 and could be submitted. Per
// docs/rx-order-innovations-catalogue.md §2.4 an unpriced combination is "not
// offered": still selectable, shown as on request, and routed to a draft we
// quote back rather than to the cart.
import { beforeEach, describe, expect, it } from "vitest";
import markup from "@/features/rx-order/embed/rx-order-markup.html?raw";
import { createRxOrderEngine } from "@/features/rx-order/embed/rx-order-engine.js";

const DATA = {
  branches: [{ id: "1", code: "CV", name: "Test Account", info: "", cur: "BBD", prices: true }],
  materials: [{ id: "plastic 1.50", n: "Plastic 1.50", up: 0 }],
  designs: [{ id: "single vision|regular", n: "Single Vision · Regular", v: "sv", base: 0, prog: false }],
  colours: [
    { id: "uncoated", n: "UNCoated", up: 0 },
    { id: "tgns amber", n: "TGNS Amber", up: 0 },
  ],
  matrix: { "plastic 1.50": { d: ["single vision|regular"], c: ["uncoated", "tgns amber"] } },
  combos: [
    { m: "plastic 1.50", d: "single vision|regular", c: "uncoated" },
    { m: "plastic 1.50", d: "single vision|regular", c: "tgns amber" },
  ],
  treatments: [],
  clashes: [],
};

// UNCoated is priced; TGNS Amber has no cell — the live shape of the gap.
const lensPrice = (_m: string, _d: string, c: string) => (c === "uncoated" ? 278.25 : null);

const mount = () => {
  const host = document.createElement("div");
  host.className = "cv-rx-embed";
  host.innerHTML = markup;
  document.body.appendChild(host);
  const engine = createRxOrderEngine(host, {
    data: DATA,
    lockedBranchId: "1",
    orderNo: () => "Q-1",
    lensPrice,
  });
  const select = (m: string, d: string, c: string) => {
    engine.state.m = m;
    engine.state.d = d;
    engine.state.c = c;
  };
  return { host, engine, select };
};

const quoteText = (host: HTMLElement) => host.querySelector("#qLines")?.textContent ?? "";

describe("unpriced combinations are quote-only", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("prices a combination the matrix covers", () => {
    const { host, engine, select } = mount();
    select("plastic 1.50", "single vision|regular", "uncoated");
    engine.refreshData();

    expect(host.querySelector("#qTotal")?.textContent).toContain("278.25");
    expect(quoteText(host)).not.toContain("on request");

    engine.destroy();
  });

  it("shows an uncovered combination as on request, never as zero", () => {
    const { host, engine, select } = mount();
    select("plastic 1.50", "single vision|regular", "tgns amber");
    engine.refreshData();

    expect(quoteText(host)).toContain("on request");
    expect(quoteText(host)).not.toMatch(/\b0\.00\b/);

    engine.destroy();
  });

  it("does not show a 0.00 total beside an on-request line — that reads as free", () => {
    const { host, engine, select } = mount();
    select("plastic 1.50", "single vision|regular", "tgns amber");
    engine.refreshData();

    expect(host.querySelector("#qSubtotal")?.textContent).toBe("on request");
    expect(host.querySelector("#qTotal")?.textContent).toBe("on request");
    expect(host.querySelector("#qAmt")?.textContent).toBe("on request");

    engine.destroy();
  });

  it("shows a real total again once the lens is priced", () => {
    const { host, engine, select } = mount();
    select("plastic 1.50", "single vision|regular", "uncoated");
    engine.refreshData();

    expect(host.querySelector("#qTotal")?.textContent).toContain("278.25");

    engine.destroy();
  });

  it("keeps an uncovered combination out of the cart", () => {
    const { host, engine, select } = mount();
    select("plastic 1.50", "single vision|regular", "tgns amber");
    engine.refreshData();

    // Submit is the cart path; a lens with no price has nothing to charge.
    expect(host.querySelector<HTMLButtonElement>("#submitBtn")?.disabled).toBe(true);
    expect(host.querySelector("#submitBtn")?.getAttribute("title")).toMatch(/not priced/i);
    // Saving a draft stays available — that is the quote request.
    expect(host.querySelector<HTMLButtonElement>("#saveDraft")?.disabled).toBeFalsy();

    engine.destroy();
  });

  it("raises an assistance flag so the request reaches the follow-up queue", () => {
    const { host, engine, select } = mount();
    select("plastic 1.50", "single vision|regular", "tgns amber");
    engine.refreshData();

    expect([...engine.state.assists].some((a: string) => /not priced/i.test(a))).toBe(true);
    expect(host.querySelector("#assistList")?.classList.contains("on")).toBe(true);

    engine.destroy();
  });

  it("clears the flag again once a priced combination is chosen", () => {
    const { engine, select } = mount();
    select("plastic 1.50", "single vision|regular", "tgns amber");
    engine.refreshData();
    expect([...engine.state.assists].some((a: string) => /not priced/i.test(a))).toBe(true);

    select("plastic 1.50", "single vision|regular", "uncoated");
    engine.refreshData();

    expect([...engine.state.assists].some((a: string) => /not priced/i.test(a))).toBe(false);

    engine.destroy();
  });

  it("excludes the unpriced lens from the payload total rather than adding zero", () => {
    const { engine, select } = mount();
    select("plastic 1.50", "single vision|regular", "tgns amber");
    engine.refreshData();

    const payload = engine.getPayload();
    expect(payload.quote.total).toBe(0);
    expect(payload.assistance).toContain("Lens not priced on this account — quote requested");

    engine.destroy();
  });
});

describe("currency table swapped in by the adapter", () => {
  const CURRENCIES = {
    BBD: { sym: "BBD $", rate: 1, n: "Barbados dollar" },
    USD: { sym: "USD $", rate: 0.5, n: "US dollar" },
    EUR: { sym: "EUR €", rate: 0.4608, n: "Euro (indicative)", indicative: true },
  };

  const mountWithCurrencies = () => {
    const host = document.createElement("div");
    host.className = "cv-rx-embed";
    host.innerHTML = markup;
    document.body.appendChild(host);
    const engine = createRxOrderEngine(host, {
      data: { ...DATA, currencies: CURRENCIES },
      lockedBranchId: "1",
      orderNo: () => "Q-1",
      lensPrice,
    });
    return { host, engine };
  };

  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("replaces the static option list, dropping codes the table has no rate for", () => {
    // The markup ships CAD and GYD; neither is in the live table, and selecting
    // one would read .rate off undefined and take the quote down.
    const { host, engine } = mountWithCurrencies();

    const codes = Array.from(host.querySelectorAll<HTMLOptionElement>("#curSim option")).map((o) => o.value);
    expect(codes).toEqual(["BBD", "USD", "EUR"]);
    expect(codes).not.toContain("CAD");
    expect(codes).not.toContain("GYD");

    engine.destroy();
  });

  it("marks the display-only currencies in the picker", () => {
    const { host, engine } = mountWithCurrencies();

    const eur = Array.from(host.querySelectorAll<HTMLOptionElement>("#curSim option")).find((o) => o.value === "EUR");
    const usd = Array.from(host.querySelectorAll<HTMLOptionElement>("#curSim option")).find((o) => o.value === "USD");
    expect(eur?.textContent).toMatch(/indicative/i);
    expect(usd?.textContent).not.toMatch(/indicative/i);

    engine.destroy();
  });

  it("converts a BBD matrix price into USD at half, not double", () => {
    const { host, engine } = mountWithCurrencies();
    engine.state.m = "plastic 1.50";
    engine.state.d = "single vision|regular";
    engine.state.c = "uncoated";
    engine.state.cur = "USD";
    engine.refreshData();

    // 278.25 BBD at 2 BBD per USD.
    expect(host.querySelector("#qTotal")?.textContent).toContain("139.13");

    engine.destroy();
  });

  it("says an indicative currency is guidance, not the billed amount", () => {
    const { host, engine } = mountWithCurrencies();
    engine.state.m = "plastic 1.50";
    engine.state.d = "single vision|regular";
    engine.state.c = "uncoated";
    engine.state.cur = "EUR";
    engine.refreshData();

    expect(host.querySelector("#qSub")?.textContent).toMatch(/guidance, billed in USD/i);

    engine.destroy();
  });
});
