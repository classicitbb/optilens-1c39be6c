import { useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, CheckCircle2, Phone, Search, Truck } from "lucide-react";
import { BUSINESS } from "./homeContent";
import { compareCosts, type CostInputs } from "./journeyCost";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";

const tasks = [
  { title: "Place an order", detail: "Rx lenses, stock lenses & supplies", href: "/profile/rx-order", keywords: "buy reorder prescription" },
  { title: "Track my order", detail: "Sign in for your order status", href: "/profile/orders", keywords: "tracking delivery lab job" },
  { title: "See products & pricing", detail: "Explore the range; request trade prices", href: "/store", keywords: "catalogue catalog lens glasses coating" },
  { title: "Start a trade account", detail: "Apply and get help setting up", href: "/professionals/trade-account", keywords: "new signup onboarding register" },
  { title: "Shipping & total costs", detail: "Plan delivery to your island", href: "#shipping", keywords: "freight customs time savings compare supplier" },
  { title: "My account & statements", detail: "Pricing, balances and account help", href: "/profile", keywords: "credit invoice payment balance bill" },
  { title: "Talk to our team", detail: "A person can guide you step by step", href: "/professionals/customer-service", keywords: "help support contact phone office return remake" },
  { title: "Why Classic Visions?", detail: "Meet your Barbados optical laboratory", href: "#why-classic", keywords: "about trust research who company" },
];
const linkStyle = "inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary";
const inputStyle = "mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary";

