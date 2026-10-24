import { useMemo, useState } from "react";
import { Link } from "react-router";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { DataHealthContact, Finding, FindingKind } from "./dataHealth";
import { mergeContacts, useApplyMerges, useDataHealth, useLinkToCompany, type MergeReport } from "./hooks/useDataHealth";

const KIND_LABEL: Record<FindingKind, string> = {
  duplicate_company: "Duplicate companies",
  duplicate_person: "Duplicate people",
  unlinked_person: "People not linked to their company",
  email_format: "Email problems",
};
const KIND_ORDER: FindingKind[] = ["duplicate_company", "duplicate_person", "unlinked_person", "email_format"];
const DISMISS_KEY = "crm-data-health-dismissed";

const loadDismissed = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
};
const saveDismissed = (keys: Set<string>) => {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...keys]));
  } catch {
    /* the list just won't persist */
  }
};

const show = (value: unknown) => (value == null || value === "" ? "—" : String(value));

const RecordSummary = ({ c, label }: { c: DataHealthContact; label?: string }) => (
  <div className="min-w-0 flex-1 rounded-md border p-2 text-xs">
    <div className="flex items-center gap-2">
      <span className="truncate font-medium">{show(c.name)}</span>
      {label && <Badge variant="secondary" className="text-[10px]">{label}</Badge>}
      {c.linked_customer_id != null && <Badge className="text-[10px]">ERP #{c.linked_customer_id}</Badge>}
    </div>
    <div className="truncate text-muted-foreground">{show(c.business_name)} · {show(c.email)} · {show(c.phone)}</div>
    <div className="text-muted-foreground">
      {c.stage ? `Stage: ${c.stage} · ` : ""}added {c.created_at.slice(0, 10)}
      {" · "}
      <Link className="underline" to={`/admin/crm/contacts?contact=${c.id}`}>open</Link>
    </div>
  </div>
);

const ReportView = ({ reports }: { reports: MergeReport[] }) => (
  <div className="space-y-1 rounded-md bg-muted/50 p-2 text-xs">
    {reports.map((r) => (
      <div key={r.dropped.id}>
        <div className="font-medium">Fold "{show(r.dropped.name)}" into "{show(r.kept.name)}"</div>
        <div>
          Moves: {Object.keys(r.moved).length === 0 ? "nothing linked to it" : Object.entries(r.moved).map(([k, v]) => `${v} × ${k.replace("public.", "")}`).join(", ")}
        </div>
        {r.filled.length > 0 && <div>Fills blanks: {r.filled.map((f) => f.column).join(", ")}</div>}
        {r.conflicts.length > 0 && (
          <div className="text-amber-700 dark:text-amber-400">
            Different values kept as they are: {r.conflicts.map((f) => `${f.column} (${show(f.kept)} vs ${show(f.dropped)})`).join("; ")}
          </div>
        )}
        {r.discarded_duplicates > 0 && <div>{r.discarded_duplicates} identical link rows will be dropped.</div>}
      </div>
    ))}
  </div>
);

const DuplicateCard = ({ finding, onDismiss }: { finding: Finding; onDismiss: () => void }) => {
  const { toast } = useToast();
  const apply = useApplyMerges();
  const [keepId, setKeepId] = useState(finding.contacts[0].id);
  const [reports, setReports] = useState<MergeReport[] | null>(null);
  const [busy, setBusy] = useState(false);
  const dropIds = finding.contacts.filter((c) => c.id !== keepId).map((c) => c.id);

  const preview = async () => {
    setBusy(true);
    try {
      setReports(await Promise.all(dropIds.map((id) => mergeContacts(keepId, id, true))));
    } catch (e: any) {
      toast({ title: "Cannot merge these", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    try {
      await apply.mutateAsync({ keepId, dropIds });
      toast({ title: "Merged", description: "The duplicate is archived and everything linked to it was moved." });
    } catch (e: any) {
      toast({ title: "Merge stopped", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <div className="text-xs text-muted-foreground">{finding.detail}. Pick the record to keep.</div>
        <div className="flex flex-col gap-2 md:flex-row">
          {finding.contacts.map((c, i) => (
            <label key={c.id} className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
              <input
                type="radio"
                className="mt-2"
                name={finding.key}
                checked={keepId === c.id}
                onChange={() => { setKeepId(c.id); setReports(null); }}
              />
              <RecordSummary c={c} label={i === 0 ? "suggested" : undefined} />
            </label>
          ))}
        </div>
        {reports && <ReportView reports={reports} />}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={preview} disabled={busy || apply.isPending}>
            {busy ? "Checking…" : "Preview merge"}
          </Button>
          <Button size="sm" onClick={confirm} disabled={!reports || apply.isPending}>
            {apply.isPending ? "Merging…" : `Merge ${dropIds.length} into the kept record`}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>Not a duplicate</Button>
        </div>
      </CardContent>
    </Card>
  );
};

const UnlinkedCard = ({ finding, onDismiss }: { finding: Finding; onDismiss: () => void }) => {
  const { toast } = useToast();
  const link = useLinkToCompany();
  const person = finding.contacts[0];
  const company = finding.company!;
  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <div className="text-xs text-muted-foreground">{finding.detail}.</div>
        <div className="flex flex-col gap-2 md:flex-row">
          <RecordSummary c={person} label="person" />
          <RecordSummary c={company} label="company" />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={link.isPending}
            onClick={async () => {
              try {
                await link.mutateAsync({ personId: person.id, companyId: company.id });
                toast({ title: "Linked" });
              } catch (e: any) {
                toast({ title: "Could not link", description: e?.message, variant: "destructive" });
              }
            }}
          >
            Link to {show(company.name)}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>Leave as is</Button>
        </div>
      </CardContent>
    </Card>
  );
};

const EmailCard = ({ finding, onDismiss }: { finding: Finding; onDismiss: () => void }) => (
  <Card>
    <CardContent className="space-y-2 p-3">
      <div className="text-xs text-muted-foreground">{finding.detail}.</div>
      <RecordSummary c={finding.contacts[0]} />
      <Button size="sm" variant="ghost" onClick={onDismiss}>Ignore</Button>
    </CardContent>
  </Card>
);

const CrmDataHealthPanel = () => {
  const { data: findings = [], isLoading, isFetching, error, refetch } = useDataHealth();
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);

  const dismiss = (key: string) => {
    const next = new Set(dismissed).add(key);
    setDismissed(next);
    saveDismissed(next);
  };

  const visible = useMemo(() => findings.filter((f) => !dismissed.has(f.key)), [findings, dismissed]);
  const byKind = (kind: FindingKind) => visible.filter((f) => f.kind === kind);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Contact data health</h2>
          <p className="text-xs text-muted-foreground">
            Duplicates, unlinked people and bad emails. Nothing changes until you preview and confirm, and every merge can be undone from its log.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Re-check
        </Button>
      </div>

      {isLoading && <Skeleton className="h-24 w-full" />}
      {error && <div className="text-xs text-destructive">Could not load contacts: {(error as Error).message}</div>}
      {!isLoading && !error && visible.length === 0 && (
        <div className="text-xs text-muted-foreground">Nothing to review.</div>
      )}

      {KIND_ORDER.map((kind) => {
        const items = byKind(kind);
        if (items.length === 0) return null;
        return (
          <Card key={kind}>
            <CardHeader className="p-3 pb-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                {KIND_LABEL[kind]} <Badge variant="secondary">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {items.map((f) =>
                f.kind === "unlinked_person" ? (
                  <UnlinkedCard key={f.key} finding={f} onDismiss={() => dismiss(f.key)} />
                ) : f.kind === "email_format" ? (
                  <EmailCard key={f.key} finding={f} onDismiss={() => dismiss(f.key)} />
                ) : (
                  <DuplicateCard key={f.key} finding={f} onDismiss={() => dismiss(f.key)} />
                ),
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default CrmDataHealthPanel;
