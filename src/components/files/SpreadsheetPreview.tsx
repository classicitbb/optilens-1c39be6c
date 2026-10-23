import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  loadSpreadsheet,
  SPREADSHEET_MAX_COLUMNS,
  SPREADSHEET_MAX_ROWS,
  type PreviewSheet,
  type SpreadsheetFormat,
} from "@/lib/spreadsheetPreview";

type State = { sheets: PreviewSheet[] } | { error: string } | null;

/** Read-only grid for a CSV or XLSX file: row numbers, sheet tabs, first 200 rows and 40 columns. */
export const SpreadsheetPreview = ({ file, format }: { file: Blob; format: SpreadsheetFormat }) => {
  const [state, setState] = useState<State>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setActive(0);
    loadSpreadsheet(file, format).then(
      (sheets) => { if (!cancelled) setState({ sheets }); },
      (cause) => { if (!cancelled) setState({ error: cause instanceof Error ? cause.message : "This file could not be previewed." }); },
    );
    return () => { cancelled = true; };
  }, [file, format]);

  if (!state) return <p className="p-4 text-sm">Loading preview…</p>;
  if ("error" in state) return <p className="p-4 text-sm">{state.error}</p>;
  const sheet = state.sheets[active] ?? state.sheets[0];
  if (!sheet || sheet.rows.length === 0) return <p className="p-4 text-sm">This file has no rows to preview.</p>;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-xs text-slate-900">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-max border-collapse">
          <tbody>
            {sheet.rows.map((cells, rowIndex) => (
              <tr key={rowIndex}>
                <th scope="row" className="sticky left-0 border border-slate-200 bg-slate-100 px-2 py-1 text-right font-normal text-slate-500">{rowIndex + 1}</th>
                {cells.slice(0, SPREADSHEET_MAX_COLUMNS).map((value, columnIndex) => (
                  <td key={columnIndex} className="max-w-64 truncate whitespace-nowrap border border-slate-200 px-2 py-1" title={value}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {sheet.truncated && <p className="p-2 text-slate-600">Showing the first {SPREADSHEET_MAX_ROWS} rows. Download for the full file.</p>}
      </div>
      {state.sheets.length > 1 && (
        <div role="tablist" aria-label="Sheets" className="flex shrink-0 gap-1 overflow-x-auto border-t border-slate-200 bg-slate-50 px-2 py-1">
          {state.sheets.map((item, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === active}
              onClick={() => setActive(index)}
              className={`whitespace-nowrap rounded px-2 py-1 ${index === active ? "bg-white font-medium shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export interface SpreadsheetSource {
  name: string;
  format: SpreadsheetFormat;
  /** Local file (not yet uploaded). */
  file?: Blob;
  /** Remote file, e.g. a signed storage URL. */
  url?: string;
}

/** Click-to-open spreadsheet viewer for attachments. Pass `null` to close. */
export const SpreadsheetPreviewDialog = ({ source, onClose }: { source: SpreadsheetSource | null; onClose: () => void }) => {
  const [file, setFile] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFile(null);
    setError(null);
    if (!source) return;
    if (source.file) { setFile(source.file); return; }
    if (!source.url) return;
    let cancelled = false;
    fetch(source.url)
      .then((response) => {
        if (!response.ok) throw new Error(`Download failed (${response.status})`);
        return response.blob();
      })
      .then((blob) => { if (!cancelled) setFile(blob); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "The file could not be loaded."); });
    return () => { cancelled = true; };
  }, [source]);

  return (
    <Dialog open={!!source} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex h-[85vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 pr-12">
          <DialogTitle className="mr-auto min-w-0 truncate text-sm font-medium">{source?.name}</DialogTitle>
          <DialogDescription className="sr-only">Spreadsheet preview.</DialogDescription>
          {source?.url && (
            <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5">
              <a href={source.url} download={source.name} target="_blank" rel="noreferrer"><Download className="h-4 w-4" />Download</a>
            </Button>
          )}
        </div>
        <div className="min-h-0 flex-1">
          {error ? <p className="p-4 text-sm">{error}</p> : file && source ? <SpreadsheetPreview file={file} format={source.format} /> : <p className="p-4 text-sm">Loading preview…</p>}
        </div>
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 z-10 h-8 w-8" aria-label="Close preview">
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};
