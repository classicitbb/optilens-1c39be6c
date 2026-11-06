import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, ArrowRight, Check, Clock3, Mail, Search, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { parseContactEmails } from "@/lib/contactEmails";
import { useCreateActivity, useStaffDirectory } from "./hooks/useActivities";
import { useJourneyDraft, useOutreachContacts, useOutreachPlan, useOutreachQueue, useSaveJourneyDraft, useSaveOutreachPlan, type OutreachContact, type OutreachPlan } from "./hooks/useOutreachJourney";
import { ALL_STAGES, CRM_PIPELINES, useClassifyContact, type PipelineStageKey, type PipelineKey } from "./hooks/usePipeline";
import { JOURNEY_STEPS, nextJourneyStep, OUTREACH_PRACTICE_TITLE, outreachHandoff, outreachLink, formatOutreachPlan, readOutreachPlan, practiceScenario } from "./outreachJourney";
import type { OutboxDraft } from "./hooks/useCadences";
import { useEmailStatus } from "@/features/admin/email/useEmail";
import { ContactEmailHistory } from "@/features/admin/email/ContactEmailHistory";
import { EMPTY_DRAFT, type ComposeDraft } from "@/features/admin/email/format";
import { checkOutreachDraft } from "../../../../supabase/functions/_shared/crm/outreachGate";
import "./outreachWorkspace.css";
import { OutreachConfirmButton } from "./OutreachConfirmButton";

const ComposeDialog = lazy(() => import("@/features/admin/email/ComposeDialog").then((m) => ({ default: m.ComposeDialog })));
type SentReceipt = { subject: string; text: string; to: string };
const localDateTime = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const defaultDue = () => localDateTime(new Date(Date.now() + 3 * 86400000));

