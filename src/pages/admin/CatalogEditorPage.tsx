import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PricelistLivePreview from "@/components/admin/PricelistLivePreview";
import type { PricelistVersion } from "@/hooks/usePricelistVersions";
import { useCatalogTemplates, type CatalogTemplate } from "@/hooks/useCatalogTemplates";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ArrowLeft, Trash2, BookOpen, Palette, FileText, Layers, ArrowUp, ArrowDown, GripVertical, Pencil } from "lucide-react";
import SectionContentDialog from "@/components/admin/SectionContentDialog";
import PdfPreviewShell from "@/components/admin/PdfPreviewShell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { compareCategoryOrder } from "@/lib/sortOrder";

/* ─── Types ─── */
interface CatalogSection {
  id?: number;
  catalog_template_id: number;
  section_type: string;
  sort_order: number;
  is_included: boolean;
  pricelist_version_id: number | null;
  format_choice: string | null;
  article_id: string | null;
  custom_title: string | null;
}

/* ─── Hooks ─── */
const useAllPricelistVersions = () => {
  return useQuery<PricelistVersion[]>({
    queryKey: ["all-pricelist-versions-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricelist_versions")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as PricelistVersion[];
    },
  });
};

const useHelpArticlesForCatalog = () => {
  return useQuery({
    queryKey: ["help-articles-catalog-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("id, title, category, visibility, content, description")
        .eq("is_active", true)
        .in("content_type", ["knowledge", "faq"])
        .in("visibility", ["public", "customer"])
        .order("category")
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });
};

const useCatalogSectionsEditor = (templateId?: number) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["catalog-sections-editor", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_sections")
        .select("*")
        .eq("catalog_template_id", templateId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CatalogSection[];
    },
    enabled: !!templateId,
  });

  const addSection = useMutation({
    mutationFn: async (section: Omit<CatalogSection, "id">) => {
      const { error } = await supabase.from("catalog_sections").insert(section as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-sections-editor", templateId] }),
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CatalogSection> & { id: number }) => {
      const { error } = await supabase.from("catalog_sections").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-sections-editor", templateId] }),
  });

  const removeSection = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("catalog_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-sections-editor", templateId] }),
  });

  const reorderSections = useMutation({
    mutationFn: async (sections: { id: number; sort_order: number }[]) => {
      for (const s of sections) {
        await supabase.from("catalog_sections").update({ sort_order: s.sort_order } as any).eq("id", s.id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-sections-editor", templateId] }),
  });

  return { ...query, addSection, updateSection, removeSection, reorderSections };
};

/* ─── Section definitions ─── */
const PRICING_SECTIONS = [
  { type: "rx_prices", label: "RX Lens Prices", icon: "💊", needsVersion: true, hasFormat: true },
  { type: "stock_prices", label: "Stock Lens Prices", icon: "📦", needsVersion: true, hasFormat: false },
  { type: "supplies_prices", label: "Supplies Prices", icon: "🧪", needsVersion: true, hasFormat: false },
] as const;

const FIXED_SECTIONS = [
  { type: "terms_conditions", label: "Terms & Conditions", icon: "📋" },
  { type: "contact_information", label: "Contact Information", icon: "📞" },
  { type: "additional_charges", label: "Additional Charges", icon: "💰" },
  { type: "dispensing_guide", label: "Dispensing Guide", icon: "👓" },
  { type: "lablink_instructions", label: "LabLink Instructions", icon: "🔗" },
  { type: "special_services", label: "Special Services", icon: "⭐" },
] as const;

const ALL_SECTION_DEFS = [
  ...PRICING_SECTIONS.map((s) => ({ ...s, category: "pricing" as const })),
  { type: "knowledge_article", label: "Knowledge Article", icon: "📖", category: "content" as const, needsVersion: false, hasFormat: false },
  ...FIXED_SECTIONS.map((s) => ({ ...s, category: "fixed" as const, needsVersion: false, hasFormat: false })),
];

const getSectionDef = (type: string) => ALL_SECTION_DEFS.find((d) => d.type === type);
const getSectionLabel = (type: string) => getSectionDef(type)?.label ?? type;
const getSectionIcon = (type: string) => getSectionDef(type)?.icon ?? "📄";

const SECTION_TO_CATALOG_TYPE: Record<string, string> = {
  rx_prices: "rx",
  stock_prices: "stock",
  supplies_prices: "buysell",
};

const fmtPrice = (n: number | null) => n != null ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";

const KNOWLEDGE_TEXT_MODES = [
  { value: "summary", label: "Summary" },
  { value: "excerpt", label: "Extended Excerpt" },
  { value: "full", label: "Full Article" },
] as const;

/* ═══════════════════ Section Row ═══════════════════ */
const SectionRow = ({ section, index, total, versions, articles, onUpdate, onRemove, onMoveUp, onMoveDown }: {
  section: CatalogSection;
  index: number;
  total: number;
  versions: { id: number; name: string; format_type: string | null }[];
  articles: { id: string; title: string; category: string; content?: string; description?: string }[];
  onUpdate: (id: number, updates: Partial<CatalogSection>) => void;
  onRemove: (id: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) => {
  const isPricing = ["rx_prices", "stock_prices", "supplies_prices"].includes(section.section_type);
  const isKnowledge = section.section_type === "knowledge_article";
  const isFixed = !isPricing && !isKnowledge;
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  return (
    <div className="border rounded-lg p-3 bg-background group" style={{ borderColor: "hsl(var(--border))" }}>
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveUp} disabled={index === 0}>
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveDown} disabled={index === total - 1}>
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground/40" />
        <span className="text-sm">{getSectionIcon(section.section_type)}</span>
        <span className="text-xs font-medium flex-1 text-foreground">{getSectionLabel(section.section_type)}</span>
        {(isFixed || (isKnowledge && section.article_id)) && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setEditDialogOpen(true)} title="Edit content">
            <Pencil className="h-3 w-3" />
          </Button>
        )}
        <Checkbox
          checked={section.is_included !== false}
          onCheckedChange={(checked) => section.id && onUpdate(section.id, { is_included: !!checked })}
        />
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => section.id && onRemove(section.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {isPricing && (
        <div className="mt-2 pl-14 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Pricelist:</Label>
            <Select
              value={section.pricelist_version_id ? String(section.pricelist_version_id) : ""}
              onValueChange={(v) => section.id && onUpdate(section.id, { pricelist_version_id: Number(v) })}
            >
              <SelectTrigger className="h-7 text-[11px] w-48">
                <SelectValue placeholder="Select pricelist…" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)} className="text-xs">{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {section.section_type === "rx_prices" && (
            <RadioGroup
              value={section.format_choice || "list"}
              onValueChange={(v) => section.id && onUpdate(section.id, { format_choice: v })}
              className="flex gap-3"
            >
              <div className="flex items-center gap-1">
                <RadioGroupItem value="matrix" id={`fmt-matrix-${section.id}`} className="h-3 w-3" />
                <Label htmlFor={`fmt-matrix-${section.id}`} className="text-[10px]">Matrix</Label>
              </div>
              <div className="flex items-center gap-1">
                <RadioGroupItem value="list" id={`fmt-list-${section.id}`} className="h-3 w-3" />
                <Label htmlFor={`fmt-list-${section.id}`} className="text-[10px]">List</Label>
              </div>
            </RadioGroup>
          )}
        </div>
      )}

      {isKnowledge && (
        <div className="mt-2 pl-14 space-y-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Article (public Knowledge Base only)</Label>
            <Select
              value={section.article_id ? String(section.article_id) : ""}
              onValueChange={(v) => section.id && onUpdate(section.id, { article_id: v })}
            >
              <SelectTrigger className="h-7 text-[11px] w-72">
                <SelectValue placeholder="Select article…" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const grouped: Record<string, typeof articles> = {};
                  articles.forEach((a) => {
                    const cat = a.category || "Uncategorized";
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(a);
                  });
                  return Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat}>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{cat}</div>
                      {items.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)} className="text-xs">
                          {a.title}
                        </SelectItem>
                      ))}
                    </div>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Article Text Mode</Label>
            <Select
              value={section.format_choice || "summary"}
              onValueChange={(v) => section.id && onUpdate(section.id, { format_choice: v })}
            >
              <SelectTrigger className="h-7 text-[11px] w-40">
                <SelectValue placeholder="Select mode…" />
              </SelectTrigger>
              <SelectContent>
                {KNOWLEDGE_TEXT_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value} className="text-xs">
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Keep the section linked to the source article while controlling how much text appears.
            </p>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Custom Title Override (optional)</Label>
            <Input
              className="h-7 text-xs w-72 mt-0.5"
              placeholder={articles.find((a) => String(a.id) === String(section.article_id))?.title || "Use original title"}
              value={section.custom_title ?? ""}
              onChange={(e) => section.id && onUpdate(section.id, { custom_title: e.target.value || null })}
            />
          </div>
        </div>
      )}

      <SectionContentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        sectionType={section.section_type}
        sectionLabel={getSectionLabel(section.section_type)}
        articleId={isKnowledge ? section.article_id : undefined}
      />
    </div>
  );
};

