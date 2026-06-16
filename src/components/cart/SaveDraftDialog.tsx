import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCartDrafts } from "@/hooks/useCartDrafts";
import type { CartItem } from "@/hooks/useCart";

interface SaveDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  onSaved?: () => void;
}

const SaveDraftDialog = ({ open, onOpenChange, items, onSaved }: SaveDraftDialogProps) => {
  const { toast } = useToast();
  const { createDraft } = useCartDrafts();
  const defaultName = `Draft — ${new Date().toLocaleString()}`;
  const [name, setName] = useState(defaultName);
  const [note, setNote] = useState("");

  const handleSave = async () => {
    try {
      await createDraft.mutateAsync({ name: name.trim() || defaultName, note: note.trim() || undefined, items });
      toast({ title: "Draft saved", description: "View it under Profile → Saved drafts." });
      onSaved?.();
      onOpenChange(false);
      setName(defaultName);
      setNote("");
    } catch (error: any) {
      toast({
        title: "Could not save draft",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save cart as draft</DialogTitle>
          <DialogDescription>
            Save the current cart so you can restore it later from your account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="draft-name">Draft name</Label>
            <Input id="draft-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="draft-note">Notes (optional)</Label>
            <Textarea id="draft-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
          <p className="text-xs text-muted-foreground">
            {items.length} item{items.length === 1 ? "" : "s"} will be saved.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={createDraft.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={createDraft.isPending || items.length === 0}>
            {createDraft.isPending ? "Saving…" : "Save draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveDraftDialog;
