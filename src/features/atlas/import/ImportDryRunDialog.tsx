import { useMemo, useState } from "react";
import { AlertTriangle, Download, FileJson } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { clickUpImportSource } from "./clickUpImportSource";
import { planImport } from "./planImport";
import type { ImportReport } from "./types";

interface ImportDryRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Slugs already in Atlas, so collisions are reported. */
  existingSlugs: (string | null | undefined)[];
}

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-[6px] border border-ws-line px-3 py-2">
    <p className="ws-label text-ws-ink-3">{label}</p>
    <p className="text-[20px] font-semibold text-ws-ink">{value}</p>
  </div>
);

/**
 * Dry run only. It reads a ClickUp export the user chooses and reports what an import would do:
 * counts, hierarchy, what would be lost, and slug collisions. There is deliberately no import button.
 */
const ImportDryRunDialog = ({ open, onOpenChange, existingSlugs }: ImportDryRunDialogProps) => {
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lossyByKind = useMemo(() => {
    const map = new Map<string, { effect: string; pages: Set<string>; count: number; severity: string }>();
    for (const item of report?.lossy ?? []) {
      const entry = map.get(item.kind) ?? { effect: item.effect, pages: new Set<string>(), count: 0, severity: item.severity };
      entry.pages.add(item.pageId);
      entry.count += item.count;
      map.set(item.kind, entry);
    }
    return [...map.entries()];
  }, [report]);

  const readFile = async (file: File) => {
    setError(null);
    setReport(null);
    try {
      const bundle = clickUpImportSource.parse(JSON.parse(await file.text()));
      setReport(planImport(bundle, existingSlugs));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not read that file.");
    }
  };

  const download = () => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `import-dry-run-${report.spaceId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogTitle>Import dry run</DialogTitle>
        <DialogDescription>
          Choose a {clickUpImportSource.label} export (JSON) to see what an import would create and what would not survive. Nothing is imported or changed.
        </DialogDescription>

        <label className="flex cursor-pointer items-center gap-2 rounded-[6px] border border-dashed border-ws-line px-3 py-3 text-[14px] text-ws-ink-2 hover:bg-[var(--ws-hover)]">
          <FileJson className="h-4 w-4" /> Choose export file…
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
        </label>
        {error ? (
          <p role="alert" className="text-[14px] text-destructive">
            {error}
          </p>
        ) : null}

        {report ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Documents" value={report.counts.documents} />
              <Stat label="Pages" value={report.counts.pages} />
              <Stat label="Sections" value={report.counts.sections} />
              <Stat label="Deepest nesting" value={report.counts.maxDepth} />
              <Stat label="Empty pages" value={report.counts.emptyPages} />
              <Stat label="Pages with losses" value={report.counts.pagesWithLoss} />
              <Stat label="Slug collisions" value={report.collisions.length} />
              <Stat label="Failed conversions" value={report.counts.failedConversions} />
            </div>
            <p className="text-[13px] text-ws-ink-3">
              Would land in a new space “{report.spaceName}” ({report.spaceId}); folders become sections and documents become pages with their sub-pages nested under them.
            </p>

            <section>
              <h3 className="ws-label mb-2 text-ws-ink-3">What would not survive</h3>
              {lossyByKind.length === 0 ? <p className="text-[14px] text-ws-ink-2">Nothing flagged.</p> : null}
              <ul className="divide-y divide-ws-line rounded-[6px] border border-ws-line">
                {lossyByKind.map(([kind, entry]) => (
                  <li key={kind} className="flex items-start gap-3 px-3 py-2 text-[14px]">
                    <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", entry.severity === "lossy" ? "text-ws-accent-line" : "text-ws-ink-3")} />
                    <span className="flex-1">
                      <span className="font-medium capitalize">{kind.replace("-", " ")}</span>
                      <span className="text-ws-ink-3"> · {entry.count} on {entry.pages.size} {entry.pages.size === 1 ? "page" : "pages"}</span>
                      <span className="block text-[13px] text-ws-ink-2">{entry.effect}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {report.collisions.length > 0 ? (
              <section>
                <h3 className="ws-label mb-2 text-ws-ink-3">Slug collisions (an import would number these, never overwrite)</h3>
                <ul className="space-y-1 text-[14px]">
                  {report.collisions.map((collision, index) => (
                    <li key={`${collision.slug}-${index}`}>
                      <span className="ws-mono">{collision.slug}</span> · {collision.kind === "existing-page" ? "already used in Atlas" : `${collision.titles.length} pages share it`}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h3 className="ws-label mb-2 text-ws-ink-3">Hierarchy</h3>
              <ul className="max-h-64 overflow-y-auto rounded-[6px] border border-ws-line py-1 text-[14px]">
                {report.pages.map((page) => (
                  <li key={page.externalId} style={{ paddingLeft: 12 + page.depth * 16 }} className="flex items-center gap-2 py-0.5 pr-3">
                    <span className="truncate">{page.title}</span>
                    <span className="ws-mono ml-auto shrink-0 text-[11px] text-ws-ink-3">{page.slug}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex items-center justify-between border-t border-ws-line pt-3">
              <p className="text-[13px] text-ws-ink-3">Importing writes to the live database and needs your explicit go-ahead. This report changes nothing.</p>
              <button type="button" onClick={download} className="flex h-8 items-center gap-1.5 rounded-[6px] border border-ws-line px-3 text-[13px] hover:bg-[var(--ws-hover)]">
                <Download className="h-3.5 w-3.5" /> Download report
              </button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default ImportDryRunDialog;