/* ═══════════════════ Live Preview ═══════════════════ */
const EditorLivePreview = ({ template, sections, versions, articles, settings }: {
  template: CatalogTemplate;
  sections: CatalogSection[];
  versions: { id: number; name: string }[];
  articles: { id: string; title: string; category: string; content?: string; description?: string }[];
  settings: any;
}) => {
  const includedSections = sections.filter((s) => s.is_included !== false);

  const versionIds = useMemo(() => {
    const ids = new Set<number>();
    includedSections.forEach((s) => {
      if (s.pricelist_version_id) ids.add(s.pricelist_version_id);
    });
    return Array.from(ids);
  }, [includedSections]);

  const { data: allRows = [] } = useQuery({
    queryKey: ["catalog-preview-all-rows", versionIds],
    queryFn: async () => {
      if (versionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("pricelist_catalog_rows")
        .select("section, display_description, bbd_price, row_type, catalog_type, pricelist_version_id, sort_order")
        .in("pricelist_version_id", versionIds)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: versionIds.length > 0,
  });

  const { data: addons = [] } = useQuery({
    queryKey: ["catalog-preview-addons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addons")
        .select("name, price, category")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rowsByVersionType = useMemo(() => {
    const map: Record<string, Record<string, { description: string; price: number | null }[]>> = {};
    allRows.forEach((r: any) => {
      const key = `${r.pricelist_version_id}-${r.catalog_type}`;
      if (!map[key]) map[key] = {};
      if (!map[key][r.section]) map[key][r.section] = [];
      map[key][r.section].push({ description: r.display_description, price: r.bbd_price });
    });
    return map;
  }, [allRows]);

  const docStyles: React.CSSProperties = {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#1a202c",
    fontSize: "10px",
    lineHeight: 1.5,
    background: "white",
  };

  const isHtml = (text: string) => /<[a-z][\s\S]*>/i.test(text);

  const getKnowledgePreviewCopy = (article: { content?: string | null; description?: string | null } | null | undefined, mode: string | null) => {
    const description = article?.description ?? "";
    const content = article?.content ?? "";

    if (mode === "full") return { description, content };
    if (mode === "excerpt") {
      return {
        description,
        content: content.slice(0, 1800) + ((content.length ?? 0) > 1800 ? "…" : ""),
      };
    }

    return {
      description,
      content: content.slice(0, 700) + ((content.length ?? 0) > 700 ? "…" : ""),
    };
  };

  /** Sort section keys by canonical category order */
  const sortSectionKeys = (keys: string[]) =>
    [...keys].sort((a, b) => compareCategoryOrder(a, b));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40 no-print" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="flex gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono flex-1 text-center truncate">
          {template.name} — PDF Preview
        </span>
        <span className="text-[9px] text-muted-foreground">{includedSections.length} sections</span>
      </div>
      <ScrollArea className="flex-1 bg-muted/20">
        <div className="p-4">
          <div className="rounded shadow-lg border" style={{ ...docStyles, borderColor: "#e2e8f0" }}>
            {/* Cover */}
            <div
              className="flex flex-col items-center justify-center text-center text-white"
              style={{
                background: `linear-gradient(135deg, ${template.gradient_color_start || "#1e4db7"}, ${template.gradient_color_end || "#0f2a5e"})`,
                minHeight: 280,
                padding: "40px 24px",
                borderRadius: "4px 4px 0 0",
              }}
            >
              {settings?.logo_url && <img src={settings.logo_url} alt="Logo" className="h-10 mb-4 object-contain" />}
              <h1 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px", letterSpacing: "0.5px" }}>
                {template.cover_title || template.name}
              </h1>
              {template.cover_subtitle && (
                <p style={{ fontSize: "11px", opacity: 0.85, marginBottom: "16px" }}>{template.cover_subtitle}</p>
              )}
              {settings?.company_name && (
                <div style={{ marginTop: "auto", paddingTop: "24px", opacity: 0.6, fontSize: "9px" }}>
                  <div>{settings.company_name}</div>
                  {settings.tel && <div>{settings.tel} · {settings.email}</div>}
                </div>
              )}
            </div>

            {/* TOC */}
            {includedSections.length > 0 && (
              <div style={{ padding: "24px", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#2b6cb0", marginBottom: "12px", borderBottom: "2px solid #2b6cb0", paddingBottom: "6px" }}>
                  Table of Contents
                </div>
                {includedSections.map((s, i) => {
                  const vName = s.pricelist_version_id ? versions.find((v) => v.id === s.pricelist_version_id)?.name : null;
                  const art = s.article_id ? articles.find((a) => String(a.id) === String(s.article_id)) : null;
                  const label = s.section_type === "knowledge_article"
                    ? (s.custom_title || art?.title || "Article")
                    : getSectionLabel(s.section_type);
                  return (
                    <div key={s.id ?? i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px dotted #e2e8f0" }}>
                      <span style={{ color: "#2d3748", fontSize: "10px" }}>
                        {i + 1}. {label}{vName ? ` — ${vName}` : ""}
                      </span>
                      <span style={{ color: "#a0aec0", fontSize: "9px", fontFamily: "monospace" }}>{i + 2}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Section Pages */}
            {includedSections.map((s, i) => {
              const art = s.section_type === "knowledge_article"
                ? articles.find((a) => String(a.id) === String(s.article_id))
                : null;
              const label = s.section_type === "knowledge_article"
                ? (s.custom_title || art?.title || "Knowledge Article")
                : getSectionLabel(s.section_type);
              const isPricing = ["rx_prices", "stock_prices", "supplies_prices"].includes(s.section_type);
              const catalogType = SECTION_TO_CATALOG_TYPE[s.section_type];
              const dataKey = s.pricelist_version_id ? `${s.pricelist_version_id}-${catalogType}` : null;
              const sectionData = dataKey ? rowsByVersionType[dataKey] : null;
              const sectionKeys = sectionData ? sortSectionKeys(Object.keys(sectionData)) : [];

              return (
                <div key={s.id ?? i} style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{
                    background: "#2b6cb0", color: "white", padding: "6px 12px", fontSize: "10px",
                    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
                    marginBottom: "12px", borderRadius: "2px", display: "flex", alignItems: "center", gap: "6px",
                  }}>
                    <span>{getSectionIcon(s.section_type)}</span>
                    {label}
                    {s.format_choice && (
                      <span style={{ marginLeft: "auto", fontSize: "8px", opacity: 0.8, textTransform: "none", fontWeight: 400 }}>
                        ({s.format_choice})
                      </span>
                    )}
                  </div>

                  {isPricing && sectionKeys.length > 0 ? (
                    <div>
                      {sectionKeys.map((sectionName) => (
                        <div key={sectionName} style={{ marginBottom: "12px" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr>
                                <th
                                  colSpan={2}
                                  style={{
                                    textAlign: "left", padding: "6px 10px", fontSize: "9px", fontWeight: 700,
                                    textTransform: "uppercase", letterSpacing: "0.4px", color: "white",
                                    background: "#1e4db7",
                                  }}
                                >
                                  {sectionName} ({sectionData![sectionName].length})
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {sectionData![sectionName].map((row, idx) => (
                                <tr key={idx}>
                                  <td style={{ padding: "4px 10px", fontSize: "9px", borderBottom: "1px solid #edf2f7", color: "#2d3748" }}>{row.description}</td>
                                  <td style={{ padding: "4px 10px", fontSize: "9px", borderBottom: "1px solid #edf2f7", textAlign: "right", fontWeight: 600, color: "#1a202c", width: "70px" }}>
                                    ${fmtPrice(row.price)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  ) : isPricing && !s.pricelist_version_id ? (
                    <div style={{ textAlign: "center", padding: "16px", color: "#a0aec0", fontSize: "9px", fontStyle: "italic" }}>
                      Select a pricelist version to see pricing data
                    </div>
                  ) : isPricing ? (
                    <div style={{ textAlign: "center", padding: "16px", color: "#a0aec0", fontSize: "9px", fontStyle: "italic" }}>
                      No pricing rows found for this version
                    </div>
                  ) : null}

                  {art && (() => {
                    const previewCopy = getKnowledgePreviewCopy(art, s.format_choice);
                    return (
                      <div>
                        {previewCopy.description && (
                          <p style={{ fontSize: "9px", color: "#718096", fontStyle: "italic", marginBottom: "8px" }}>{previewCopy.description}</p>
                        )}
                        {previewCopy.content && isHtml(previewCopy.content) ? (
                          <div
                            className="prose prose-sm max-w-none [&_h1]:text-xs [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-[10px] [&_h3]:font-semibold [&_p]:text-[9px] [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:text-[9px] [&_a]:text-primary [&_a]:underline"
                            style={{ color: "#2d3748", lineHeight: 1.6 }}
                            dangerouslySetInnerHTML={{ __html: previewCopy.content }}
                          />
                        ) : (
                          <div style={{ fontSize: "9px", color: "#2d3748", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                            {previewCopy.content}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {!isPricing && !art && (
                    <div style={{ padding: "12px", background: "#f7fafc", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                      <p style={{ fontSize: "9px", color: "#718096", fontStyle: "italic" }}>
                        {label} content will be rendered from company settings and templates.
                      </p>
                    </div>
                  )}

                  <div style={{ textAlign: "center", marginTop: "12px", fontSize: "8px", color: "#a0aec0" }}>
                    Page {i + 2}
                  </div>
                </div>
              );
            })}

            {includedSections.length === 0 && (
              <div style={{ padding: "40px 24px", textAlign: "center", color: "#a0aec0", fontSize: "10px" }}>
                Add sections from the palette to see the catalog preview.
              </div>
            )}

            <div style={{ padding: "12px 24px", borderTop: "1px solid #e2e8f0", textAlign: "center", fontSize: "8px", color: "#a0aec0", borderRadius: "0 0 4px 4px", background: "#f7fafc" }}>
              {settings?.company_name && <div>{settings.company_name} — {settings?.slogan}</div>}
              {settings?.tel && <div style={{ marginTop: "2px" }}>{settings.tel} · {settings.email}</div>}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

/* ═══════════════════ Main Editor Page ═══════════════════ */
const CatalogEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: templates = [], updateMutation } = useCatalogTemplates();
  const { data: versions = [] } = useAllPricelistVersions();
  const { data: articles = [] } = useHelpArticlesForCatalog();
  const { data: settings } = useCompanySettings();
  const { toast } = useToast();

  const template = templates.find((t) => String(t.id) === id) ?? null;

  const [name, setName] = useState("");
  const [coverTitle, setCoverTitle] = useState("");
  const [coverSubtitle, setCoverSubtitle] = useState("");
  const [gradStart, setGradStart] = useState("#1e4db7");
  const [gradEnd, setGradEnd] = useState("#0f2a5e");

  const { data: sections = [], addSection, updateSection, removeSection, reorderSections } = useCatalogSectionsEditor(template?.id);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCoverTitle(template.cover_title ?? "");
      setCoverSubtitle(template.cover_subtitle ?? "");
      setGradStart(template.gradient_color_start ?? "#1e4db7");
      setGradEnd(template.gradient_color_end ?? "#0f2a5e");
    }
  }, [template]);

  const handleSave = useCallback(async () => {
    if (!template) return;
    try {
      await updateMutation.mutateAsync({
        id: template.id,
        name,
        cover_title: coverTitle,
        cover_subtitle: coverSubtitle,
        gradient_color_start: gradStart,
        gradient_color_end: gradEnd,
      });
      toast({ title: "Template saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }, [template, name, coverTitle, coverSubtitle, gradStart, gradEnd, updateMutation, toast]);

  const handleAddSection = async (sectionType: string) => {
    if (!template) return;
    const maxSort = sections.reduce((max, s) => Math.max(max, s.sort_order ?? 0), 0);
    try {
      await addSection.mutateAsync({
        catalog_template_id: template.id,
        section_type: sectionType,
        sort_order: maxSort + 1,
        is_included: true,
        pricelist_version_id: null,
        format_choice: sectionType === "knowledge_article" ? "summary" : sectionType === "rx_prices" ? "list" : null,
        article_id: null,
        custom_title: null,
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdateSection = async (id: number, updates: Partial<CatalogSection>) => {
    try {
      await updateSection.mutateAsync({ id, ...updates });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleRemoveSection = async (id: number) => {
    try {
      await removeSection.mutateAsync(id);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const reordered = [...sections];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    const updates = reordered.map((s, i) => ({ id: s.id!, sort_order: i }));
    try {
      await reorderSections.mutateAsync(updates);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const liveTemplate: CatalogTemplate = template
    ? { ...template, name, cover_title: coverTitle, cover_subtitle: coverSubtitle, gradient_color_start: gradStart, gradient_color_end: gradEnd }
    : { id: 0, name: "", cover_title: null, cover_subtitle: null, gradient_color_start: null, gradient_color_end: null, created_at: null, updated_at: null, created_by: null };

  if (!template) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar — like QuoteEditorPage */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button onClick={() => navigate("/admin/pricing/publisher")} className="p-1 rounded hover:bg-muted">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">{name || "Untitled Catalog"}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { handleSave().then(() => navigate("/admin/pricing/publisher")); }}>
            Save &amp; Exit
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleSave} disabled={updateMutation.isPending}>
            Save Template
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => { handleSave(); toast({ title: "Published" }); }}>
            Save &amp; Publish
          </Button>
        </div>
      </div>

      {/* Content — palette + builder + preview */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left: Palette */}
        <div className="w-48 shrink-0 border-r overflow-auto pr-2 p-3 space-y-3" style={{ borderColor: "hsl(var(--border))" }}>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <Layers className="h-3 w-3" /> Pricing
            </h4>
            {PRICING_SECTIONS.map((s) => (
              <button
                key={s.type}
                className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-muted/50 flex items-center gap-1.5 transition-colors text-foreground"
                onClick={() => handleAddSection(s.type)}
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> Content
            </h4>
            <button
              className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-muted/50 flex items-center gap-1.5 transition-colors text-foreground"
              onClick={() => handleAddSection("knowledge_article")}
            >
              📖 Knowledge Article
            </button>
            <p className="text-[9px] text-muted-foreground px-2 mt-1 leading-relaxed">
              Knowledge articles are pulled from Website Content → Knowledge Base (public ones only).
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Fixed Sections
            </h4>
            {FIXED_SECTIONS.map((s) => (
              <button
                key={s.type}
                className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-muted/50 flex items-center gap-1.5 transition-colors text-foreground"
                onClick={() => handleAddSection(s.type)}
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center builder + Right preview with resizable handle on left of preview */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={55} minSize={35}>
            <div className="overflow-auto h-full px-4 py-3 space-y-4">
              {/* Cover Settings */}
              <div className="border rounded-lg p-4" style={{ borderColor: "hsl(var(--border))" }}>
                <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-primary" /> Cover Settings
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px]">Catalog Name</Label>
                    <Input className="h-7 text-xs mt-0.5" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px]">Cover Title</Label>
                    <Input className="h-7 text-xs mt-0.5" value={coverTitle} onChange={(e) => setCoverTitle(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px]">Cover Subtitle</Label>
                    <Input className="h-7 text-xs mt-0.5" value={coverSubtitle} onChange={(e) => setCoverSubtitle(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3 col-span-2">
                    <div>
                      <Label className="text-[10px]">Gradient Start</Label>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input type="color" value={gradStart} onChange={(e) => setGradStart(e.target.value)} className="h-7 w-8 rounded border cursor-pointer" style={{ borderColor: "hsl(var(--border))" }} />
                        <Input className="h-7 text-[10px] w-20 font-mono" value={gradStart} onChange={(e) => setGradStart(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px]">Gradient End</Label>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input type="color" value={gradEnd} onChange={(e) => setGradEnd(e.target.value)} className="h-7 w-8 rounded border cursor-pointer" style={{ borderColor: "hsl(var(--border))" }} />
                        <Input className="h-7 text-[10px] w-20 font-mono" value={gradEnd} onChange={(e) => setGradEnd(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex-1 rounded-md h-7 ml-2" style={{ background: `linear-gradient(90deg, ${gradStart}, ${gradEnd})` }} />
                  </div>
                </div>
              </div>

              {/* Section Builder */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> Sections ({sections.length})
                </h3>
                {sections.length === 0 ? (
                  <div className="border border-dashed rounded-lg py-8 text-center text-xs text-muted-foreground" style={{ borderColor: "hsl(var(--border))" }}>
                    Click sections from the palette on the left to add them here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sections.map((s, i) => (
                      <SectionRow
                        key={s.id ?? i}
                        section={s}
                        index={i}
                        total={sections.length}
                        versions={versions}
                        articles={articles}
                        onUpdate={handleUpdateSection}
                        onRemove={handleRemoveSection}
                        onMoveUp={() => handleMove(i, -1)}
                        onMoveDown={() => handleMove(i, 1)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={45} minSize={25} maxSize={55}>
            <div className="h-full p-2">
              <PdfPreviewShell
                title={`${template.name} — Lens Catalog Builder Preview`}
                formatLabel={`${sections.filter((section) => section.is_included !== false).length} sections`}
                maxHeight="calc(100vh - 220px)"
              >
                <EditorLivePreview
                  template={liveTemplate}
                  sections={sections}
                  versions={versions}
                  articles={articles}
                  settings={settings}
                />
              </PdfPreviewShell>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default CatalogEditorPage;
