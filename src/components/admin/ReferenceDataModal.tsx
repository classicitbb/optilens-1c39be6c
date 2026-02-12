import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialName?: string;
  onSubmit: (name: string) => void;
  isPending?: boolean;
  entityLabel: string;
}

const ReferenceDataModal = ({ open, onOpenChange, mode, initialName = "", onSubmit, isPending, entityLabel }: Props) => {
  const [name, setName] = useState(initialName);
  useEffect(() => { if (open) setName(initialName); }, [open, initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ borderRadius: "4px" }}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {mode === "create" ? `Add ${entityLabel}` : `Edit ${entityLabel}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm mt-1"
              style={{ borderRadius: "4px" }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || isPending}
              className="text-xs"
              style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }}
            >
              {isPending ? "Saving..." : mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReferenceDataModal;