export function TaskFinder() {
  const [query, setQuery] = useState("");
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = tasks.filter(task => words.every(word => `${task.title} ${task.detail} ${task.keywords}`.toLowerCase().includes(word)));
  return <section id="quick-start" className="scroll-mt-24 border-b border-border bg-background py-9" aria-labelledby="task-heading">
    <div className="container mx-auto px-5 sm:px-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-secondary">Your next step</p><h2 id="task-heading" className="mt-2 font-serif text-3xl">What do you need today?</h2><p className="mt-2 text-muted-foreground">New here or ordering again? Go straight to what you need.</p></div>
        <label className="block lg:w-96"><span className="text-sm font-medium">Find a task or answer</span><div className="relative"><Search className="absolute right-3 top-5 h-5 w-5 text-muted-foreground" aria-hidden="true"/><input type="search" className={`${inputStyle} pr-10`} value={query} onChange={event => setQuery(event.target.value)} placeholder="Try shipping, credit, order or help" /></div></label>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {matches.map(task => <a key={task.title} href={task.href} className="group rounded-xl border border-border bg-card p-4 transition hover:border-secondary hover:bg-secondary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary"><span className="flex items-center justify-between gap-2 font-semibold">{task.title}<ArrowUpRight className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true"/></span><span className="mt-2 block text-sm text-muted-foreground">{task.detail}</span></a>)}
      </div>
      <p role="status" className="mt-3 text-sm text-muted-foreground">{query ? `${matches.length} matching shortcuts. ` : ""}{matches.length === 0 ? <>Try a shorter word, <Link className="underline" to="/knowledge">browse the knowledge centre</Link>, or call us.</> : "Account details and ordering require sign-in and the relevant account access."}</p>
      <a className={`${linkStyle} mt-2 pl-0 text-secondary`} href={BUSINESS.phoneHref}><Phone className="h-4 w-4" aria-hidden="true"/>Prefer a person? {BUSINESS.phoneDisplay}</a>
    </div>
  </section>;
}

const costLabels = ["Products", "Freight / shipping", "Insurance", "Duties & taxes", "Brokerage & local delivery"];
const blankCosts = (): CostInputs => ["", "", "", "", ""];

export function ShippingComparison() {
  const { openAssistant } = useCompanionAssistant();
  const [island, setIsland] = useState("");
  const [currency, setCurrency] = useState("BBD");
  const [current, setCurrent] = useState<CostInputs>(blankCosts);
  const [proposed, setProposed] = useState<CostInputs>(blankCosts);
  const [equivalent, setEquivalent] = useState(false);
  const result = equivalent ? compareCosts(current, proposed) : null;
  const money = (amount: number) => new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "code" }).format(amount);
  const changeCost = (side: "current" | "proposed", index: number, value: string) => {
    const setter = side === "current" ? setCurrent : setProposed;
    setter(previous => previous.map((item, position) => position === index ? value : item) as CostInputs);
  };
  return <section id="shipping" className="scroll-mt-24 border-y border-border bg-muted/30 py-14" aria-labelledby="shipping-heading">
    <div className="container mx-auto px-5 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-secondary">Delivery to your island</p>
      <h2 id="shipping-heading" className="mt-3 font-serif text-3xl sm:text-4xl">Know the full cost before you decide.</h2>
      <p className="mt-4 max-w-3xl text-muted-foreground">A lens price is only part of the picture. Compare the same order, delivered to the same place, with shipping and import costs included.</p>
      <div className="mt-8 grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-5">
          <div className="rounded-xl border bg-card p-6">
            <Truck className="h-6 w-6 text-secondary" aria-hidden="true"/><h3 className="mt-3 text-xl font-semibold">Get a destination-specific quote</h3>
            <label className="mt-4 block text-sm font-medium">Island / destination<input className={inputStyle} value={island} maxLength={100} onChange={event => setIsland(event.target.value)} placeholder="e.g. Saint Lucia" /></label>
            <p role="status" className="mt-3 text-sm leading-6 text-muted-foreground">{island.trim() ? `For ${island.trim()}, ask our team to confirm service availability, freight and delivery timing.` : "Tell our team your destination so they can confirm service availability, freight and delivery timing."} Shipping prices and transit times need a shipment-specific quote. We do not yet publish an approved country-by-country schedule.</p>
            <Link className="mt-3 inline-block text-sm font-semibold text-secondary underline" to="/professionals/freight-delivery-policy">View freight & delivery guidance</Link>
            <p className="mt-4 text-sm font-semibold">Have these details ready:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted-foreground"><li>Delivery address and postal code, if used</li><li>Lens specifications, quantities and required date</li><li>Preferred shipping method and any consolidation needs</li></ul>
            <button type="button" className={`${linkStyle} mt-4 bg-secondary text-secondary-foreground`} onClick={() => openAssistant({ formKind: "pricelist_request", audience: "dispenser", formValues: { summary: `Please quote products and shipping${island.trim() ? ` to ${island.trim()}` : " to my destination"}. Please confirm production time, transit estimate, included charges and import costs payable separately.` } })}>Request pricing & shipping <ArrowUpRight className="h-4 w-4"/></button>
            <p className="mt-2 text-xs text-muted-foreground">Opens an editable request with your destination included. Review it before sending.</p>
          </div>
          <div className="rounded-xl border bg-card p-6"><h3 className="font-semibold">When will it arrive?</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Allow for order confirmation, lab production, carrier transit, customs clearance and local delivery. Dispatch is not arrival. Ask for a production estimate and a separate shipping estimate before promising a patient a date.</p></div>
        </div>
        <div id="compare-costs" className="scroll-mt-24 rounded-xl border bg-card p-5 sm:p-7">
          <h3 className="text-xl font-semibold">Compare your delivered cost</h3><p id="comparison-note" className="mt-2 text-sm leading-6 text-muted-foreground">Use your current supplier’s quote and a Classic Visions quote. This worksheet calculates your entries only; it does not fetch prices, exchange rates or shipping quotes. Nothing is sent or saved.</p>
          <label className="mt-4 block max-w-48 text-sm font-medium">Currency for both quotes<select className={inputStyle} value={currency} onChange={event => { setCurrency(event.target.value); setCurrent(blankCosts()); setProposed(blankCosts()); setEquivalent(false); }}><option>BBD</option><option>USD</option><option>XCD</option><option>TTD</option><option>JMD</option><option>EUR</option></select></label>
          <p className="mt-2 text-xs text-muted-foreground">Changing currency clears amounts; no currency conversion is applied.</p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {(["current", "proposed"] as const).map(side => <fieldset key={side} className="min-w-0"><legend className="mb-3 text-sm font-semibold">{side === "current" ? "Current supplier" : "Classic Visions"}</legend>{costLabels.map((label, index) => <label key={label} className="mb-3 block text-sm">{label}<input type="number" min="0" step="0.01" inputMode="decimal" aria-label={`${side === "current" ? "Current supplier" : "Classic Visions"} ${label} (${currency})`} className={inputStyle} value={(side === "current" ? current : proposed)[index]} onChange={event => changeCost(side, index, event.target.value)} placeholder="Unknown" /></label>)}</fieldset>)}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">Enter 0 only when confirmed free or already included elsewhere. Avoid counting a charge twice. Blank or invalid amounts keep the comparison incomplete.</p>
          <label className="mt-5 flex min-h-11 items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-teal-700" checked={equivalent} onChange={event => setEquivalent(event.target.checked)}/>Both quotes use the same currency, product specifications, quantities and delivery destination.</label>
          <div role="status" aria-live="polite" className="mt-4 rounded-lg bg-secondary/10 p-4 text-sm leading-6">
            {result ? <><p>Current supplier: <strong>{money(result.currentTotal)}</strong></p><p>Classic Visions: <strong>{money(result.proposedTotal)}</strong></p><p className="mt-2 font-semibold">{result.difference > 0 ? `Classic Visions is ${money(result.difference)} lower for this basket.` : result.difference < 0 ? `Classic Visions is ${money(-result.difference)} higher for this basket.` : "Both totals are equal."}</p><p>Based on your entries, not a guaranteed saving. Also compare delivery dates, warranty and remake terms.</p></> : "Complete every cost and confirm the quotes are comparable to see a result."}
          </div>
          <button type="button" className={`${linkStyle} mt-3 border`} onClick={() => { setCurrent(blankCosts()); setProposed(blankCosts()); setEquivalent(false); }}>Clear comparison</button>
        </div>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {[
          ["Who pays import charges?", "Ask your quote to state which freight, insurance, customs, tax, brokerage and local delivery charges are included, and which you must pay separately."],
          ["Can orders travel together?", "Ask whether your orders can be consolidated and how that affects dispatch dates and freight. Availability and savings depend on the actual shipment."],
          ["What if something is delayed or wrong?", "Use order tracking for progress and contact customer service with your reference. Review returns and replacement terms before placing your order."],
        ].map(([question, answer]) => <details key={question} className="rounded-xl border bg-card p-5"><summary className="cursor-pointer font-semibold">{question}</summary><p className="mt-3 text-sm leading-6 text-muted-foreground">{answer}</p></details>)}
      </div>
      <Link className={`${linkStyle} mt-4 text-secondary`} to="/professionals/returns-replacements">Read returns & replacement terms <ArrowUpRight className="h-4 w-4"/></Link>
    </div>
  </section>;
}

