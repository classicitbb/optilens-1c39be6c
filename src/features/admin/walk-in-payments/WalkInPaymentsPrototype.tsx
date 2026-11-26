// Throwaway design bench: three layouts on the existing route, sample data only.
import { useEffect, useRef, useState } from "react";
import { Banknote, Check, ChevronLeft, ChevronRight, CreditCard, FileText, Grid2X2, Link2, Mail, Plus, ReceiptText, Search, ShieldCheck, X } from "lucide-react";
import "./walk-in-payments-prototype.css";

type Entry = { id: string; name: string; email: string; amount: number; reference: string; state: "Draft" | "Awaiting payment" | "Paid" | "Expired"; method: string; delivery: string; date: string };
const initial: Entry[] = [
  { id: "DEMO-1048", name: "Harbour Optical", email: "accounts@harbour.example", amount: 340, reference: "Order 10482", state: "Awaiting payment", method: "Email request", delivery: "Delivered", date: "2026-11-26" },
  { id: "DEMO-1047", name: "Morgan James", email: "morgan@example.com", amount: 125, reference: "Frame deposit", state: "Draft", method: "Email request", delivery: "Not sent", date: "2026-11-26" },
  { id: "DEMO-1046", name: "Bay Street Eyecare", email: "office@baystreet.example", amount: 580, reference: "Order 10465", state: "Paid", method: "Card", delivery: "Receipt delivered", date: "2026-11-26" },
  { id: "DEMO-1045", name: "Alex Clarke", email: "alex@example.com", amount: 90, reference: "Lens collection", state: "Paid", method: "Cash", delivery: "Receipt failed", date: "2026-11-26" },
  { id: "DEMO-1044", name: "West Coast Vision", email: "office@westcoast.example", amount: 215, reference: "Order 10431", state: "Awaiting payment", method: "Email request", delivery: "Send failed", date: "2026-11-25" },
  { id: "DEMO-1043", name: "Jordan Ellis", email: "jordan@example.com", amount: 160, reference: "Order 10420", state: "Expired", method: "Payment link", delivery: "Link expired", date: "2026-11-24" },
];
const empty = { name: "", email: "", amount: "", reference: "", reason: "" };
const money = (n: number) => new Intl.NumberFormat("en-BB", { style: "currency", currency: "BBD" }).format(n);
const variants = ["Workspace", "Register first", "Task focus"];

