import { useState, useEffect, useCallback } from "react";
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
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ArrowLeft, Trash2, BookOpen, Palette, FileText, Layers, ArrowUp, ArrowDown, GripVertical, Pencil, ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import SectionContentDialog from "@/components/admin/SectionContentDialog";
import PdfPreviewShell from "@/components/admin/PdfPreviewShell";
import WikiArticleRenderer from "@/components/admin/WikiArticleRenderer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";


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
        .select("id, title, category, visibility, content, description, body_json, page_slug")
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
  { type: "custom_text", label: "Custom Text", icon: "📝" },
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

type CoverContent = {
  subtitle: string;
  body: string;
  footer: string;
  gradientAngle: number;
  gradientEnabled: boolean;
  invertText: boolean;
  logoUrl: string;
};

const parseCoverContent = (rawSubtitle: string | null | undefined): CoverContent => {
  const fallback: CoverContent = {
    subtitle: rawSubtitle ?? "",
    body: "",
    footer: "",
    gradientAngle: 135,
    gradientEnabled: true,
    invertText: false,
    logoUrl: "",
  };
  if (!rawSubtitle) return fallback;

  try {
    const parsed = JSON.parse(rawSubtitle) as Partial<CoverContent>;
    if (typeof parsed !== "object" || parsed === null) return fallback;
    return {
      subtitle: typeof parsed.subtitle === "string" ? parsed.subtitle : "",
      body: typeof parsed.body === "string" ? parsed.body : "",
      footer: typeof parsed.footer === "string" ? parsed.footer : "",
      gradientAngle: typeof parsed.gradientAngle === "number" ? parsed.gradientAngle : 135,
      gradientEnabled: typeof parsed.gradientEnabled === "boolean" ? parsed.gradientEnabled : true,
      invertText: typeof parsed.invertText === "boolean" ? parsed.invertText : false,
      logoUrl: typeof parsed.logoUrl === "string" ? parsed.logoUrl : "",
    };
  } catch {
    return fallback;
  }
};

const serializeCoverContent = (coverContent: CoverContent): string | null => {
  if (!coverContent.subtitle.trim() && !coverContent.body.trim() && !coverContent.footer.trim() && !coverContent.logoUrl.trim()) {
    return null;
  }

  if (!coverContent.body.trim() && !coverContent.footer.trim() && coverContent.gradientAngle === 135 && coverContent.gradientEnabled && !coverContent.invertText && !coverContent.logoUrl.trim()) {
    return coverContent.subtitle;
  }

  return JSON.stringify(coverContent);
};

const sanitizeLogoUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? trimmed : "";
  } catch {
    return "";
  }
};

