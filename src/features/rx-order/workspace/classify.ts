// The Rx Orders workspace's view of an order: one row per thing staff may need to
// act on — a submission in the outbox, or a capture still waiting for a person.
// Pure, so the tabs, counts and filters are the same everywhere and are tested.
//
//   Needs review      captures waiting to be checked (website, office, customer)
//   Ready to release  submissions in pending_review (the manual-release gate)
//   At lab            released and in progress
//   Problems          failed submissions, failed captures, lab holds
//   Done              delivered / complete, and cancelled
import type { RxSubmissionRow } from "../types";

export type WorkspaceTab = "review" | "ready" | "lab" | "problems" | "done";
export const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "review", label: "Needs review" },
  { id: "ready", label: "Ready to release" },
  { id: "lab", label: "At lab" },
  { id: "problems", label: "Problems" },
  { id: "done", label: "Done" },
];

export type RxSource = "form" | "capture" | "local_capture";
export const SOURCE_LABELS: Record<RxSource, string> = { form: "Form", capture: "Photo capture", local_capture: "Office capture" };

export interface CaptureRow {
  id: string;
  account_id: number | null;
  source: "web" | "local_capture";
  status: "queued" | "processing" | "ready" | "failed";
  error: string | null;
  quote_id: string | null;
  created_at: string;
  storage_path: string | null;
  file_name: string | null;
}

export interface WorkspaceItem {
  key: string;
  kind: "submission" | "capture";
  tab: WorkspaceTab;
  source: RxSource;
  provider: "innovations" | "gatekeeper" | null;
  accountId: number | null;
  /** Account / customer name as shown. */
  accountName: string;
  quoteId: string | null;
  quoteNumber: string | null;
  status: string;
  createdAt: string;
  submission?: RxSubmissionRow;
  capture?: CaptureRow;
}

/** "pending_review" becomes "pending review" (every underscore, not just the first). */
export const statusLabel = (status: string) => status.replaceAll("_", " ");

const PROBLEM_LAB = /hold|problem|error|reject|cancel|remake|issue|stuck|fail/i;
const DONE_LAB = /deliver|complete|ship|despatch|dispatch|invoic|closed|collected/i;

/** Where a submission sits, from its own status and what the lab last said. */
export function submissionTab(s: Pick<RxSubmissionRow, "status" | "lab_status">): WorkspaceTab {
  if (s.status === "failed") return "problems";
  if (s.status === "cancelled") return "done";
  if (s.status === "pending_review") return "ready";
  const lab = s.lab_status ?? "";
  if (lab && PROBLEM_LAB.test(lab)) return "problems";
  if (lab && DONE_LAB.test(lab)) return "done";
  return "lab";
}

/** A capture's tab: failed ones are a problem; the rest wait for a person. Null once it has become a submission. */
export function captureTab(c: CaptureRow, hasSubmission: boolean): WorkspaceTab | null {
  if (hasSubmission) return null;
  return c.status === "failed" ? "problems" : "review";
}

const captureSource = (c: CaptureRow): RxSource => (c.source === "local_capture" ? "local_capture" : "capture");

export function buildItems(args: {
  submissions: readonly RxSubmissionRow[];
  captures: readonly CaptureRow[];
  accountName: (id: number | null) => string;
  quoteNumbers: ReadonlyMap<string, string>;
}): WorkspaceItem[] {
  const { submissions, captures, accountName, quoteNumbers } = args;
  const captureByQuote = new Map(captures.filter((c) => c.quote_id).map((c) => [c.quote_id as string, c]));
  const quotesWithSubmission = new Set(submissions.map((s) => s.quote_id));
  const items: WorkspaceItem[] = [];

  for (const s of submissions) {
    const payload = s.payload as { quote?: { quote_number?: string; customer_name?: string }; account?: { name?: string } };
    const fromCapture = captureByQuote.get(s.quote_id);
    items.push({
      key: `s:${s.id}`, kind: "submission", tab: submissionTab(s),
      source: fromCapture ? captureSource(fromCapture) : "form",
      provider: s.dispatch_provider ?? "innovations",
      accountId: s.account_id,
      accountName: payload?.account?.name ?? payload?.quote?.customer_name ?? accountName(s.account_id),
      quoteId: s.quote_id, quoteNumber: payload?.quote?.quote_number ?? quoteNumbers.get(s.quote_id) ?? null,
      status: s.status, createdAt: s.created_at, submission: s,
    });
  }
  for (const c of captures) {
    const tab = captureTab(c, !!c.quote_id && quotesWithSubmission.has(c.quote_id));
    if (!tab) continue;
    items.push({
      key: `c:${c.id}`, kind: "capture", tab, source: captureSource(c), provider: null,
      accountId: c.account_id, accountName: accountName(c.account_id),
      quoteId: c.quote_id, quoteNumber: c.quote_id ? quoteNumbers.get(c.quote_id) ?? null : null,
      status: c.status, createdAt: c.created_at, capture: c,
    });
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface Filters {
  /** Matches the account / customer name or the quote number. */
  text: string;
  source: RxSource | "all";
  provider: "innovations" | "gatekeeper" | "all";
  /** yyyy-mm-dd, inclusive; empty for open ended. */
  from: string;
  to: string;
}
export const NO_FILTERS: Filters = { text: "", source: "all", provider: "all", from: "", to: "" };

export function applyFilters(items: readonly WorkspaceItem[], f: Filters): WorkspaceItem[] {
  const text = f.text.trim().toLowerCase();
  return items.filter((i) => {
    if (f.source !== "all" && i.source !== f.source) return false;
    if (f.provider !== "all" && i.provider !== f.provider) return false;
    if (text && !`${i.accountName} ${i.quoteNumber ?? ""}`.toLowerCase().includes(text)) return false;
    const day = i.createdAt.slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    return true;
  });
}

export const countByTab = (items: readonly WorkspaceItem[]): Record<WorkspaceTab, number> => {
  const out: Record<WorkspaceTab, number> = { review: 0, ready: 0, lab: 0, problems: 0, done: 0 };
  for (const i of items) out[i.tab] += 1;
  return out;
};