export function RelationshipJourney() {
  return <section id="why-classic" className="scroll-mt-24 bg-background py-14" aria-labelledby="relationship-heading"><div className="container mx-auto px-5 sm:px-8">
    <p className="text-xs font-semibold uppercase tracking-[.2em] text-secondary">From first enquiry to your next order</p>
    <h2 id="relationship-heading" className="mt-3 max-w-3xl font-serif text-3xl sm:text-4xl">Caribbean optical supply, with a person to help.</h2>
    <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">Classic Visions is a Barbados-based wholesale optical laboratory. Explore lens options, request a price list and speak with the team before you decide. Already a customer? Keep using your account; ask us to help connect your online access.</p>
    <div className="mt-7 grid gap-4 md:grid-cols-3">{[
      ["Understand your options", "Explore prescriptions, materials, coatings and lab services, with practical guides to help you specify an order.", "/rx-lab-services", "Explore lab services"],
      ["Check the complete offer", "Compare a written quote, delivery expectations and remake terms against what you buy today.", "#shipping", "Plan costs & delivery"],
      ["Reach the real business", "Our laboratory is in Barbados. Call the office to verify an introduction or get help using the website.", "/professionals/customer-service", "Contact the office"],
    ].map(([title, detail, href, label]) => <div key={title} className="rounded-xl border bg-card p-6"><CheckCircle2 className="h-5 w-5 text-secondary" aria-hidden="true"/><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p><a className={`${linkStyle} mt-3 pl-0 text-secondary`} href={href}>{label} <ArrowUpRight className="h-4 w-4"/></a></div>)}</div>
    <div id="account-journey" className="mt-10 scroll-mt-24 rounded-2xl bg-surface-deep p-6 text-surface-deep-foreground sm:p-8">
      <h3 className="font-serif text-2xl">Start with an account. Build a working relationship.</h3><p className="mt-3 max-w-3xl text-sm leading-6 text-surface-deep-foreground/80">Trade access and credit approval are separate. An online application starts a review; it does not automatically open a credit facility.</p>
      <ol className="mt-6 grid gap-6 md:grid-cols-4">{[
        ["Apply & verify", "Submit your business and contact details. The team confirms your account, access and pricing."],
        ["Choose your payment path", "Pay in full before production, or provide at least two supplier credit references for verification. A third reference is optional."],
        ["Confirm credit or a starter limit", "Credit follows satisfactory reference checks and confirmation of your terms. New businesses without references can request an individually agreed starter limit."],
        ["Manage your account", "Use available statements and order history. Ask the office to confirm your approved limit, available credit, due dates or any hold."],
      ].map(([title, detail], index) => <li key={title}><span className="text-sm font-semibold text-accent">0{index + 1}</span><h4 className="mt-2 font-semibold">{title}</h4><p className="mt-2 text-sm leading-6 text-surface-deep-foreground/75">{detail}</p></li>)}</ol>
      <p className="mt-6 border-t border-white/15 pt-4 text-sm text-surface-deep-foreground/80">With a starter limit, you may order up to the agreed amount; payment is required before further work once that limit is reached. Limits and payment due dates must be confirmed in writing. A statement balance is not an available-credit figure. Online requests can be made at any time; staff responses and order processing follow office hours.</p>
      <div className="mt-5 flex flex-wrap gap-3"><Link className={`${linkStyle} bg-accent text-accent-foreground`} to="/professionals/trade-account">Start my application</Link><Link className={`${linkStyle} border border-white/30`} to="/profile/account">Continue account setup</Link><Link className={`${linkStyle} border border-white/30`} to="/profile/statements">View my statements</Link></div>
    </div>
  </div></section>;
}
