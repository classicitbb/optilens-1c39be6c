// Rx form bench — mounted at /dev/rx-order under `npm run dev` (no sign-in),
// and for staff in every build at /admin/orders/rx-test (AdminRoutes), so the
// form can be tested in admin while customer access is switched off. It never
// writes to the database or sends anything to a lab.
//
// The real form lives behind portal auth, a live quote, a pricelist scope and
// the Innovations alias feed, so seeing a change meant signing in and clicking
// through a real order every time. This mounts the SAME engine and the SAME
// markup against the fixtures the test harness uses, with the account-shaped
// switches (credit approval, prices visible, catalogue gaps) exposed as
// toggles — so a UI or validation change can be looked at in both themes in
// seconds, with no network at all.
//
// "Preview as customer" (staff route only) mounts the REAL form — live
// catalogue, the chosen account's pricelist and currency — as that customer
// would see it, in test mode: saves are tagged is_test, and the order goes
// nowhere (no cart, no account order, no lab, no saved-drafts copy).
//
// It deliberately shares src/tests/support/rxOrderHarness's catalogue: a bench
// with its own drifting fixture data would show a form nobody else's tests
// describe.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAccounts } from "@/hooks/useCustomerAccounts";
import RxOrderEmbed from "@/features/rx-order/RxOrderEmbed";
import RxForm from "@/features/rx-order/form/RxForm";
import { RX_TEST_DATA, TREATMENTS, testLensPrice } from "@/tests/support/rxOrderHarness";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import type { RxCatalog } from "@/features/rx-order/form/types";
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

type Mode = "fixtures" | "customer";
type FormVersion = "engine" | "react";

// The fixtures the previous-form bench uses, in the React form's catalogue shape.
const reactFixtureCatalog = (data: ReturnType<typeof dataFor>, pricesVisible: boolean, unpricedLens: boolean): RxCatalog => ({
  materials: data.materials.map((m) => ({ id: m.id, n: m.n, up: m.up })),
  designs: data.designs.map((d) => ({ id: d.id, n: d.n, v: d.v as "sv" | "mf", base: d.base, prog: d.prog, needsAdd: (d as any).needsAdd })),
  colours: data.colours.map((c) => ({ id: c.id, n: c.n, up: c.up })),
  combos: data.combos,
  treatments: data.treatments.map((t) => ({ id: t.id, c: t.c, n: t.n, d: t.d, p: t.p, grp: t.grp, pop: (t as any).pop, unpriced: (t as any).unpriced })),
  clashes: data.clashes,
  lensPrice: unpricedLens ? () => null : testLensPrice,
  hasPriceSource: true,
  blockUnpricedOrders: false,
  surchargeRules: DEFAULT_SURCHARGE_RULES,
  accountCountry: "BB",
  pricesVisible,
});