export function OutreachWorkspace() {
  const [params, setParams] = useSearchParams();
  const contactId = params.get("contact") ?? "";
  const practice = params.get("practice") === "1";
  const [practiceMode, setPracticeMode] = useState(practice);
  const contacts = useOutreachContacts();
  const plan = useOutreachPlan(contactId, practice);
  const parsed = readOutreachPlan(plan.data?.content ?? null);
  const draft = useJourneyDraft(params.get("draft") || parsed.draftId);
  const contact = contacts.data?.find((c) => c.id === contactId);
  const [search, setSearch] = useState("");
  const [showCustomers, setShowCustomers] = useState(false);
  const queue = useOutreachQueue();
  const { data: staff = [] } = useStaffDirectory();
  const activePlans = queue.data ?? [];
  const term = search.trim().toLocaleLowerCase();
  const customerIds = new Set((contacts.data ?? []).filter((c) => c.is_customer || c.linked_customer_id != null || c.stage === "customer").map((c) => c.id));
  const filtered = (contacts.data ?? []).filter((c) =>
    (showCustomers || (!customerIds.has(c.id) && (!c.parent_id || !customerIds.has(c.parent_id)))) &&
    (!term || `${c.name} ${c.business_name ?? ""} ${c.city ?? ""} ${c.country ?? ""}`.toLocaleLowerCase().includes(term)));
  const pick = (id: string, rehearse = practiceMode) => { const next = new URLSearchParams(params); next.delete("draft"); next.set("contact", id); if (rehearse) next.set("practice", "1"); else next.delete("practice"); setParams(next); };
  const error = contacts.error || plan.error || draft.error || (draft.data && (draft.data.contact_id !== contactId || practice !== (draft.data.generated_by === "practice")) ? new Error("This draft belongs to a different contact or outreach mode. Open it from Outbox.") : null);

  return <div className="outreach-workspace space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight">Turn a contact into a customer</h1>
        <p className="mt-1 text-sm text-muted-foreground">One lead. One clear next step. You decide what goes out.</p></div>
      <Button variant="outline" asChild><Link to="/admin/crm/outbox"><Mail className="mr-2 h-4 w-4" />All outreach</Link></Button>
    </header>

    {!contactId ? <>
      {queue.error && <p role="alert" className="text-sm text-destructive">Your saved outreach queue could not load. <Button variant="link" onClick={() => void queue.refetch()}>Try again</Button></p>}
      {activePlans.length > 0 && <section className="outreach-resume">
        <h2 className="mb-3 text-base font-semibold">Pick up where you left off</h2>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{activePlans.slice(0, 6).map((a) => <button type="button" key={a.id} className="outreach-resume-item" onClick={() => pick(a.contact_id!, a.activity_type === OUTREACH_PRACTICE_TITLE)}>
          <span className="font-medium">{(a.activity_type === OUTREACH_PRACTICE_TITLE && practiceScenario(readOutreachPlan(a.content).brief)) || a.contact?.business_name || a.contact?.name || "Open contact"}</span>
          <span className="text-xs text-muted-foreground">{staff.find((s) => s.user_id === a.owner_id)?.name || "Unassigned"} · {a.status === "waiting" ? "Awaiting reply" : "Next action"}{a.due_at ? ` · ${new Date(a.due_at).toLocaleDateString()}` : ""}</span>
          {a.due_at && new Date(a.due_at) < new Date() && <Badge variant="destructive" className="w-fit">Due now</Badge>}
          {a.activity_type === OUTREACH_PRACTICE_TITLE && <Badge variant="outline">Practice</Badge>}
        </button>)}</div>
      </section>}
      <section className="outreach-picker">
        <div className="outreach-picker-intro"><span className="outreach-step-number">1</span><div><h2 className="text-lg font-semibold">Who would you like to win over?</h2><p className="mt-1 text-sm text-muted-foreground">Start with a saved contact. We’ll guide you from the first email to the next conversation.</p></div></div>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search contacts for outreach" className="h-11 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search a name, company or country" /></div>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={showCustomers} onChange={(e) => setShowCustomers(e.target.checked)} />Include existing customers</label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={practiceMode} onChange={(e) => setPracticeMode(e.target.checked)} />Practice without sending</label>
          <Button variant="outline" asChild><Link to="/admin/crm/leads/finder">Find new leads</Link></Button>
        </div>
        <div className="divide-y">{filtered.slice(0, 40).map((c) => <div className="flex flex-wrap items-center gap-3 px-5 py-4" key={c.id}>
          <div className="outreach-contact-icon"><UserRound className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="font-medium">{c.business_name || c.name}</p><p className="break-words text-sm text-muted-foreground">{[c.business_name && c.name !== c.business_name ? c.name : null, c.city, c.country].filter(Boolean).join(" · ") || "Location not recorded"}</p></div>
          <Badge variant="outline">{parseContactEmails(c.email ?? "").length ? "Email available" : "Needs email"}</Badge>
          <Button variant="outline" onClick={() => pick(c.id)} aria-label={`Start outreach for ${c.business_name || c.name}`}>Start outreach<ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>)}</div>
        {contacts.isLoading && <p className="p-5" role="status">Loading contacts…</p>}
        {!contacts.isLoading && filtered.length === 0 && <div className="p-6"><p>No contacts match this view.</p><Link className="mt-2 inline-block underline" to="/admin/crm/contacts">Add or update a contact</Link></div>}
        {filtered.length > 40 && <p className="border-t p-4 text-sm text-muted-foreground">Showing 40 of {filtered.length} matches. Search to narrow the list.</p>}
      </section>
      <div className="outreach-roadmap">{JOURNEY_STEPS.slice(1).map((label, i) => <div key={label}><span>{i + 2}</span><p>{label}</p></div>)}</div>
    </> : contacts.isLoading || plan.isLoading || draft.isLoading ? <p role="status">Loading this outreach…</p>
      : contact && !error ? <OutreachWizard key={`${contact.id}:${practice}:${plan.data?.id ?? "new"}`} practice={practice} contact={contact} plan={plan.data ?? null} initialDraft={draft.data ?? null} onBack={() => { const next = new URLSearchParams(params); next.delete("contact"); next.delete("draft"); setParams(next); }} />
        : !error && <p role="alert">This contact is archived or unavailable. <Link to="/admin/crm/dashboard" className="underline">Choose another contact</Link>.</p>}
    {error && <div role="alert" className="outreach-error">Unable to load outreach. {error.message} <Button variant="outline" onClick={() => { void contacts.refetch(); void plan.refetch(); void draft.refetch(); }}>Try again</Button></div>}
  </div>;
}

