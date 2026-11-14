import { Fragment, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AccountListColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  /** Makes the column sortable. */
  sortValue?: (row: T) => string | number;
  className?: string;
}

interface AccountListTableProps<T> {
  columns: AccountListColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  /** Shown in place of the rows when there are none. */
  empty: ReactNode;
  /** Column the list opens sorted by, newest first for dates. */
  defaultSort: { key: string; dir: "asc" | "desc" };
  /** Row actions shown beside the Preview toggle. */
  actions?: (row: T) => ReactNode;
  /** When given, each row gets a Preview toggle that expands this content. */
  preview?: (row: T) => ReactNode;
  minWidth?: number;
}

/**
 * The sortable record table used by Saved Drafts, shared so the Quote Requests
 * and Helpdesk Tickets lists look and behave the same way.
 */
export function AccountListTable<T>({ columns, rows, rowKey, isLoading, empty, defaultSort, actions, preview, minWidth = 720 }: AccountListTableProps<T>) {
  const [sort, setSort] = useState(defaultSort);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const colSpan = columns.length + 1;

  const toggleSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === defaultSort.key ? defaultSort.dir : "asc" }));

  const sorted = useMemo(() => {
    const sortValue = columns.find((c) => c.key === sort.key)?.sortValue;
    if (!sortValue) return rows;
    const sign = sort.dir === "asc" ? 1 : -1;
    // Array.sort is stable, so ties keep the order the rows arrived in.
    return [...rows].sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      return sign * (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" }));
    });
  }, [columns, rows, sort]);

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3" aria-sort={col.sortValue ? (sort.key === col.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none") : undefined}>
                {col.sortValue ? (
                  <button type="button" onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
                    {col.label}
                    {sort.key === col.key ? (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                  </button>
                ) : col.label}
              </th>
            ))}
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {isLoading ? (
            <tr><td colSpan={colSpan} className="px-4 py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">{empty}</td></tr>
          ) : (
            sorted.map((row) => {
              const key = rowKey(row);
              return (
                <Fragment key={key}>
                  <tr>
                    {columns.map((col) => <td key={col.key} className={col.className ?? "px-4 py-3"}>{col.render(row)}</td>)}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {preview ? (
                          <Button variant="ghost" size="sm" onClick={() => setPreviewKey((k) => (k === key ? null : key))} aria-expanded={previewKey === key}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />Preview
                          </Button>
                        ) : null}
                        {actions?.(row)}
                      </div>
                    </td>
                  </tr>
                  {preview && previewKey === key ? <tr className="bg-muted/20"><td colSpan={colSpan} className="px-6 py-4">{preview(row)}</td></tr> : null}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
