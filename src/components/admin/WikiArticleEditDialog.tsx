import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { useHelpArticles } from "@/hooks/useHelpArticles";
import { useToast } from "@/hooks/use-toast";
import { renderWikiContent } from "./wikiFormatting";

const PAGE_SLUGS = [
  { value: "all", label: "All Pages" },
  { value: "wiki", label: "Wiki" },
  { value: "catalog", label: "Product Catalog" },
  { value: "reference", label: "Reference Data" },
  { value: "imports", label: "Imports" },
  { value: "rx-lens-prices", label: "RX Lens Prices" },
  { value: "stock-lens-prices", label: "Stock Lens Prices" },
  { value: "supplies-prices", label: "Supplies Prices" },
  { value: "quotations", label: "Quotations" },
  { value: "costings/shipments", label: "Import Costings" },
  { value: "users", label: "Users" },
  { value: "parameters", label: "Settings" },
  { value: "content", label: "Content" },
];

interface WikiArticleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: {
    id?: string;
    title: string;
    content: string;
    category?: string;
    page_slug?: string;
    sort_order?: number;
  } | null;
  wikiHeadings: { id: string; title: string }[];
  onSaved?: () => void;
}

const WikiArticleEditDialog = ({
  open,
  onOpenChange,
  article,
  wikiHeadings,
  onSaved,
}: WikiArticleEditDialogProps) => {
  const { upsertArticle } = useHelpArticles();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: article?.id ?? "",
    title: article?.title ?? "",
    content: article?.content ?? "",
    category: article?.category ?? wikiHeadings[0]?.id ?? "",
    page_slug: article?.page_slug ?? "wiki",
    sort_order: article?.sort_order ?? 0,
  });

  const [lastArticleId, setLastArticleId] = useState(article?.id);
  if (article?.id !== lastArticleId) {
    setLastArticleId(article?.id);
    setForm({
      id: article?.id ?? "",
      title: article?.title ?? "",
      content: article?.content ?? "",
      category: article?.category ?? wikiHeadings[0]?.id ?? "",
      page_slug: article?.page_slug ?? "wiki",
      sort_order: article?.sort_order ?? 0,
    });
  }

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await upsertArticle({
        id: form.id || undefined,
        title: form.title,
        content: form.content,
        page_slug: form.page_slug,
        sort_order: form.sort_order,
        category: form.category,
      } as any);
      toast({ title: form.id ? "Article updated" : "Article created" });
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast({ title: "Error saving article", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {form.id ? "Edit Article" : "New Article"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-medium">Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-8 text-xs mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Wiki Heading</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Select heading…" />
                </SelectTrigger>
                <SelectContent>
                  {wikiHeadings.map((h) => (
                    <SelectItem key={h.id} value={h.id} className="text-xs">
                      {h.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Context Page</Label>
              <Select value={form.page_slug} onValueChange={(v) => setForm({ ...form, page_slug: v })}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SLUGS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium">Sort Order</Label>
            <Input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              className="h-8 text-xs w-20 mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-medium mb-1 block">Content</Label>
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit">Edit Source</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="space-y-2">
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Use **Heading** for section titles, bullets with - or •, and blank lines between sections."
                  className="min-h-[280px] font-mono text-xs leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Tip: use <span className="font-medium">**Heading**</span> for section titles and regular lines for paragraph copy.
                </p>
              </TabsContent>
              <TabsContent value="preview" className="rounded-md border border-border bg-muted/20 p-4">
                <div className="text-[13px] leading-relaxed space-y-1.5 text-muted-foreground">
                  {renderWikiContent(form.content)}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save Article"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WikiArticleEditDialog;
