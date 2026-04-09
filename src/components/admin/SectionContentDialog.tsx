import { useState, useEffect, lazy, Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const RichTextEditor = lazy(() => import("@/components/admin/RichTextEditor"));

interface SectionContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The section type (e.g. "contact_information", "terms_conditions") or article UUID */
  sectionType: string;
  /** Human-readable label */
  sectionLabel: string;
  /** If editing a knowledge article, pass the article ID */
  articleId?: string | null;
}

/**
 * Dialog for editing the rich-text content of a catalog section.
 * Fixed sections are stored as help_articles keyed by page_slug = section_type.
 * Knowledge articles are loaded by their UUID.
 */
const SectionContentDialog = ({
  open,
  onOpenChange,
  sectionType,
  sectionLabel,
  articleId,
}: SectionContentDialogProps) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);

  // Load content when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);

    const load = async () => {
      try {
        let data: any = null;

        if (articleId) {
          // Knowledge article by ID
          const { data: row } = await supabase
            .from("help_articles")
            .select("id, title, content, description")
            .eq("id", articleId)
            .maybeSingle();
          data = row;
        } else {
          // Fixed section by page_slug
          const { data: row } = await supabase
            .from("help_articles")
            .select("id, title, content, description")
            .eq("page_slug", sectionType)
            .eq("content_type", "knowledge")
            .maybeSingle();
          data = row;
        }

        if (data) {
          setRecordId(data.id);
          setTitle(data.title || sectionLabel);
          setContent(data.content || "");
          setDescription(data.description || "");
        } else {
          setRecordId(null);
          setTitle(sectionLabel);
          setContent("");
          setDescription("");
        }
      } catch (err: any) {
        console.error("Error loading section content:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, sectionType, articleId, sectionLabel]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (recordId) {
        const { error } = await supabase
          .from("help_articles")
          .update({
            title,
            content,
            description,
            updated_at: new Date().toISOString(),
          })
          .eq("id", recordId);
        if (error) throw error;
      } else {
        // Create new article for this fixed section
        const { error } = await (supabase.from("help_articles") as any).insert({
          title,
          content,
          description,
          page_slug: sectionType,
          content_type: "knowledge",
          visibility: "customer",
          category: "Catalog",
          is_active: true,
          sort_order: 0,
        });
        if (error) throw error;
      }

      qc.invalidateQueries({ queryKey: ["help-articles-catalog-public"] });
      qc.invalidateQueries({ queryKey: ["content_articles"] });
      qc.invalidateQueries({ queryKey: ["help_articles"] });
      toast({ title: "Section content saved" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-semibold text-foreground">
            Edit: {sectionLabel}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
            <div>
              <Label className="text-[11px] text-muted-foreground">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs mt-0.5"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Summary / Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-8 text-xs mt-0.5"
                placeholder="Brief summary shown in previews"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground mb-1 block">Content</Label>
              <Suspense fallback={<div className="h-[250px] border border-border rounded-lg animate-pulse bg-muted/20" />}>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Write a description..."
                  minHeight="250px"
                />
              </Suspense>
            </div>
          </div>
        )}

        <DialogFooter className="px-5 py-3 border-t border-border shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SectionContentDialog;
