// Dev-only Rx form bench — mounted at /dev/rx-order under `npm run dev` and
// stripped from production builds (see the import.meta.env.DEV guard in App).
//
// The real form lives behind portal auth, a live quote, a pricelist scope and
// the Innovations alias feed, so seeing a change meant signing in and clicking
// through a real order every time. This mounts the SAME engine and the SAME
// markup against the fixtures the test harness uses, with the account-shaped
// switches (credit approval, prices visible, catalogue gaps) exposed as
// toggles — so a UI or validation change can be looked at in both themes in
// seconds, with no network at all.
//
// It deliberately shares src/tests/support/rxOrderHarness's catalogue: a bench
// with its own drifting fixture data would show a form nobody else's tests
// describe.
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { RX_TEST_DATA, TREATMENTS, testLensPrice } from "@/tests/support/rxOrderHarness";
import "@/features/rx-order/embed/rx-order.css";
import markup from "@/features/rx-order/embed/rx-order-markup.html?raw";
import { createRxOrderEngine } from "@/features/rx-order/embed/rx-order-engine.js";

type Scenario = "healthy" | "unpriced-lens" | "withdrawn-addon" | "unpriced-addon";

const SCENARIOS: { id: Scenario; label: string; hint: string }[] = [
  { id: "healthy", label: "Everything available", hint: "The ordinary case — full catalogue, everything priced." },
  { id: "unpriced-lens", label: "Lens off the pricelist", hint: "No matrix cell: quote-only, cart blocked." },
  { id: "withdrawn-addon", label: "Coating withdrawn", hint: "Super AR selected but no longer offered." },
  { id: "unpriced-addon", label: "Coating unpriced", hint: "Super AR resolves to no charge." },
];

const dataFor = (scenario: Scenario) => {
  if (scenario === "withdrawn-addon") {
    return { ...RX_TEST_DATA, treatments: RX_TEST_DATA.treatments.filter((t) => t.id !== TREATMENTS.superAr) };
  }
  if (scenario === "unpriced-addon") {
    return {
      ...RX_TEST_DATA,
      treatments: RX_TEST_DATA.treatments.map((t) => (t.id === TREATMENTS.superAr ? { ...t, p: 0, unpriced: true } : t)),
    };
  }
  return RX_TEST_DATA;
};

const RxOrderPreview = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<any>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const [scenario, setScenario] = useState<Scenario>("healthy");
  const [creditApproved, setCreditApproved] = useState(false);
  const [pricesVisible, setPricesVisible] = useState(true);
  const [lastSubmit, setLastSubmit] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = markup;

    const data = dataFor(scenario);
    const engine = createRxOrderEngine(host, {
      data: {
        ...data,
        branches: data.branches.map((b) => ({ ...b, prices: pricesVisible })),
      },
      lockedBranchId: "1",
      orderNo: () => "Q-DEV-1",
      lensPrice: scenario === "unpriced-lens" ? () => null : testLensPrice,
      canSubmitDirect: creditApproved,
      onSubmittedDirect: async (payload: any) => {
        setLastSubmit(`Placed on account · ${payload.quote?.total ?? "—"}`);
      },
      onSubmitted: async (payload: any) => {
        setLastSubmit(`Added to cart · ${payload.quote?.total ?? "—"}`);
      },
      onDraftSaved: async () => { setLastSubmit("Draft saved"); },
      onCheckout: () => setLastSubmit("→ checkout"),
      onStore: () => setLastSubmit("→ store"),
    });
    engineRef.current = engine;

    // Preselect the coating the catalogue-gap scenarios are about, so the
    // error state is on screen without four clicks.
    if (scenario === "withdrawn-addon" || scenario === "unpriced-addon") {
      engine.state.treat.add(TREATMENTS.superAr);
      engine.refreshData();
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
      host.innerHTML = "";
    };
  }, [scenario, creditApproved, pricesVisible]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <div
        style={{
          position: "sticky", top: 0, zIndex: 60, display: "flex", flexWrap: "wrap",
          gap: 14, alignItems: "center", padding: "10px 16px",
          background: "var(--card, #fff)", borderBottom: "1px solid var(--border, #ddd)",
          font: "12.5px/1.4 ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <strong style={{ fontSize: 13 }}>Rx form bench</strong>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Scenario
          <select value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)}>
            {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={creditApproved} onChange={(e) => setCreditApproved(e.target.checked)} />
          Credit-approved account
        </label>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={pricesVisible} onChange={(e) => setPricesVisible(e.target.checked)} />
          Prices visible
        </label>

        <button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          {resolvedTheme === "dark" ? "☀ Light" : "☾ Dark"}
        </button>

        <span style={{ opacity: 0.7 }}>{SCENARIOS.find((s) => s.id === scenario)?.hint}</span>
        {lastSubmit && <span style={{ marginLeft: "auto", fontWeight: 650 }}>{lastSubmit}</span>}
      </div>

      <div className="cv-rx-embed" ref={hostRef} />
    </div>
  );
};

export default RxOrderPreview;
