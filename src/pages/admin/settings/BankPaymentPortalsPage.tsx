import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Landmark, ExternalLink } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useToast } from "@/hooks/use-toast";

type BankPaymentPortal = {
  bank_name: string;
  portal_url: string;
  notes: string | null;
  updated_at: string;
};

// Maps an Innovations EFT institution name (dbo.EFTInstitutions.EFTInstitutionName,
// synced onto customers.eft_institution_name by innovations-sync) to the bank's
// online banking / bill-pay URL. The customer portal's "Pay Balance" flow reads
// this table to redirect EFT customers to their own bank, instead of a card form.
// Keyed on bank_name (no surrogate id) — matching must be exact against what
// Innovations sends, so keep names copy-pasted from there rather than retyped.
const BankPaymentPortalsPage = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<BankPaymentPortal[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
    // Update-by-original-key so renaming the bank name doesn't orphan the row
    // (no surrogate id — bank_name is the primary key).
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <AdminPageHeader icon={Landmark} title="Bank Payment Portals" />
        <Button
          size="sm"
          className="h-8 text-xs gap-1"
          style={{ background: "hsl(168 76% 42%)", color: "white" }}
          onClick={openNew}
        >
          <Plus className="h-3.5 w-3.5" /> New Mapping
        </Button>
      </div>

      <p className="text-sm text-muted-foreground max-w-2xl">
        EFT customers are routed to their own bank to pay a statement instead of a card form.
        Map each bank name exactly as it arrives from Innovations (dbo.EFTInstitutions.EFTInstitutionName,
        synced onto <code>customers.eft_institution_name</code>) to that bank's online banking URL.
      </p>

      <div className="border rounded-md overflow-hidden" style={{ borderColor: "hsl(215 25% 88%)" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bank Name</TableHead>
              <TableHead>Portal URL</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.bank_name}>
                <TableCell className="text-xs font-medium">{row.bank_name}</TableCell>
                <TableCell className="text-xs">
                  <a
                    href={row.portal_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {row.portal_url} <ExternalLink className="h-3 w-3" />
                  </a>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.notes || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(row)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDelete(row.bank_name)}
                      style={{ color: "hsl(0 72% 51%)" }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
                  No bank payment portals mapped yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) { setEditItem(null); setOriginalBankName(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{originalBankName ? "Edit Mapping" : "New Mapping"}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Bank Name *</label>
                <Input
                  className="h-8 text-xs"
                  value={editItem.bank_name ?? ""}
                  onChange={(e) => setEditItem({ ...editItem, bank_name: e.target.value })}
                  placeholder="Must match Innovations EFTInstitutionName exactly"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Portal URL *</label>
                <Input
                  className="h-8 text-xs"
                  value={editItem.portal_url ?? ""}
                  onChange={(e) => setEditItem({ ...editItem, portal_url: e.target.value })}
                  placeholder="https://onlinebanking.example.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Notes</label>
                <textarea
                  className="w-full min-h-16 text-xs rounded-md border border-input bg-transparent px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
