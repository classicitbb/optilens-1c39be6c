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
  initialAbbrev?: string;
  initialCode?: string;
  onSubmit: (values: { name: string; abbrev: string; code: string }) => void;
  isPending?: boolean;
  entityLabel: string;
}

const ReferenceDataModal = ({ open, onOpenChange, mode, initialName = "", initialAbbrev = "", initialCode = "", onSubmit, isPending, entityLabel }: Props) => {
  const [name, setName] = useState(initialName);
  const [abbrev, setAbbrev] = useState(initialAbbrev);
  const [code, setCode] = useState(initialCode);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setAbbrev(initialAbbrev);
      setCode(initialCode);
    }
  }, [open, initialName, initialAbbrev, initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit({ name: name.trim(), abbrev: abbrev.trim(), code: code.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
              
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Abbrev</Label>
              <Input
                value={abbrev}
                onChange={(e) => setAbbrev(e.target.value)}
                className="h-8 text-sm mt-1"
                style={{ borderRadius: "4px" }}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label className="text-xs">Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-8 text-sm mt-1"
                style={{ borderRadius: "4px" }}
                placeholder="Optional"
              />
            </div>
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
