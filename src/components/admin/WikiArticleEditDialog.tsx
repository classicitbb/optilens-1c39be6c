import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save } from "lucide-react";
import { useHelpArticles } from "@/hooks/useHelpArticles";
import { useToast } from "@/hooks/use-toast";
import { renderWikiContent } from "./wikiFormatting";
import { Checkbox } from "@/components/ui/checkbox";
import { ADMIN_CONTEXT_OPTIONS } from "@/lib/adminContexts";
import RichTextEditor from "./RichTextEditor";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { canViewContextSlug } from "@/lib/wikiPermissions";

interface WikiArticleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: {
    id?: string;
    title: string;
    content: string;
    category?: string;
    page_slug?: string;
    context_slugs?: string[];
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
  const { canView } = useRolePermissions();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: article?.id ?? "",
    title: article?.title ?? "",
    content: article?.content ?? "",
    category: article?.category ?? wikiHeadings[0]?.id ?? "",
    context_slugs: article?.context_slugs?.length ? article.context_slugs : [article?.page_slug ?? "knowledge/wiki"],
    sort_order: article?.sort_order ?? 0,
  });

  useEffect(() => {
    setForm({
      id: article?.id ?? "",
      title: article?.title ?? "",
      content: article?.content ?? "",
      category: article?.category ?? wikiHeadings[0]?.id ?? "",
      context_slugs: article?.context_slugs?.length ? article.context_slugs : [article?.page_slug ?? "knowledge/wiki"],
      sort_order: article?.sort_order ?? 0,
    });
  }, [article, wikiHeadings]);

  const visibleContextOptions = useMemo(
    () => ADMIN_CONTEXT_OPTIONS.filter((option) => canViewContextSlug(option.value, canView)),
    [canView]
  );

  const toggleContext = (slug: string) => {
    setForm((prev) => {
      const hasSlug = prev.context_slugs.includes(slug);
      if (hasSlug) {
        const remaining = prev.context_slugs.filter((entry) => entry !== slug);
        return { ...prev, context_slugs: remaining.length > 0 ? remaining : ["all"] };
      }
      return { ...prev, context_slugs: [...prev.context_slugs, slug] };
    });
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await upsertArticle({
        id: form.id || undefined,
        title: form.title,
        content: form.content,
        page_slug: form.context_slugs[0] ?? "all",
        context_slugs: form.context_slugs,
        sort_order: form.sort_order,
        category: form.category,
      } as any);
      toast({ title: form.id ? "Article updated" : "Article created" });
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      console.error("Wiki article save error:", err);
      toast({ title: "Error saving article", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[100vw] max-w-none h-[100dvh] rounded-none p-0 sm:rounded-lg sm:p-6 sm:h-auto sm:max-h-[95vh] sm:max-w-5xl lg:max-w-6xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-sm px-4 pt-4 sm:px-0 sm:pt-0">
            {form.id ? "Edit Article" : "New Article"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 px-4 sm:px-0 pb-24 sm:pb-0 overflow-y-auto">
          <div>
            <Label className="text-xs font-medium">Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-8 text-xs mt-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <Label className="text-xs font-medium">Context Pages</Label>
              <div className="mt-1 border border-border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                {visibleContextOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={form.context_slugs.includes(option.value)}
                      onCheckedChange={() => toggleContext(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
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
            <Tabs defaultValue="rich" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="rich">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="rich" className="space-y-2">
                <RichTextEditor
                  content={form.content}
                  onChange={(value) => setForm({ ...form, content: value })}
                  placeholder="Write wiki content..."
                  minHeight="280px"
                />
                <p className="text-[11px] text-muted-foreground">
                  Tip: use headings and lists to keep help content easy to scan.
                </p>
              </TabsContent>
              <TabsContent value="preview" className="rounded-md border border-border bg-muted/20 p-4">
                <div className="text-[13px] leading-relaxed space-y-1.5 text-muted-foreground">
                  {renderWikiContent(form.content)}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="fixed bottom-0 left-0 right-0 sm:static bg-background/95 backdrop-blur-sm border-t sm:border-0 border-border px-4 py-3 sm:px-0 sm:py-0 flex justify-end">
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
