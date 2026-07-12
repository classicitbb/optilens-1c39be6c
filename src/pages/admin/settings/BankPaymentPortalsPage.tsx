import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Landmark, ExternalLink, Search, Building2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useToast } from "@/hooks/use-toast";

type BankPaymentPortal = {
  bank_name: string;
  portal_url: string;
  notes: string | null;
  updated_at: string;
};

const BankPaymentPortalsPage = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<BankPaymentPortal[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<Partial<BankPaymentPortal> | null>(null);
  const [originalBankName, setOriginalBankName] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("bank_payment_portals")
      .select("*")
      .order("bank_name");
    setLoading(false);
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    else setRows((data ?? []) as BankPaymentPortal[]);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.bank_name.toLowerCase().includes(q) ||
      r.portal_url.toLowerCase().includes(q) ||
      (r.notes ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  function openNew() {
    setOriginalBankName(null);
    setEditItem({ bank_name: "", portal_url: "", notes: "" });
  }

  function openEdit(row: BankPaymentPortal) {
    setOriginalBankName(row.bank_name);
    setEditItem({ ...row });
  }

  async function handleSave() {
    const bankName = editItem?.bank_name?.trim();
    const portalUrl = editItem?.portal_url?.trim();
    if (!bankName || !portalUrl) {
      toast({ title: "Bank name and portal URL are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      bank_name: bankName,
      portal_url: portalUrl,
      notes: editItem?.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = originalBankName
      ? await supabase.from("bank_payment_portals").update(payload).eq("bank_name", originalBankName)
      : await supabase.from("bank_payment_portals").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    setEditItem(null);
    setOriginalBankName(null);
    load();
  }

  async function handleDelete(bankName: string) {
    if (!confirm(`Remove the payment portal mapping for "${bankName}"?`)) return;
    const { error } = await supabase.from("bank_payment_portals").delete().eq("bank_name", bankName);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Removed" }); load(); }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <div className="flex items-center justify-between">
        <AdminPageHeader icon={Landmark} title="Bank Payment Portals" />
        <Button
          size="sm"
          className="h-8 gap-1 text-xs"
          style={{ background: "hsl(168 76% 42%)", color: "white" }}
          onClick={openNew}
        >
          <Plus className="h-3.5 w-3.5" /> New Mapping
        </Button>
      </div>

      <p className="max-w-2xl text-sm text-muted-foreground">
        EFT customers are routed to their own bank to pay a statement instead of a card form.
        Map each bank name exactly as it arrives from Innovations (dbo.EFTInstitutions.EFTInstitutionName,
        synced onto <code>customers.eft_institution_name</code>) to that bank's online banking URL.
      </p>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search banks..."
          className="h-9 pl-9 text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? "No bank payment portals mapped yet." : "No matches."}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((row) => (
              <Card key={row.bank_name} variant="feature" className="group flex flex-col">
                <CardHeader className="pb-3">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                    <Building2 className="h-5 w-5 text-accent" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-base leading-tight">{row.bank_name}</CardTitle>
                  {row.notes ? (
                    <CardDescription className="text-xs">{row.notes}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <a
                    href={row.portal_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1 truncate text-xs text-primary hover:underline"
                  >
                    <span className="truncate">{row.portal_url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <div className="flex gap-2 border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 flex-1 gap-1 text-xs"
                      onClick={() => openEdit(row)}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleDelete(row.bank_name)}
                      style={{ color: "hsl(0 72% 51%)" }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) { setEditItem(null); setOriginalBankName(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{originalBankName ? "Edit Mapping" : "New Mapping"}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Bank Name *</label>
                <Input
                  className="h-8 text-xs"
                  value={editItem.bank_name ?? ""}
                  onChange={(e) => setEditItem({ ...editItem, bank_name: e.target.value })}
                  placeholder="Must match Innovations EFTInstitutionName exactly"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Portal URL *</label>
                <Input
                  className="h-8 text-xs"
                  value={editItem.portal_url ?? ""}
                  onChange={(e) => setEditItem({ ...editItem, portal_url: e.target.value })}
                  placeholder="https://onlinebanking.example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Notes</label>
                <textarea
                  className="min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={editItem.notes ?? ""}
                  onChange={(e) => setEditItem({ ...editItem, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { setEditItem(null); setOriginalBankName(null); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  style={{ background: "hsl(168 76% 42%)", color: "white" }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankPaymentPortalsPage;