/* ═══════════════════ Section Row ═══════════════════ */
const SectionRow = ({ section, index, total, versions, articles, onUpdate, onRemove, onMoveUp, onMoveDown }: {
  section: CatalogSection;
  index: number;
  total: number;
  versions: { id: number; name: string; format_type: string | null }[];
  articles: { id: string; title: string; category: string; content?: string; body_json?: any; description?: string }[];
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
const EditorLivePreview = ({ template, sections, versions, articles, settings, coverContent }: {
  template: CatalogTemplate;
  sections: CatalogSection[];
  versions: PricelistVersion[];
  articles: { id: string; title: string; category: string; content?: string; body_json?: any; description?: string; page_slug?: string | null }[];
  settings: any;
  coverContent: CoverContent;
}) => {
  const includedSections = sections.filter((s) => s.is_included !== false);

  const getKnowledgePreviewCopy = (article: { content?: string | null; body_json?: unknown; description?: string | null } | null | undefined, mode: string | null) => {
    const description = article?.description ?? "";
    const content = article?.content ?? "";
    if (mode === "full") return { description, content, bodyJson: article?.body_json ?? null };
    if (mode === "excerpt") return { description, content: content.slice(0, 1800) + (content.length > 1800 ? "…" : ""), bodyJson: null };
    return { description, content: content.slice(0, 700) + (content.length > 700 ? "…" : ""), bodyJson: null };
  };

  const docStyles: React.CSSProperties = {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#1a202c",
    fontSize: "10px",
    lineHeight: 1.5,
    background: "white",
  };

  const effectiveLogoUrl = sanitizeLogoUrl(coverContent.logoUrl) || settings?.logo_url || "";

  return (
    <div style={docStyles}>
      {/* Cover */}
      <div
        style={{
          background: coverContent.gradientEnabled
            ? `linear-gradient(${coverContent.gradientAngle}deg, ${template.gradient_color_start || "#1e4db7"}, ${template.gradient_color_end || "#0f2a5e"})`
            : "#ffffff",
          minHeight: 760,
          color: coverContent.invertText ? "#0f172a" : "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "28px 32px",
          pageBreakAfter: "always",
          breakAfter: "page",
        }}
      >
        <div style={{ textAlign: "center" }}>
          {effectiveLogoUrl && (
            <img src={effectiveLogoUrl} alt="Logo" className="h-8 mb-4 mx-auto object-contain" />
          )}
          <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "10px", letterSpacing: "0.5px" }}>
            {template.cover_title || template.name}
          </h1>
          {coverContent.subtitle && (
            <p style={{ fontSize: "12px", opacity: 0.9, marginBottom: "16px" }}>{coverContent.subtitle}</p>
          )}
          {coverContent.body && (
            <p style={{ fontSize: "10px", opacity: 0.85, maxWidth: 500, margin: "0 auto", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {coverContent.body}
            </p>
          )}
        </div>
        <div style={{ textAlign: "center", opacity: 0.8, fontSize: "9px", whiteSpace: "pre-wrap" }}>
          {coverContent.footer || settings?.company_name || ""}
          {!coverContent.footer && settings?.tel && <div style={{ marginTop: 4 }}>{settings.tel} · {settings.email}</div>}
        </div>
      </div>

      {/* TOC */}
      {includedSections.length > 0 && (
        <div style={{ padding: "24px", borderBottom: "1px solid #e2e8f0", minHeight: 760, pageBreakAfter: "always", breakAfter: "page" }}>
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
              const fixedArticle = s.section_type !== "knowledge_article"
                ? articles.find((a) => a.page_slug === s.section_type)
                : null;
              const label = s.section_type === "knowledge_article"
                ? (s.custom_title || art?.title || "Knowledge Article")
                : getSectionLabel(s.section_type);
              const isPricing = ["rx_prices", "stock_prices", "supplies_prices"].includes(s.section_type);
              const catalogType = SECTION_TO_CATALOG_TYPE[s.section_type] as "rx" | "stock" | "buysell" | undefined;
              const version = s.pricelist_version_id ? versions.find((v) => v.id === s.pricelist_version_id) : null;
              const previewFormat: "matrix" | "list" = (s.section_type === "rx_prices" && s.format_choice === "matrix") ? "matrix" : "list";

              return (
                <div
                  key={s.id ?? i}
                  style={{
                    padding: "4px 0",
                    borderBottom: "1px solid #e2e8f0",
                    minHeight: 760,
                    pageBreakAfter: "always",
                    breakAfter: "page",
                    pageBreakInside: "avoid",
                    breakInside: "avoid",
                  }}
                >
                  {/* Pricing sections: embed PricelistLivePreview directly */}
                  {isPricing && version && catalogType ? (
                    <PricelistLivePreview
                      version={version}
                      previewFormat={previewFormat}
                      showUSD={false}
                      fxRate={1}
                      catalogType={catalogType}
                    />
                  ) : isPricing && !s.pricelist_version_id ? (
                    <div style={{ textAlign: "center", padding: "16px", color: "#a0aec0", fontSize: "9px", fontStyle: "italic" }}>
                      Select a pricelist version to see pricing data
                    </div>
                  ) : isPricing ? (
                    <div style={{ textAlign: "center", padding: "16px", color: "#a0aec0", fontSize: "9px", fontStyle: "italic" }}>
                      No pricing rows found for this version
                    </div>
                  ) : null}

                  {/* Knowledge article sections */}
                  {art && (() => {
                    const previewCopy = getKnowledgePreviewCopy(art, s.format_choice);
                    return (
                      <div style={{ padding: "16px 24px" }}>
                        <div style={{
                          background: "#2b6cb0", color: "white", padding: "6px 12px", fontSize: "10px",
                          fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
                          marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px",
                        }}>
                          <span>{getSectionIcon(s.section_type)}</span>
                          {label}
                        </div>
                        {previewCopy.description && (
                          <p style={{ fontSize: "9px", color: "#718096", fontStyle: "italic", marginBottom: "8px" }}>{previewCopy.description}</p>
                        )}
                        <WikiArticleRenderer
                          bodyJson={previewCopy.bodyJson as any}
                          legacyContent={previewCopy.content}
                          className="prose prose-sm max-w-none [&_h1]:text-xs [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-[10px] [&_h3]:font-semibold [&_p]:text-[9px] [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:text-[9px] [&_a]:text-primary [&_a]:underline"
                        />
                      </div>
                    );
                  })()}

                  {/* Fixed sections: render stored article if available */}
                  {!isPricing && !art && fixedArticle && (
                    <div style={{ padding: "16px 24px" }}>
                      <div style={{
                        background: "#2b6cb0", color: "white", padding: "6px 12px", fontSize: "10px",
                        fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
                        marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px",
                      }}>
                        <span>{getSectionIcon(s.section_type)}</span>
                        {label}
                      </div>
                      {fixedArticle.description && (
                        <p style={{ fontSize: "9px", color: "#718096", fontStyle: "italic", marginBottom: "8px" }}>{fixedArticle.description}</p>
                      )}
                      <WikiArticleRenderer
                        bodyJson={fixedArticle.body_json as any}
                        legacyContent={fixedArticle.content}
                        className="prose prose-sm max-w-none [&_h1]:text-xs [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-[10px] [&_h3]:font-semibold [&_p]:text-[9px] [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:text-[9px] [&_a]:text-primary [&_a]:underline"
                      />
                    </div>
                  )}

                  {/* Fixed sections fallback */}
                  {!isPricing && !art && !fixedArticle && (
                    <div style={{ padding: "16px 24px" }}>
                      <div style={{
                        background: "#2b6cb0", color: "white", padding: "6px 12px", fontSize: "10px",
                        fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
                        marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px",
                      }}>
                        <span>{getSectionIcon(s.section_type)}</span>
                        {label}
                      </div>
                      <div style={{ padding: "12px", background: "#f7fafc", border: "1px solid #e2e8f0" }}>
                        <p style={{ fontSize: "9px", color: "#718096", fontStyle: "italic" }}>
                          {label} content will be rendered from company settings and templates.
                        </p>
                      </div>
                    </div>
                  )}

                  <div style={{ textAlign: "center", marginTop: "8px", paddingBottom: "8px", fontSize: "8px", color: "#a0aec0" }}>
                    Page {i + 2}
                  </div>
                </div>
              );
            })}

      {includedSections.length === 0 && (
        <div style={{ padding: "40px 24px", textAlign: "center", color: "#a0aec0", fontSize: "10px", minHeight: 760 }}>
          Add sections from the palette to see the catalog preview.
        </div>
      )}

      <div style={{ padding: "12px 24px", borderTop: "1px solid #e2e8f0", textAlign: "center", fontSize: "8px", color: "#a0aec0", background: "#f7fafc" }}>
        {settings?.company_name && <div>{settings.company_name} — {settings?.slogan}</div>}
        {settings?.tel && <div style={{ marginTop: "2px" }}>{settings.tel} · {settings.email}</div>}
      </div>
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
  const [coverBody, setCoverBody] = useState("");
  const [coverFooter, setCoverFooter] = useState("");
  const [coverGradientAngle, setCoverGradientAngle] = useState(135);
  const [coverGradientEnabled, setCoverGradientEnabled] = useState(true);
  const [coverInvertText, setCoverInvertText] = useState(false);
  const [coverLogoUrl, setCoverLogoUrl] = useState("");
  const [coverSettingsOpen, setCoverSettingsOpen] = useState(true);
  const [gradStart, setGradStart] = useState("#1e4db7");
  const [gradEnd, setGradEnd] = useState("#0f2a5e");

  const { data: sections = [], addSection, updateSection, removeSection, reorderSections } = useCatalogSectionsEditor(template?.id);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCoverTitle(template.cover_title ?? "");
      const parsedCover = parseCoverContent(template.cover_subtitle);
      setCoverSubtitle(parsedCover.subtitle);
      setCoverBody(parsedCover.body);
      setCoverFooter(parsedCover.footer);
      setCoverGradientAngle(parsedCover.gradientAngle);
      setCoverGradientEnabled(parsedCover.gradientEnabled);
      setCoverInvertText(parsedCover.invertText);
      setCoverLogoUrl(parsedCover.logoUrl);
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
        cover_subtitle: serializeCoverContent({
          subtitle: coverSubtitle,
          body: coverBody,
          footer: coverFooter,
          gradientAngle: coverGradientAngle,
          gradientEnabled: coverGradientEnabled,
          invertText: coverInvertText,
          logoUrl: coverLogoUrl,
        }),
        gradient_color_start: gradStart,
        gradient_color_end: gradEnd,
      });
      toast({ title: "Template saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }, [template, name, coverTitle, coverSubtitle, coverBody, coverFooter, coverGradientAngle, coverGradientEnabled, coverInvertText, coverLogoUrl, gradStart, gradEnd, updateMutation, toast]);

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
    ? { ...template, name, cover_title: coverTitle, cover_subtitle: serializeCoverContent({ subtitle: coverSubtitle, body: coverBody, footer: coverFooter, gradientAngle: coverGradientAngle, gradientEnabled: coverGradientEnabled, invertText: coverInvertText, logoUrl: coverLogoUrl }), gradient_color_start: gradStart, gradient_color_end: gradEnd }
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
                <button className="w-full flex items-center justify-between text-xs font-semibold text-foreground mb-3" onClick={() => setCoverSettingsOpen((v) => !v)}>
                  <span className="flex items-center gap-1.5"><Palette className="h-3.5 w-3.5 text-primary" /> Cover Settings</span>
                  {coverSettingsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {coverSettingsOpen && <div className="grid grid-cols-2 gap-3">
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
                  <div className="col-span-2">
                    <Label className="text-[10px]">Cover Body</Label>
                    <textarea className="w-full mt-0.5 border border-input rounded-md bg-transparent px-2 py-1.5 text-xs min-h-16" value={coverBody} onChange={(e) => setCoverBody(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px]">Cover Footer</Label>
                    <Input className="h-7 text-xs mt-0.5" value={coverFooter} onChange={(e) => setCoverFooter(e.target.value)} placeholder="Company footer or campaign tagline" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px]">Cover Logo URL Override</Label>
                    <Input className="h-7 text-xs mt-0.5" value={coverLogoUrl} onChange={(e) => setCoverLogoUrl(e.target.value)} placeholder="https://..." type="url" />
                    <p className="text-[10px] text-muted-foreground mt-1">Paste an absolute URL (https://...) to override the default company logo.</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-4">
                    <label className="text-[10px] flex items-center gap-2"><input type="checkbox" checked={coverGradientEnabled} onChange={(e) => setCoverGradientEnabled(e.target.checked)} />Gradient enabled</label>
                    <label className="text-[10px] flex items-center gap-2"><input type="checkbox" checked={coverInvertText} onChange={(e) => setCoverInvertText(e.target.checked)} />Dark text</label>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px]">Gradient Angle ({coverGradientAngle}°)</Label>
                    <input type="range" min={0} max={360} step={5} value={coverGradientAngle} onChange={(e) => setCoverGradientAngle(Number(e.target.value))} className="w-full mt-1" />
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
                </div>}
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

          <ResizableHandle withHandle className="relative z-20 bg-border/80 hover:bg-primary/40 data-[dragging=true]:bg-primary/60" />

          <ResizablePanel defaultSize={45} minSize={25} maxSize={55}>
            <div className="h-full p-2">
              <PdfPreviewShell
                title={`${template.name} — Lens Catalog Builder Preview`}
                formatLabel={`${sections.filter((section) => section.is_included !== false).length} sections`}
                maxHeight="calc(100vh - 220px)"
                headerRight={<Button variant="ghost" size="sm" className="h-7 text-xs gap-1"><Settings2 className="h-3.5 w-3.5" />Preview Settings</Button>}
              >
                <EditorLivePreview
                  template={liveTemplate}
                  sections={sections}
                  versions={versions}
                  articles={articles}
                  settings={settings}
                  coverContent={{ subtitle: coverSubtitle, body: coverBody, footer: coverFooter, gradientAngle: coverGradientAngle, gradientEnabled: coverGradientEnabled, invertText: coverInvertText, logoUrl: coverLogoUrl }}
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
