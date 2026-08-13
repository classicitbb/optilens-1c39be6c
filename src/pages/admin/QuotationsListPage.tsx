import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuotes, Quote, QUOTE_STATUSES } from "@/hooks/useQuotes";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Copy, FileText, Search, Trash2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ReleaseWhatChangedLink from "@/components/admin/ReleaseWhatChangedLink";
import { format } from "date-fns";
import { useStockOrderDrafts } from "@/hooks/useStockOrderBuilder";

const statusColors: Record<string, string> = {
  Draft: "hsl(215 15% 50%)",
  Sent: "hsl(215 65% 50%)",
  Accepted: "hsl(145 60% 40%)",
  Rejected: "hsl(0 60% 50%)",
  Expired: "hsl(35 80% 50%)",
  Void: "hsl(0 0% 55%)",
};

const QuotationsListPage = () => {
  const { data: quotes, isLoading, createMutation, deleteMutation } = useQuotes();
  const { data: stockDrafts = [] } = useStockOrderDrafts();
  const { canEdit } = useAdminRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);

  // RX quotes open in the in-house Rx order form; STOCK quotes keep the flat editor.
  const quoteEditPath = (q: Pick<Quote, "id" | "quote_type">) =>
    q.quote_type === "RX" ? `/admin/website/quotations/rx/${q.id}` : `/admin/website/quotations/${q.id}`;

  const handleCreate = (quoteType: "STOCK" | "RX") => {
    createMutation.mutate(
      { quote_type: quoteType },
      {
        onSuccess: (data) => {
          setNewQuoteOpen(false);
          toast({ title: `${quoteType} quote created` });
          navigate(quoteEditPath(data));
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = (quote: Quote) => {
    if (!confirm(`Delete draft ${quote.quote_number}? This cannot be undone.`)) return;
    deleteMutation.mutate(quote.id, {
      onSuccess: () => toast({ title: "Draft deleted" }),
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleDuplicate = (quote: Quote) => {
    createMutation.mutate(
      { quote_type: quote.quote_type, customer_name: quote.customer_name },
      {
        onSuccess: (data) => {
          toast({ title: "Quote duplicated" });
          navigate(quoteEditPath(data));
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const filtered = (quotes ?? []).filter((q) => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (typeFilter !== "all" && q.quote_type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        q.quote_number.toLowerCase().includes(s) ||
        q.customer_name.toLowerCase().includes(s)
      );
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "hsl(215 65% 50%)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AdminPageHeader icon={FileText} title="Quotations" />
          <ReleaseWhatChangedLink section="quotes" />
        </div>
        {canEdit && (
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }}
            onClick={() => setNewQuoteOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> New Quote
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(215 15% 55%)" }} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotes…"
            className="h-7 text-xs pl-7"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-7 w-[120px] text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="STOCK">Stock</SelectItem>
            <SelectItem value="RX">Rx</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 w-[130px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {QUOTE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded" style={{ borderColor: "hsl(215 15% 85%)" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Quote #</TableHead>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="text-xs text-right">GP%</TableHead>
              <TableHead className="text-xs">Updated</TableHead>
              <TableHead className="text-xs w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-xs py-8" style={{ color: "hsl(215 15% 55%)" }}>
                  No quotes found. Click "New Quote" to create one.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((q) => (
              <TableRow
                key={q.id}
                className="cursor-pointer"
                onClick={() => navigate(quoteEditPath(q))}
              >
                <TableCell className="text-xs font-medium">{q.quote_number}</TableCell>
                <TableCell className="text-xs">{q.customer_name || "—"}</TableCell>
                <TableCell className="text-xs">
                  <Badge variant="outline" className="text-[10px] h-5">
                    {q.quote_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  <Badge
                    className="text-[10px] h-5 border-0"
                    style={{
                      background: `${statusColors[q.status]}20`,
                      color: statusColors[q.status],
                    }}
                  >
                    {q.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-right font-mono">
                  {q.grand_total.toFixed(2)}
                </TableCell>
                <TableCell className="text-xs text-right font-mono">
                  {q.gp_percent.toFixed(1)}%
                </TableCell>
                <TableCell className="text-xs" style={{ color: "hsl(215 15% 55%)" }}>
                  {format(new Date(q.updated_at), "dd MMM yyyy")}
                </TableCell>
                <TableCell className="text-xs">
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(quoteEditPath(q))}
                      className="p-1 rounded hover:bg-black/5"
                      title="View/Edit"
                    >
                      <FileText className="h-3.5 w-3.5" style={{ color: "hsl(215 15% 50%)" }} />
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => handleDuplicate(q)}
                        className="p-1 rounded hover:bg-black/5"
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" style={{ color: "hsl(215 15% 50%)" }} />
                      </button>
                    )}
                    {canEdit && q.status === "Draft" && (
                      <button
                        onClick={() => handleDelete(q)}
                        className="p-1 rounded hover:bg-red-50"
                        title="Delete draft"
                      >
                        <Trash2 className="h-3.5 w-3.5" style={{ color: "hsl(0 60% 50%)" }} />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* New Quote Modal */}
      <Dialog open={newQuoteOpen} onOpenChange={setNewQuoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">New Quote</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="flex flex-col items-center">
              <button
                onClick={() => handleCreate("STOCK")}
                disabled={createMutation.isPending}
                className="flex w-full flex-col items-center gap-3 p-6 border rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                style={{ borderColor: "hsl(215 15% 82%)" }}
              >
                <FileText className="h-8 w-8" style={{ color: "hsl(215 65% 50%)" }} />
                <div className="text-center">
                  <div className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Stock Quote</div>
                  <div className="text-[11px] mt-1" style={{ color: "hsl(215 15% 50%)" }}>
                    Stock items only
                  </div>
                </div>
              </button>
              <Link
                to="/admin/website/stock-orders"
                onClick={() => setNewQuoteOpen(false)}
                className="mt-2 text-[11px] text-blue-600 hover:underline"
              >
                Open stock order form
              </Link>
            </div>
            <button
              onClick={() => handleCreate("RX")}
              disabled={createMutation.isPending}
              className="flex flex-col items-center gap-3 p-6 border rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              style={{ borderColor: "hsl(215 15% 82%)" }}
            >
              <FileText className="h-8 w-8" style={{ color: "hsl(145 60% 40%)" }} />
              <div className="text-center">
                <div className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Rx Quote</div>
                <div className="text-[11px] mt-1" style={{ color: "hsl(215 15% 50%)" }}>
                  Lenses, Add-Ons, Supplies
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {stockDrafts.length > 0 && (
        <div className="border rounded" style={{ borderColor: "hsl(215 15% 85%)" }}>
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div>
              <h2 className="text-sm font-semibold">Stock order drafts</h2>
              <p className="text-[11px] text-muted-foreground">Saved from the stock order form and waiting for release.</p>
            </div>
            <Link className="text-xs text-blue-600 hover:underline" to="/admin/website/stock-orders">New stock order</Link>
          </div>
          <div className="divide-y">
            {stockDrafts.map((draft) => (
              <div key={draft.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">
                    {draft.payload.account?.name ?? `Account ${draft.account_id}`}
                    {draft.order_reference ? ` · ${draft.order_reference}` : ""}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {draft.payload.items?.length ?? 0} item{(draft.payload.items?.length ?? 0) === 1 ? "" : "s"} · {format(new Date(draft.updated_at), "dd MMM yyyy")}
                  </div>
                </div>
                <Link className="text-xs text-blue-600 hover:underline" to={`/admin/website/stock-orders?draft=${draft.id}`}>Open draft</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationsListPage;