export default function WalkInPaymentsPrototype() {
  const [variant, setVariant] = useState(() => Math.max(0, ["A", "B", "C"].indexOf(new URLSearchParams(location.search).get("variant") || "A")));
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState("All activity");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("all");
  const [form, setForm] = useState(empty);
  const [method, setMethod] = useState("Email request");
  const [composerOpen, setComposerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Entry | null>(null);
  const [customerPreview, setCustomerPreview] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const composerDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const popup = composerDialog.current;
    if (variant === 1 && composerOpen && !popup?.open) popup?.showModal();
    else if (popup?.open) popup.close();
  }, [composerOpen, variant]);
  const formRef = useRef<HTMLFormElement>(null);
  const changeVariant = (n: number) => { const next = (n + 3) % 3; setVariant(next); setComposerOpen(false); const url = new URL(location.href); url.searchParams.set("variant", ["A", "B", "C"][next]); history.replaceState(null, "", url); };
  useEffect(() => { const key = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.closest("input,textarea,select,button,[contenteditable],dialog")) return; if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); changeVariant(variant + (e.key === "ArrowRight" ? 1 : -1)); } }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [variant]);
  const visible = rows.filter(r => (tab === "All activity" || (tab === "Drafts" ? r.state === "Draft" : tab === "Requests" ? r.state === "Awaiting payment" || r.state === "Expired" : r.state === "Paid")) && (date === "all" || r.date === "2026-11-26") && `${r.name} ${r.reference} ${r.id}`.toLowerCase().includes(search.toLowerCase()));
  const paid = rows.filter(r => r.state === "Paid");
  const showDetails = (r: Entry, customer = false) => { setSelected(r); setCustomerPreview(customer); dialog.current?.showModal(); };
  const resume = (r: Entry) => { setEditingId(r.id); setForm({ name: r.name, email: r.email, amount: String(r.amount), reference: r.reference, reason: "" }); setMethod(r.method); setComposerOpen(true); setNotice(`Editing draft ${r.id}.`); window.setTimeout(() => document.getElementById("payment-name")?.focus(), 0); };
  const save = (draft: boolean) => {
    if (!draft && !formRef.current?.reportValidity()) return;
    if (draft && !form.name.trim()) { setNotice("Add a customer name to save a draft."); document.getElementById("payment-name")?.focus(); return; }
    const row: Entry = { id: editingId || `DEMO-${1050 + rows.length}`, name: form.name.trim(), email: form.email, amount: Number(form.amount) || 0, reference: form.reference, method, state: draft ? "Draft" : method === "Cash" || method === "Card now" ? "Paid" : "Awaiting payment", delivery: draft ? "Not sent" : method === "Email request" ? "Queued (demo)" : method === "Payment link" ? "Link ready (demo)" : "Receipt ready (demo)", date: "2026-11-26" };
    setRows(current => editingId ? current.map(r => r.id === editingId ? row : r) : [row, ...current]); setForm(empty); setEditingId(null); setTab(draft ? "Drafts" : row.state === "Paid" ? "Receipts" : "Requests"); setNotice(draft ? "Draft saved for this preview session. No request sent." : "Demo updated. No email sent, no money taken, and no real payment recorded.");
    composerDialog.current?.close();
    setComposerOpen(false);
    if (!draft) showDetails(row, method === "Email request" || method === "Payment link");
  };
  const composer = <section className="wp-compose" aria-labelledby="compose-title"><div className="wp-section-heading"><div><h2 id="compose-title">{editingId ? "Edit draft" : "New payment"}</h2><p>Prepare first. Collect when ready.</p></div><span className="wp-currency">BBD</span></div>
    <form ref={formRef} onSubmit={e => { e.preventDefault(); save(false); }}>
      <div className="wp-form-grid"><label className="wp-wide" htmlFor="payment-name">Customer <span>required</span><input id="payment-name" autoComplete="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Customer or company name" /></label>
      <label htmlFor="payment-amount">Amount <span>required</span><input id="payment-amount" type="number" inputMode="decimal" min="0.01" max="999999.99" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></label>
      <label htmlFor="payment-ref">Order / reference<input id="payment-ref" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Optional" /></label>
      <label className="wp-wide" htmlFor="payment-email">Customer email <span>{method === "Email request" ? "required" : "for receipt"}</span><input id="payment-email" type="email" autoComplete="email" required={method === "Email request"} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="customer@example.com" /></label></div>
      <details className="wp-more"><summary>More details <span>Reason, contact & expiry</span></summary><label htmlFor="payment-reason">Reason<textarea id="payment-reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="What is this payment for?" /></label><label htmlFor="payment-contact">Linked contact<select id="payment-contact"><option>None selected</option><option>Sample optical account</option></select></label><label htmlFor="payment-expiry">Link valid for<select id="payment-expiry"><option>3 days</option><option>24 hours</option><option>7 days</option></select></label></details>
      <fieldset className="wp-methods"><legend>How will they pay?</legend>{[{ name: "Email request", icon: Mail }, { name: "Payment link", icon: Link2 }, { name: "Card now", icon: CreditCard }, { name: "Cash", icon: Banknote }].map(({ name, icon: Icon }) => <label key={name} className={method === name ? "chosen" : ""}><input type="radio" name="method" value={name} checked={method === name} onChange={() => setMethod(name)} /><Icon size={16} />{name}</label>)}</fieldset>
      <p className="wp-method-help">{method === "Email request" ? "A private link goes to their email. No account or counter code needed." : method === "Payment link" ? "Share a private link. Counter codes are available only for in-person collection." : method === "Card now" ? "Continue to Scotia’s secure card page on this device." : "Record cash only after you have received it."}</p>
      <div className="wp-form-actions"><button type="button" onClick={() => save(true)}><FileText size={15} />Save draft</button><button className="primary" type="submit">{method === "Email request" ? "Review request" : method === "Payment link" ? "Preview link" : method === "Cash" ? "Preview cash receipt" : "Preview card payment"}<ChevronRight size={15} /></button></div>
      <p className="wp-secure"><ShieldCheck size={13} />Card details stay on Scotia’s secure page.</p>
    </form></section>;
  const register = <section className="wp-register" aria-labelledby="register-title"><div className="wp-section-heading"><div><h2 id="register-title">Payment register</h2><p>Requests, collection and receipts in one place.</p></div></div>
    <nav className="wp-tabs" aria-label="Payment views">{["All activity", "Drafts", "Requests", "Receipts"].map(t => <button key={t} aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}>{t}<span>{rows.filter(r => t === "All activity" || (t === "Drafts" ? r.state === "Draft" : t === "Requests" ? r.state === "Awaiting payment" || r.state === "Expired" : r.state === "Paid")).length}</span></button>)}</nav>
    <div className="wp-filters"><label className="wp-search"><Search size={15} /><span className="sr-only">Search payments</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Customer, reference or receipt" /></label><label><span className="sr-only">Date range</span><select value={date} onChange={e => setDate(e.target.value)}><option value="all">All dates</option><option value="today">Today</option></select></label></div>
    <div className="wp-table-scroll" role="region" aria-label="Payment register results" tabIndex={0}><table><thead><tr><th scope="col">Customer / reference</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col">Delivery</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead><tbody>{visible.map(r => <tr key={r.id}><th scope="row"><strong>{r.name}</strong><small>{r.reference || r.id}<span>{r.date.slice(5).replace("-", "/")} · {r.method}</span></small></th><td className="wp-amount">{money(r.amount)}</td><td><span className={`wp-badge ${r.state === "Paid" ? "paid" : r.state === "Draft" ? "draft" : r.state === "Expired" ? "expired" : "pending"}`}>{r.state}</span></td><td><span className={r.delivery.includes("failed") ? "wp-failed" : "wp-delivery"}>{r.delivery}</span></td><td><button className="wp-row-action" onClick={() => r.state === "Draft" ? resume(r) : showDetails(r)}>{r.state === "Draft" ? "Continue" : r.state === "Paid" ? "Receipt" : "Details"}<ChevronRight size={14} /></button></td></tr>)}</tbody></table>{!visible.length && <p className="wp-empty">No payments match these filters.</p>}</div>
    <div className="wp-register-footer"><span>{visible.length} payments shown</span><span>{tab === "Receipts" ? `Received ${money(visible.reduce((sum, r) => sum + r.amount, 0))}` : "Drafts never count as money received"}</span></div>
    <div className="wp-attention"><Mail size={16} /><div><strong>2 emails need attention</strong><p>One request and one receipt failed. Payment status stays separate.</p></div><button onClick={() => { setTab("All activity"); setSearch("Alex"); setDate("all"); setNotice("Showing a failed receipt example. Open Receipt to review delivery details."); }}>Review</button></div>
  </section>;
  return <div className="wp-prototype"><header className="wp-topbar"><Grid2X2 size={18} /><strong>OpticAdmin</strong><span className="wp-crumb">Finance <ChevronRight size={12} /> Walk-in payments</span><span className="wp-top-right">Design review <span className="wp-avatar">CV</span></span></header><aside className="wp-rail" aria-label="Finance workspace"><Grid2X2 size={19} /><FileText size={19} /><CreditCard size={19} /><span className="wp-rail-active"><ReceiptText size={20} /></span><Banknote size={19} /></aside>
    <main className={`wp-main variant-${variant}`}><div className="wp-preview-banner"><span><strong>Interactive design preview</strong> · Sample payments only. Changes reset on reload.</span><button onClick={() => { setRows(initial); setForm(empty); setEditingId(null); setSearch(""); setDate("all"); setTab("All activity"); setComposerOpen(false); setNotice("Sample data reset."); }}>Reset demo</button></div>
    <div className="wp-page-heading"><div><h1>Walk-in payments</h1><p>Prepare a payment, collect it, and keep the receipt.</p></div><button className="primary" onClick={() => { if (variant === 1) setComposerOpen(true); setForm(empty); setEditingId(null); window.setTimeout(() => document.getElementById("payment-name")?.focus(), 0); }}><Plus size={16} />New payment</button></div>
    <div className="wp-summary"><span><i className="wp-dot green" />Received today <strong>{money(paid.reduce((s, r) => s + r.amount, 0))}</strong><small>{paid.length} payments</small></span><span><i className="wp-dot teal" />Awaiting payment <strong>{money(rows.filter(r => r.state === "Awaiting payment").reduce((s, r) => s + r.amount, 0))}</strong></span><span><FileText size={14} />Drafts <strong>{rows.filter(r => r.state === "Draft").length}</strong></span></div>
    <div className="wp-notice" role="status">{notice}</div>
    <div className="wp-workspace">{variant !== 1 && composer}{register}</div>
    <dialog ref={composerDialog} className="wp-compose-popup" aria-labelledby="compose-title" onCancel={() => setComposerOpen(false)} onClose={() => setComposerOpen(false)}>
      {variant === 1 && <><button className="wp-popup-close" aria-label="Close new payment" onClick={() => setComposerOpen(false)}><X size={18} /></button>{composer}</>}
    </dialog>
    <p className="wp-design-caption">{variant === 0 ? "A · Workspace: prepare and track side by side." : variant === 1 ? "B · Register first: history leads; New payment opens a popup." : "C · Task focus: one compact payment form above the register."}</p>
    </main>
    <div className="wp-switcher"><button aria-label="Previous design" onClick={() => changeVariant(variant - 1)}><ChevronLeft size={18} /></button><span><small>Compare layouts</small><strong>{["A", "B", "C"][variant]} · {variants[variant]}</strong></span><button aria-label="Next design" onClick={() => changeVariant(variant + 1)}><ChevronRight size={18} /></button></div>
    <dialog ref={dialog} className="wp-dialog" aria-labelledby="wp-dialog-title"><div className="wp-dialog-head"><span>Sample {customerPreview ? "customer experience" : "payment details"}</span><button aria-label="Close preview" onClick={() => dialog.current?.close()}><X size={18} /></button></div>{selected && <><h2 id="wp-dialog-title">{customerPreview ? "Pay Classic Visions" : selected.state === "Paid" ? "Payment receipt" : "Payment request"}</h2><p className="wp-dialog-amount">{money(selected.amount)}</p><p>{selected.name} · {selected.reference}</p><div className="wp-dialog-facts"><span>Payment status<strong>{selected.state}</strong></span><span>Method<strong>{selected.method}</strong></span><span>{selected.state === "Paid" ? "Receipt delivery" : "Request delivery"}<strong>{selected.delivery}</strong></span><span>Reference<strong>{selected.id}</strong></span></div>{customerPreview ? <><p className="wp-customer-note"><ShieldCheck size={18} />Your private payment link opens this amount directly. No sign-in or counter code.</p><button className="primary" onClick={() => setNotice("Customer handoff preview only. No gateway opened or payment taken.")}>Continue to secure payment</button><p className="wp-method-help">Proposed customer flow. Scotia collects card details.</p></> : <><p className="wp-method-help">{selected.delivery.includes("failed") ? "The email failed. The payment record remains intact. Retry sends the email only." : "Delivery and payment are tracked independently. A sent email does not mean a paid request."}</p><button onClick={() => { const delivery = selected.state === "Paid" ? "Receipt queued (demo)" : "Queued (demo)"; setRows(current => current.map(r => r.id === selected.id ? { ...r, delivery } : r)); setSelected({ ...selected, delivery }); setNotice("Demo retry queued. No email sent."); }}><Mail size={15} />{selected.state === "Paid" ? "Retry receipt email" : "Retry request email"}</button>{selected.state !== "Paid" && <button onClick={() => setCustomerPreview(true)}>Preview customer page</button>}</>}<p className="wp-demo-foot">Design preview only. No real email, link or transaction.</p></>}</dialog>
  </div>;
}
