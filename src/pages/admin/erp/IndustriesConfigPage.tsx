import { useState } from "react";
import { useIndustries, useSaveIndustry, type Industry } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const IndustriesConfigPage = () => {
  const { data: industries = [] } = useIndustries();
  const saveIndustry = useSaveIndustry();
  const { toast } = useToast();
  const [editItem, setEditItem] = useState<Partial<Industry> | null>(null);

  const handleSave = async () => {
    if (!editItem?.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    try {
      await saveIndustry.mutateAsync(editItem);
      toast({ title: "Industry saved" });
      setEditItem(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/admin/erp/contacts"><Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "hsl(215 30% 15%)" }}>Industries</h1>
            <p className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>Configure industry categories</p>
          </div>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1" style={{ background: "hsl(168 76% 42%)", color: "white" }} onClick={() => setEditItem({ name: "", full_name: "" })}>
          <Plus className="h-3.5 w-3.5" /> New Industry
        </Button>
      </div>

      <div className="border rounded-md overflow-hidden" style={{ borderColor: "hsl(215 25% 88%)" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Full Name / Code</TableHead>
              <TableHead className="w-16">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {industries.map((ind) => (
              <TableRow key={ind.id}>
                <TableCell className="text-xs font-medium">{ind.name}</TableCell>
                <TableCell className="text-xs">{ind.full_name}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditItem(ind)}><Pencil className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">{editItem?.id ? "Edit Industry" : "New Industry"}</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Name *</label>
                <Input className="h-8 text-xs" value={editItem.name ?? ""} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Full Name / Code</label>
                <Input className="h-8 text-xs" value={editItem.full_name ?? ""} onChange={(e) => setEditItem({ ...editItem, full_name: e.target.value })} placeholder="e.g. OPTL - Optical / Eyewear" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button size="sm" className="h-8 text-xs" style={{ background: "hsl(168 76% 42%)", color: "white" }} onClick={handleSave}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IndustriesConfigPage;