function OutreachWizard({ contact, plan, initialDraft, onBack, practice }: { contact: OutreachContact; plan: OutreachPlan | null; initialDraft: OutboxDraft | null; onBack: () => void; practice: boolean }) {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { canEdit, isAdmin } = useAdminRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: staff = [], error: staffError } = useStaffDirectory();
  const parsed = readOutreachPlan(plan?.content ?? null);
  const [step, setStep] = useState(nextJourneyStep(plan, initialDraft));
  const [brief, setBrief] = useState(parsed.brief);
  const displayName = (practice && practiceScenario(brief)) || contact.business_name || contact.name;
  const [owner, setOwner] = useState(plan?.owner_id ?? user?.id ?? "");
  const [due, setDue] = useState(plan?.due_at ? localDateTime(new Date(plan.due_at)) : defaultDue);
  const [draft, setDraft] = useState(initialDraft);
  const [subject, setSubject] = useState(initialDraft?.subject ?? "");
  const [body, setBody] = useState(initialDraft?.body ?? "");
  const [recipient, setRecipient] = useState(parsed.recipient ?? parseContactEmails(contact.email ?? "")[0] ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [receipt, setReceipt] = useState<SentReceipt | null>(null);
  const [practiceSent, setPracticeSent] = useState(false);
  const [practiceDone, setPracticeDone] = useState(false);
  const [compose, setCompose] = useState<ComposeDraft | null>(null);
  const [reply, setReply] = useState("");
  const [outcome, setOutcome] = useState<PipelineStageKey>("engaged");
  const [market, setMarket] = useState<PipelineKey>((contact.pipeline as PipelineKey) || "opticals");
  const savePlanMutation = useSaveOutreachPlan();
  const saveDraftMutation = useSaveJourneyDraft();
  const createActivity = useCreateActivity();
  const classify = useClassifyContact();
  const mailbox = useEmailStatus();
  const accounts = (mailbox.data?.accounts ?? []).filter((a) => a.isEnabled && a.canSend);
  const isSent = draft?.status === "sent" || !!receipt || practiceSent;
  const dirty = brief !== parsed.brief || owner !== (plan?.owner_id ?? user?.id ?? "") ||
    due !== (plan?.due_at ? localDateTime(new Date(plan.due_at)) : due) || subject !== (draft?.subject ?? "") || body !== (draft?.body ?? "");
  const gate = checkOutreachDraft({ subject, body }, "email");
  const heading = useRef<HTMLHeadingElement>(null);
  const savedRef = useRef<OutreachPlan | null>(plan);
  const outcomeNoteId = useRef<string | null>(null);
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    if (!dirty && !receipt) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, receipt]);

  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const validatePlan = () => {
    if (!canEdit || !user) throw new Error("You need CRM edit access to save outreach.");
    if (!brief.trim() || !owner || !due || Number.isNaN(new Date(due).getTime())) throw new Error("Add a brief, choose an owner and set the next-action date.");
  };
  const savePlan = async (status = savedRef.current?.status ?? "planned", draftId = draft?.id, sentTo = recipient) => {
    validatePlan();
    const result = await savePlanMutation.mutateAsync({ id: savedRef.current?.id, contactId: contact.id,
      content: formatOutreachPlan(brief, draftId, sentTo), ownerId: owner, dueAt: new Date(due).toISOString(), status, createdBy: user!.id, expectedUpdatedAt: savedRef.current?.updated_at, practice });
    savedRef.current = result;
    if (params.has("draft")) { const next = new URLSearchParams(params); next.delete("draft"); setParams(next, { replace: true }); }
    return result;
  };
  const saveEmail = async (status: "draft" | "approved") => {
    if (status === "approved" && (!subject.trim() || !body.trim())) throw new Error("Add an email subject and message.");
    if (status === "approved" && !gate.ok) throw new Error("Resolve the draft quality warnings before approval.");
    const saved = await saveDraftMutation.mutateAsync({ id: draft?.id, contactId: contact.id, subject, body, status, practice });
    setDraft(saved); // Retain the exact id even if linking the plan fails; retry updates it.
    await savePlan("planned", saved.id);
    toast({ title: status === "approved" ? "Email approved. You can now choose how to send it." : "Email draft saved" });
    return saved;
  };
  const recordSent = async (sent?: SentReceipt) => {
    if (practice) throw new Error("Practice mode does not send or record real sends.");
    const actual = sent ?? receipt ?? { subject, text: body, to: recipient };
    if (!draft) throw new Error("Save and approve this email first.");
    // Once delivery is confirmed, a CRM failure must never invite another send.
    setReceipt(actual);
    const saved = await saveDraftMutation.mutateAsync({ id: draft.id, contactId: contact.id, subject: actual.subject, body: actual.text, status: "sent" });
    setDraft(saved); setSubject(saved.subject ?? ""); setBody(saved.body ?? "");
    await savePlan("waiting", saved.id, actual.to); setRecipient(actual.to);
    setReceipt(null); setStep(3);
    toast({ title: "Send recorded. Your follow-up is in Activities." });
  };
  const copyHandoff = async () => {
    await navigator.clipboard.writeText(outreachHandoff(displayName, brief, subject, body, `${window.location.origin}${outreachLink(contact.id, practice)}`));
    toast({ title: "Brief copied for your colleague or AI assistant" });
  };
  const askIris = async () => {
    if (brief.trim() && canEdit) {
      await savePlan();
      if ((subject.trim() || body.trim()) && !isSent) await saveEmail("draft");
    }
    navigate("/admin/copilot", { state: { outreachCommand: outreachHandoff(displayName, `${practice ? "Practice only. Do not send or change customer stages.\n" : ""}${brief}`, subject, body, `${window.location.origin}${outreachLink(contact.id, practice)}`) } });
  };

  return <div className="space-y-4">
    {practice && <div className="outreach-brief-summary flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Practice mode: nothing will be sent</h2><p className="mt-1 text-sm">Rehearse with this saved brief and draft. Send, reply and customer outcomes are simulated; the contact’s real pipeline stays unchanged.</p></div><Button variant="outline" disabled={busy} onClick={() => { setPracticeSent(false); setPracticeDone(false); setReply(""); setDraft(initialDraft); setSubject(initialDraft?.subject ?? ""); setBody(initialDraft?.body ?? ""); setBrief(parsed.brief); setStep(1); toast({ title: "Practice reset. Your saved brief and draft are ready to reuse." }); }}>Reset practice</Button></div>}
    <div className="flex flex-wrap items-center justify-between gap-2">{dirty ? <OutreachConfirmButton variant="ghost" disabled={busy || !!receipt} title="Leave this outreach?" description="Your unsaved edits will be lost. Go back and save the brief or draft to keep them." confirmLabel="Discard edits & leave" onConfirm={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Choose another contact</OutreachConfirmButton> : <Button variant="ghost" onClick={onBack} disabled={busy || !!receipt}><ArrowLeft className="mr-2 h-4 w-4" />Choose another contact</Button>}<Badge variant="outline">{dirty ? "Unsaved changes" : plan ? "Saved in CRM" : "Not saved yet"}</Badge></div>
    <nav aria-label="Outreach steps"><ol className="outreach-steps">{JOURNEY_STEPS.map((label, i) => <li key={label}><button type="button" aria-current={step === i ? "step" : undefined} disabled={i === 0 || (i > 1 && !plan) || (i > 2 && !isSent) || (plan?.status === "cancelled" && i !== 4) || busy || !!receipt} onClick={() => setStep(i)}><span>{i < step ? <Check className="h-4 w-4" /> : i + 1}</span>{label}</button></li>)}</ol></nav>
    <div className="outreach-work-area">
      <section className="outreach-main">
        <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">{JOURNEY_STEPS[step]}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{displayName}{!practice && contact.business_name && contact.name !== contact.business_name ? ` · ${contact.name}` : ""}</p>
        {!canEdit && <p role="status" className="mt-4 text-sm">You have read-only access. Ask a CRM editor to save or send outreach.</p>}
        <fieldset disabled={!canEdit || busy || !!receipt} className="mt-6 min-w-0 space-y-5">
          {step === 1 && <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void run(async () => { await savePlan(); setStep(2); }); }}>
            <p className="text-sm">Decide why this contact is a fit and what a useful first conversation would achieve. Save the brief to take the next step or hand the work to someone else.</p>
            <div className="space-y-2"><Label htmlFor="outreach-brief">Outreach brief *</Label><Textarea id="outreach-brief" name="brief" required rows={7} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Why this business? What do we know about their needs? What can we offer? What one response would move this forward?" /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="outreach-owner">Who owns the next step? *</Label><select id="outreach-owner" className="outreach-select" value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">Choose a colleague</option>{user && !staff.some((s) => s.user_id === user.id) && <option value={user.id}>Me</option>}{staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.name}{s.user_id === user?.id ? " (me)" : ""}</option>)}</select>{staffError && <p role="alert" className="text-sm text-destructive">Could not load colleagues. Try again after reloading.</p>}</div><DueField value={due} onChange={setDue} /></div>
            <Button type="submit">Save plan & write email<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </form>}
          {step === 2 && <>
            <details className="outreach-brief-summary"><summary className="cursor-pointer text-sm font-semibold">Your saved brief</summary><p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{brief}</p><Button variant="link" className="mt-2 h-auto p-0" onClick={() => setStep(1)}>Edit brief or delegate</Button></details>
            <div className="space-y-2"><Label htmlFor="outreach-to">Recipient</Label><select id="outreach-to" className="outreach-select" value={recipient} onChange={(e) => setRecipient(e.target.value)}><option value="">Choose an email address</option>{parseContactEmails(contact.email ?? "").map((email) => <option key={email} value={email}>{email}</option>)}</select>{!recipient && <p className="text-sm text-destructive">Add an email in the contact record before sending.</p>}</div>
            <div className="space-y-2"><Label htmlFor="outreach-subject">Subject *</Label><Input id="outreach-subject" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={isSent} /></div>
            <div className="space-y-2"><Label htmlFor="outreach-message">Email message *</Label><Textarea id="outreach-message" rows={12} value={body} onChange={(e) => setBody(e.target.value)} disabled={isSent} placeholder="Write a short, relevant introduction. Explain why you’re reaching out, then ask one easy question." /></div>
            {body && !gate.ok && <div className="outreach-warnings"><p className="mb-2 font-medium">Before you approve</p><ul className="list-disc space-y-1 pl-5">{gate.reasons.map((r) => <li key={r}>{r}</li>)}</ul></div>}
            {isSent ? <Button onClick={() => setStep(3)}>View follow-up</Button> : <>
              <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void run(async () => { await saveEmail("draft"); })}>Save draft</Button><Button onClick={() => void run(async () => { await saveEmail("approved"); })}>Approve email</Button></div>
              {draft?.status === "approved" && subject === draft.subject && body === draft.body && (practice ? <div className="outreach-send-options"><h3 className="font-semibold">Approved for practice</h3><p className="mt-2 text-sm">This rehearsal does not open a mailbox or mark the email sent.</p><Button className="mt-3" onClick={() => { setPracticeSent(true); setStep(3); }}>Practise send & follow-up</Button></div> : <div className="outreach-send-options"><h3 className="font-semibold">Approved. Choose how to send.</h3><p className="mt-1 text-sm text-muted-foreground">Review your mailbox, recipient and signature in the composer. Send is always your decision.</p>
                <div className="mt-3 flex flex-wrap gap-2"><Button disabled={!recipient || !accounts.length} onClick={() => setCompose({ ...EMPTY_DRAFT, account: accounts[0]?.code ?? "", to: recipient, subject, text: body })}>Review in company email</Button><Button variant="outline" disabled={!recipient} onClick={() => { window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; }}>Open my email app</Button></div>
                {mailbox.isLoading ? <p className="mt-2 text-sm" role="status">Checking company mailboxes…</p> : !accounts.length && <p className="mt-2 text-sm text-muted-foreground">{mailbox.error ? "Company email is unavailable." : "No sending mailbox is connected."} Use your email app, or <Link to="/admin/email" className="underline">open Email</Link>.</p>}
                <OutreachConfirmButton className="mt-4" variant="outline" title="Have you sent this email?" description={`Confirm you actually sent “${subject}” to ${recipient} outside the CRM. This records the send and starts the follow-up reminder.`} confirmLabel="Yes, record the send" onConfirm={() => void run(async () => { await recordSent(); })}>I sent it outside the CRM</OutreachConfirmButton>
              </div>)}
            </>}
          </>}
          {step === 3 && <>
            <div className="outreach-brief-summary"><div className="flex items-center gap-2 font-medium"><Clock3 className="h-5 w-5" />{practice ? "Practice: waiting for a response" : "Waiting for a response"}</div><p className="mt-2 break-words text-sm"><strong>{draft?.subject}</strong><br />To: {recipient}</p><p className="mt-2 text-sm text-muted-foreground">{practice ? "No email was sent. Imagine your contact has received it, then practise recording a reply or choosing a follow-up date." : "Your email is recorded as sent. Check the conversation before following up. The date below is a reminder for the owner; it never sends another email automatically."}</p></div>
            <DueField value={due} onChange={setDue} /><Button variant="outline" onClick={() => void run(async () => { await savePlan("waiting"); toast({ title: "Follow-up date saved" }); })}>Save follow-up date</Button>
            <div className="border-t pt-4"><Button onClick={() => setStep(4)}>Record reply or decide next action<ArrowRight className="ml-2 h-4 w-4" /></Button></div>
            {practice && <Button variant="outline" onClick={() => { setReply("Practice reply: Thanks for getting in touch. Please send a short overview of your lens range before we arrange a call. Next action: prepare the overview for review."); setOutcome("presenting"); setStep(4); }}>Use a sample practice reply</Button>}
          </>}
          {step === 4 && <>
            {practiceDone || plan?.status === "completed" || plan?.status === "cancelled" ? <div className="outreach-brief-summary"><h3 className="font-semibold">{practice ? "Practice complete" : "This outreach is closed"}</h3><p className="mt-2 text-sm">{practice ? "Use Reset practice to run the same outreach again. No customer stage or email delivery changed." : "The brief and email remain in CRM. You can start a new conversation below."}</p></div> : <>
              <div className="space-y-2"><Label htmlFor="outreach-result">What happened, and what is the next action? *</Label><Textarea id="outreach-result" rows={5} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Record the reply or decision, what they need, and the agreed next step. If they asked you to stop, close this outreach." /></div>
              <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="outreach-stage">Move this contact to</Label><select id="outreach-stage" className="outreach-select" value={outcome} onChange={(e) => setOutcome(e.target.value as PipelineStageKey)}>{ALL_STAGES.filter((s) => s.key !== "target" && s.key !== "outreach").map((s) => <option value={s.key} key={s.key}>{s.title} — {s.hint}</option>)}</select></div><div className="space-y-2"><Label htmlFor="outreach-market">Pipeline</Label><select id="outreach-market" className="outreach-select" value={market} onChange={(e) => setMarket(e.target.value as PipelineKey)}>{CRM_PIPELINES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div></div>
              <DueField value={due} onChange={setDue} />
              {outcome === "customer" && <p className="text-sm text-muted-foreground">Customer records a won relationship in this pipeline. Account setup, credit and portal access remain separate actions in the contact record.</p>}
              <div className="flex flex-wrap gap-2"><Button onClick={() => void run(async () => {
                if (!reply.trim()) throw new Error("Record the reply or decision and next action first.");
                if (practice) { setPracticeDone(true); setReply(""); toast({ title: "Practice outcome complete. No real customer records changed." }); return; }
                validatePlan();
                // Save evidence first. Keep its id across retries so later failures cannot duplicate it.
                if (!outcomeNoteId.current) outcomeNoteId.current = await createActivity.mutateAsync({ activityType: "Outreach outcome", contactId: contact.id, content: reply, ownerId: owner, createdBy: user?.id, status: "completed", type: "note" });
                await classify.mutateAsync({ id: contact.id, pipeline: market, stage: outcome });
                const nextBrief = `${brief}\n\nLatest outcome and next action:\n${reply.trim()}`;
                const updated = await savePlanMutation.mutateAsync({ id: savedRef.current!.id, contactId: contact.id, content: formatOutreachPlan(nextBrief, draft?.id, recipient), ownerId: owner, dueAt: new Date(due).toISOString(), status: outcome === "customer" ? "completed" : "in_progress", createdBy: user!.id, expectedUpdatedAt: savedRef.current?.updated_at, practice });
                savedRef.current = updated; setBrief(nextBrief);
                setReply(""); outcomeNoteId.current = null;
                toast({ title: outcome === "customer" ? "Customer won. Outreach completed." : "Outcome saved. Your next action is in Activities." });
              })}>Save outcome & next action</Button><Button variant="outline" onClick={() => void run(async () => {
                if (!reply.trim()) throw new Error("Record why you are closing this outreach first.");
                if (practice) { setPracticeDone(true); setReply(""); return; }
                validatePlan();
                if (!outcomeNoteId.current) outcomeNoteId.current = await createActivity.mutateAsync({ activityType: "Outreach closed", contactId: contact.id, content: reply, ownerId: owner, createdBy: user?.id, status: "completed", type: "note" });
                await savePlan("cancelled"); setReply(""); outcomeNoteId.current = null; toast({ title: "Outreach closed. No further email is scheduled." });
              })}>Close outreach</Button></div>
            </>}
            {plan?.status !== "cancelled" && <Button variant="outline" disabled={!isSent || !!receipt} onClick={() => { setDraft(null); setSubject(""); setBody(""); setRecipient(parseContactEmails(contact.email ?? "")[0] ?? ""); setStep(2); }}>Write a follow-up email</Button>}
          </>}
        </fieldset>
        {error && <div className="outreach-error mt-4" role="alert">{error}</div>}
        {receipt && <div className="outreach-warnings mt-4" role="alert"><p>The email was sent or confirmed sent. CRM recording is incomplete. Do not send it again or reload this page.</p><Button className="mt-3" variant="outline" disabled={busy} onClick={() => void run(async () => { await recordSent(); })}>Retry CRM recording only</Button></div>}
        {busy && <p className="mt-3 text-sm" role="status">Saving…</p>}
        {(step === 3 || step === 4) && !practice && <section className="mt-6 border-t pt-5"><h3 className="mb-3 font-semibold">Email conversation</h3><ContactEmailHistory email={contact.email} /><Button variant="link" asChild><Link to={`/admin/crm/contacts?contact=${encodeURIComponent(contact.id)}`}>View contact timeline and details</Link></Button></section>}
      </section>
      <aside className="outreach-aside">
        <div><h2 className="font-semibold">Keep the next step clear</h2><p className="mt-2 text-sm text-muted-foreground">{step === 1 ? "A relevant reason to reach out and one small ask make a useful brief." : step === 2 ? "Use the contact’s real context. Keep the email short and ask one easy question." : step === 3 ? "Wait until your reminder is due. Check for a reply before preparing another email." : "Turn the response into a meeting, proposal, trial or onboarding task with a named owner."}</p></div>
        <div className="border-t pt-4"><p className="text-sm font-medium">Need a hand?</p><p className="mt-2 text-sm text-muted-foreground">Assign a colleague in Plan outreach, or take this brief and email to your assistant.</p><div className="mt-3 flex flex-col gap-2">{isAdmin && <Button variant="outline" disabled={busy || !!receipt} onClick={() => void run(askIris)}><Sparkles className="mr-2 h-4 w-4" />Ask Iris to help</Button>}<Button variant="outline" onClick={() => void run(copyHandoff)}>Copy handoff brief</Button></div><p className="mt-2 text-xs text-muted-foreground">Iris opens with an editable request. You review it before asking her to act.</p></div>
        <div className="border-t pt-4 text-sm"><p className="font-medium">Contact details</p>{practice && <p className="mt-2 text-muted-foreground">CRM contact: {contact.name}</p>}<p className="mt-2 break-words text-muted-foreground">{contact.email || "No email recorded"}</p><p className="mt-1 text-muted-foreground">{[contact.city, contact.country].filter(Boolean).join(", ")}</p><Link className="mt-3 inline-block underline" to={`/admin/crm/contacts?contact=${encodeURIComponent(contact.id)}`}>Review or correct contact</Link></div>
      </aside>
    </div>
    {compose && !practice && <Suspense fallback={<p role="status">Opening email composer…</p>}><ComposeDialog key={`${draft?.id}:${compose.account}`} draft={compose} accounts={accounts} onClose={() => setCompose(null)} onManageSignatures={() => { setCompose(null); navigate("/admin/email"); }} onSent={(sent) => { setCompose(null); void run(async () => { await recordSent(sent); }); }} /></Suspense>}
  </div>;
}

function DueField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label htmlFor="outreach-due">Next-action date & time *</Label><Input id="outreach-due" type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}