const RxOrderPreview = ({ allowLive = false }: { allowLive?: boolean }) => {
  const navigate = useNavigate();
  const { data: accounts = [] } = useCustomerAccounts();
  const [mode, setMode] = useState<Mode>("fixtures");
  // Which implementation the customer preview mounts: the previous engine or the React rewrite.
  const [formVersion, setFormVersion] = useState<FormVersion>("react");
  const reactFixture = !allowLive || mode === "fixtures" ? formVersion === "react" : false;
  const [accountFilter, setAccountFilter] = useState("");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [testQuote, setTestQuote] = useState<string | null>(null);
  const [cleanupNote, setCleanupNote] = useState<string | null>(null);
  const live = allowLive && mode === "customer";
  const matches = useMemo(() => {
    const f = accountFilter.trim().toLowerCase();
    const list = f ? accounts.filter((a) => `${a.name} ${a.account_number ?? ""}`.toLowerCase().includes(f)) : accounts;
    return list.slice(0, 60);
  }, [accounts, accountFilter]);

  const deleteMyTestOrders = async () => {
    if (!window.confirm("Delete every test Rx order you have saved on the bench?")) return;
    const { data: me } = await supabase.auth.getUser();
    const { data, error } = await (supabase.from("quotes") as any)
      .delete().eq("is_test", true).eq("created_by", me.user?.id ?? "").select("id");
    setCleanupNote(error ? `Could not delete: ${error.message}` : `Deleted ${(data ?? []).length} test order(s).`);
    setTestQuote(null);
  };

  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<any>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const [scenario, setScenario] = useState<Scenario>("healthy");
  const [creditApproved, setCreditApproved] = useState(false);
  const [pricesVisible, setPricesVisible] = useState(true);
  const [lastSubmit, setLastSubmit] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || live || reactFixture) return;
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
  }, [scenario, creditApproved, pricesVisible, live, reactFixture]);

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
        {/* the way out: the admin bench returns to the regular Rx order form, the dev bench to the site */}
        <button type="button" onClick={() => navigate(allowLive ? "/admin/orders/quotations/new-rx" : "/")}>
          ← {allowLive ? "Rx order form" : "Back"}
        </button>
        <strong style={{ fontSize: 13 }}>Rx form bench</strong>

        {allowLive && (
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            Mode
            <select value={mode} onChange={(e) => { setMode(e.target.value as Mode); setLastSubmit(null); }}>
              <option value="fixtures">Fixtures (no network)</option>
              <option value="customer">Preview as customer</option>
            </select>
          </label>
        )}

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Form
          <select value={formVersion} onChange={(e) => { setFormVersion(e.target.value as FormVersion); setLastSubmit(null); setTestQuote(null); }}>
            <option value="react">New React form</option>
            <option value="engine">Previous form</option>
          </select>
        </label>

        {live ? (
          <>
            <input
              placeholder="Find account…" value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)} style={{ width: 150 }}
            />
            <select
              value={accountId ?? ""} onChange={(e) => { setAccountId(e.target.value ? Number(e.target.value) : null); setLastSubmit(null); setTestQuote(null); }}
              style={{ maxWidth: 240 }}
            >
              <option value="">Choose an account…</option>
              {matches.map((a) => <option key={a.id} value={a.id}>{a.name}{a.account_number ? ` · ${a.account_number}` : ""}</option>)}
            </select>
            <button type="button" onClick={deleteMyTestOrders}>Delete my test orders</button>
          </>
        ) : (
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            Scenario
            <select value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)}>
              {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        )}

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

        <span style={{ opacity: 0.7 }}>
          {live
            ? "TEST MODE — saves are tagged test; nothing goes to the cart, an account, or a lab."
            : SCENARIOS.find((s) => s.id === scenario)?.hint}
        </span>
        {live && testQuote && <span style={{ fontFamily: "monospace" }}>Test quote {testQuote}</span>}
        {live && cleanupNote && <span>{cleanupNote}</span>}
        {lastSubmit && <span style={{ marginLeft: "auto", fontWeight: 650 }}>{lastSubmit}</span>}
      </div>

      {live ? (
        accountId == null ? (
          <div style={{ padding: 48, textAlign: "center", fontSize: 13, opacity: 0.7 }}>
            Choose an account above to see the form exactly as that customer would — their pricelist, their currency.
          </div>
        ) : (
          formVersion === "react" ? (
            <RxForm
              key={`react:${accountId}:${creditApproved}:${pricesVisible}:${resetKey}`}
              quoteId={null}
              surface="admin"
              lockedAccountId={accountId}
              pricesVisible={pricesVisible}
              allowDirectSubmit={creditApproved}
              isTest
              showPayload
              onQuoteCreated={({ quoteNumber }) => setTestQuote(quoteNumber)}
              onTestSubmitted={(what, saved) => setLastSubmit(`${what} · test quote ${saved.quoteNumber ?? ""} · BBD ${saved.totalBBD.toFixed(2)}`)}
              onStartAnother={() => { setTestQuote(null); setLastSubmit(null); setResetKey((k) => k + 1); }}
            />
          ) : (
          <RxOrderEmbed
            key={`${accountId}:${creditApproved}:${pricesVisible}:${resetKey}`}
            quoteId={null}
            surface="admin"
            lockedAccountId={accountId}
            pricesVisible={pricesVisible}
            allowDirectSubmit={creditApproved}
            currency="BBD"
            isTest
            onQuoteCreated={({ quoteNumber }) => setTestQuote(quoteNumber)}
            onTestSubmitted={(what, saved) => setLastSubmit(`${what} · test quote ${saved.quoteNumber ?? ""} · BBD ${saved.totalBBD.toFixed(2)}`)}
            onStartAnother={() => { setTestQuote(null); setLastSubmit(null); setResetKey((k) => k + 1); }}
          />
          )
        )
      ) : reactFixture ? (
        <RxForm
          key={`fixture:${scenario}:${creditApproved}:${pricesVisible}:${resetKey}`}
          quoteId={null}
          surface="admin"
          fixture={{
            catalog: reactFixtureCatalog(dataFor(scenario), pricesVisible, scenario === "unpriced-lens"),
            accounts: RX_TEST_DATA.branches.map((b) => ({ id: Number(b.id), name: b.name, account_number: b.info })),
          }}
          pricesVisible={pricesVisible}
          allowDirectSubmit={creditApproved}
          isTest
          showPayload
          onTestSubmitted={(what, saved) => setLastSubmit(`${what} · BBD ${saved.totalBBD.toFixed(2)}`)}
          onStartAnother={() => { setLastSubmit(null); setResetKey((k) => k + 1); }}
        />
      ) : (
        <div className="cv-rx-embed" ref={hostRef} />
      )}
    </div>
  );
};

export default RxOrderPreview;
