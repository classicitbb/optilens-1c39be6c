import { useState } from "react";
import { useContactTags, useSaveContactTag, useDeleteContactTag, type ContactTag } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ArrowLeft, Tag } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router";

const ContactTagsConfigPage = () => {
  const { data: tags = [], isLoading } = useContactTags();
  const saveTag = useSaveContactTag();
  const deleteTag = useDeleteContactTag();
  const { toast } = useToast();

  const [editTag, setEditTag] = useState<Partial<ContactTag> | null>(null);

  const handleSave = async () => {
    if (!editTag?.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    try {
      await saveTag.mutateAsync(editTag);
      toast({ title: "Tag saved" });
      setEditTag(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTag.mutateAsync(id);
      toast({ title: "Tag deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/admin/erp/contacts">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <AdminPageHeader icon={Tag} title="Contact Tags" />
        </div>
        <Button size="sm" className="h-8 text-xs gap-1" style={{ background: "hsl(168 76% 42%)", color: "white" }} onClick={() => setEditTag({ name: "", color: "#14b8a6", category: "" })}>
          <Plus className="h-3.5 w-3.5" /> New Tag
        </Button>
      </div>

      <div className="border rounded-md overflow-hidden" style={{ borderColor: "hsl(215 25% 88%)" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell><div className="h-5 w-5 rounded-full" style={{ background: tag.color }} /></TableCell>
                <TableCell className="text-xs font-medium">{tag.name}</TableCell>
                <TableCell className="text-xs">{tag.category}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditTag(tag)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(tag.id)} style={{ color: "hsl(0 72% 51%)" }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editTag} onOpenChange={(v) => !v && setEditTag(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">{editTag?.id ? "Edit Tag" : "New Tag"}</DialogTitle></DialogHeader>
          {editTag && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Name *</label>
                <Input className="h-8 text-xs" value={editTag.name ?? ""} onChange={(e) => setEditTag({ ...editTag, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={editTag.color ?? "#14b8a6"} onChange={(e) => setEditTag({ ...editTag, color: e.target.value })} className="h-8 w-8 rounded border-0 cursor-pointer" />
                  <Input className="h-8 text-xs flex-1" value={editTag.color ?? ""} onChange={(e) => setEditTag({ ...editTag, color: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Category</label>
                <Input className="h-8 text-xs" value={editTag.category ?? ""} onChange={(e) => setEditTag({ ...editTag, category: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditTag(null)}>Cancel</Button>
                <Button size="sm" className="h-8 text-xs" style={{ background: "hsl(168 76% 42%)", color: "white" }} onClick={handleSave}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactTagsConfigPage;
