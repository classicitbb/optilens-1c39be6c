import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import PricelistLivePreview from "@/components/admin/PricelistLivePreview";
import type { PricelistVersion } from "@/hooks/usePricelistVersions";
import { useCatalogTemplates, type CatalogTemplate } from "@/hooks/useCatalogTemplates";
import { useCompanySettings, type CompanySettings } from "@/hooks/useCompanySettings";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ArrowLeft, Trash2, BookOpen, Palette, FileText, Layers, ArrowUp, ArrowDown, GripVertical, Pencil, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import SectionContentDialog from "@/components/admin/SectionContentDialog";
import PdfPreviewShell from "@/components/admin/PdfPreviewShell";
import WikiArticleRenderer from "@/components/admin/WikiArticleRenderer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

const CATALOG_ASSET_BUCKET = "data-files";
const DESKTOP_WORKSPACE_MIN_WIDTH = 1560;
const PREVIEW_PANEL_MIN_WIDTH = 720;

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

interface CatalogArticleOption {
  id: string;
  title: string;
  category: string;
  content?: string;
  description?: string;
  page_slug?: string | null;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Something went wrong.";
};

/* ─── Hooks ─── */
const useAllPricelistVersions = () => {
  return useQuery<PricelistVersion[]>({
    queryKey: ["all-pricelist-versions-full"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("pricelist_versions") as any)
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
      const { data, error } = await (supabase.from("help_articles") as any)
        .select("id, title, category, visibility, content, description, page_slug")
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
      const { data, error } = await (supabase.from("catalog_sections") as any)
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
      const { error } = await (supabase.from("catalog_sections") as any).insert([section]);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-sections-editor", templateId] }),
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CatalogSection> & { id: number }) => {
      const { error } = await (supabase.from("catalog_sections") as any).update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-sections-editor", templateId] }),
  });

  const removeSection = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await (supabase.from("catalog_sections") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-sections-editor", templateId] }),
  });

  const reorderSections = useMutation({
    mutationFn: async (sections: { id: number; sort_order: number }[]) => {
      for (const s of sections) {
        await (supabase.from("catalog_sections") as any).update({ sort_order: s.sort_order }).eq("id", s.id);
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

const PUBLISHABLE_PRICING_SECTION_TYPES = new Set(["rx_prices", "stock_prices", "supplies_prices"]);

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
  backgroundUrl: string;
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
    backgroundUrl: "",
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
      backgroundUrl: typeof parsed.backgroundUrl === "string" ? parsed.backgroundUrl : "",
    };
  } catch {
    return fallback;
  }
};

const serializeCoverContent = (coverContent: CoverContent): string | null => {
  if (!coverContent.subtitle.trim() && !coverContent.body.trim() && !coverContent.footer.trim() && !coverContent.logoUrl.trim() && !coverContent.backgroundUrl.trim()) {
    return null;
  }

  if (!coverContent.body.trim() && !coverContent.footer.trim() && coverContent.gradientAngle === 135 && coverContent.gradientEnabled && !coverContent.invertText && !coverContent.logoUrl.trim() && !coverContent.backgroundUrl.trim()) {
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

const validateImageFile = (file: File): string | null => {
  if (!file.type.startsWith("image/")) return "Please upload an image file.";
  if (file.size > 8 * 1024 * 1024) return "Image must be 8MB or smaller.";
  return null;
};

/* ═══════════════════ Section Row ═══════════════════ */
const SectionRow = ({ section, index, total, versions, articles, onUpdate, onRemove, onMoveUp, onMoveDown }: {
  section: CatalogSection;
  index: number;
  total: number;
  versions: { id: number; name: string; format_type: string | null }[];
  articles: CatalogArticleOption[];
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
    <div className="group rounded-lg border bg-background p-2.5" style={{ borderColor: "hsl(var(--border))" }}>
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
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-11">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Pricelist:</Label>
            <Select
              value={section.pricelist_version_id ? String(section.pricelist_version_id) : ""}
              onValueChange={(v) => section.id && onUpdate(section.id, { pricelist_version_id: Number(v) })}
            >
              <SelectTrigger className="h-7 w-44 text-[11px]">
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
        <div className="mt-2 space-y-1.5 pl-11">
          <div>
            <Label className="text-[10px] text-muted-foreground">Article (public Knowledge Base only)</Label>
            <Select
              value={section.article_id ? String(section.article_id) : ""}
              onValueChange={(v) => section.id && onUpdate(section.id, { article_id: v })}
            >
              <SelectTrigger className="h-7 w-72 text-[11px]">
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
              className="mt-0.5 h-7 w-72 text-xs"
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
  articles: CatalogArticleOption[];
  settings: CompanySettings | null | undefined;
  coverContent: CoverContent;
}) => {
  const includedSections = sections.filter((s) => s.is_included !== false);

  const getKnowledgePreviewCopy = (article: { content?: string | null; description?: string | null } | null | undefined, mode: string | null) => {
    const description = article?.description ?? "";
    const content = article?.content ?? "";
    if (mode === "full") return { description, content };
    if (mode === "excerpt") return { description, content: content.slice(0, 1800) + (content.length > 1800 ? "…" : "") };
    return { description, content: content.slice(0, 700) + (content.length > 700 ? "…" : "") };
  };

  const docStyles: React.CSSProperties = {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#1a202c",
    fontSize: "13px",
    lineHeight: 1.5,
    background: "white",
  };

  const effectiveLogoUrl = sanitizeLogoUrl(coverContent.logoUrl) || settings?.logo_url || "";
  const effectiveBackgroundUrl = sanitizeLogoUrl(coverContent.backgroundUrl);

  return (
    <div style={docStyles}>
      {/* Cover */}
      <div
        style={{
          background: effectiveBackgroundUrl
            ? `${coverContent.gradientEnabled ? `linear-gradient(${coverContent.gradientAngle}deg, ${template.gradient_color_start || "#1e4db7cc"}, ${template.gradient_color_end || "#0f2a5ecc"}),` : ""} url('${effectiveBackgroundUrl}') center / cover no-repeat`
            : coverContent.gradientEnabled
              ? `linear-gradient(${coverContent.gradientAngle}deg, ${template.gradient_color_start || "#1e4db7"}, ${template.gradient_color_end || "#0f2a5e"})`
              : "#ffffff",
          minHeight: 1040,
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
        <div style={{ padding: "24px", borderBottom: "1px solid #e2e8f0", minHeight: 760, pageBreakAfter: "always", breakAfter: "page", pageBreakBefore: "always", breakBefore: "page" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#2b6cb0", marginBottom: "12px", borderBottom: "2px solid #2b6cb0", paddingBottom: "6px" }}>
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
                      <span style={{ color: "#2d3748", fontSize: "13px", lineHeight: 1.25 }}>
                        {i + 1}. {label}{vName ? ` — ${vName}` : ""}
                      </span>
                      <span style={{ color: "#a0aec0", fontSize: "13px", fontFamily: "monospace", lineHeight: 1.25 }}>{i + 2}</span>
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
                    pageBreakInside: "auto",
                    breakInside: "auto",
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
                          background: "#2b6cb0", color: "white", padding: "6px 12px", fontSize: "12px",
                          fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
                          marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px",
                        }}>
                          <span>{getSectionIcon(s.section_type)}</span>
                          {label}
                        </div>
                        {previewCopy.description && (
                          <p style={{ fontSize: "13px", color: "#718096", fontStyle: "italic", marginBottom: "8px", lineHeight: 1.35 }}>{previewCopy.description}</p>
                        )}
                        <WikiArticleRenderer
                          legacyContent={previewCopy.content}
                          className="prose max-w-none [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-[13px] [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-[13px] [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-[12px] [&_h3]:font-semibold [&_p]:my-1.5 [&_p]:text-[13px] [&_p]:leading-[1.35] [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:text-[13px] [&_li]:leading-[1.35] [&_a]:text-primary [&_a]:underline"
                        />
                      </div>
                    );
                  })()}

                  {/* Fixed sections: render stored article if available */}
                  {!isPricing && !art && fixedArticle && (
                    <div style={{ padding: "16px 24px" }}>
                      <div style={{
                        background: "#2b6cb0", color: "white", padding: "6px 12px", fontSize: "12px",
                        fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
                        marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px",
                      }}>
                        <span>{getSectionIcon(s.section_type)}</span>
                        {label}
                      </div>
                      {fixedArticle.description && (
                        <p style={{ fontSize: "13px", color: "#718096", fontStyle: "italic", marginBottom: "8px", lineHeight: 1.35 }}>{fixedArticle.description}</p>
                      )}
                      <WikiArticleRenderer
                        legacyContent={fixedArticle.content}
                        className="prose max-w-none [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-[13px] [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-[13px] [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-[12px] [&_h3]:font-semibold [&_p]:my-1.5 [&_p]:text-[13px] [&_p]:leading-[1.35] [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:text-[13px] [&_li]:leading-[1.35] [&_a]:text-primary [&_a]:underline"
                      />
                    </div>
                  )}

                  {/* Fixed sections fallback */}
                  {!isPricing && !art && !fixedArticle && (
                    <div style={{ padding: "16px 24px" }}>
                      <div style={{
                        background: "#2b6cb0", color: "white", padding: "6px 12px", fontSize: "12px",
                        fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
                        marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px",
                      }}>
                        <span>{getSectionIcon(s.section_type)}</span>
                        {label}
                      </div>
                      <div style={{ padding: "12px", background: "#f7fafc", border: "1px solid #e2e8f0" }}>
                        <p style={{ fontSize: "13px", color: "#718096", fontStyle: "italic", lineHeight: 1.35 }}>
                          {label} content will be rendered from company settings and templates.
                        </p>
                      </div>
                    </div>
                  )}
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
  const { data: templates = [], updateMutation, publishToCanvasMutation } = useCatalogTemplates();
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
  const [coverBackgroundUrl, setCoverBackgroundUrl] = useState("");
  const [coverSettingsOpen, setCoverSettingsOpen] = useState(false);
  const [gradStart, setGradStart] = useState("#1e4db7");
  const [gradEnd, setGradEnd] = useState("#0f2a5e");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [publishToCanvasDialogOpen, setPublishToCanvasDialogOpen] = useState(false);

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
      setCoverBackgroundUrl(parsedCover.backgroundUrl);
      setGradStart(template.gradient_color_start ?? "#1e4db7");
      setGradEnd(template.gradient_color_end ?? "#0f2a5e");
      setStatus(template.status === "published" ? "published" : "draft");
    }
  }, [template]);

  const validatePublish = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === "Untitled Catalog") {
      toast({
        title: "Cannot publish catalog",
        description: "Give the catalog a real name before publishing.",
        variant: "destructive",
      });
      return false;
    }

    const includedSections = sections.filter((section) => section.is_included !== false);
    if (includedSections.length === 0) {
      toast({
        title: "Cannot publish catalog",
        description: "Include at least one section before publishing.",
        variant: "destructive",
      });
      return false;
    }

    const missingPricelistSection = includedSections.find(
      (section) =>
        PUBLISHABLE_PRICING_SECTION_TYPES.has(section.section_type) &&
        !section.pricelist_version_id,
    );

    if (missingPricelistSection) {
      toast({
        title: "Cannot publish catalog",
        description: `${getSectionLabel(missingPricelistSection.section_type)} needs a pricelist version before publishing.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [name, sections, toast]);

  const handleSave = useCallback(async (
    options?: {
      nextStatus?: "draft" | "published";
      successTitle?: string;
      successDescription?: string;
    },
  ) => {
    if (!template) return;

    const nextStatus = options?.nextStatus ?? status;
    try {
      await updateMutation.mutateAsync({
        id: template.id,
        name,
        status: nextStatus,
        cover_title: coverTitle,
        cover_subtitle: serializeCoverContent({
          subtitle: coverSubtitle,
          body: coverBody,
          footer: coverFooter,
          gradientAngle: coverGradientAngle,
          gradientEnabled: coverGradientEnabled,
          invertText: coverInvertText,
          logoUrl: coverLogoUrl,
          backgroundUrl: coverBackgroundUrl,
        }),
        gradient_color_start: gradStart,
        gradient_color_end: gradEnd,
      });
      setStatus(nextStatus);
      toast({
        title: options?.successTitle ?? "Template saved",
        description: options?.successDescription,
      });
      return true;
    } catch (e: unknown) {
      toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" });
      return false;
    }
  }, [template, status, name, coverTitle, coverSubtitle, coverBody, coverFooter, coverGradientAngle, coverGradientEnabled, coverInvertText, coverLogoUrl, coverBackgroundUrl, gradStart, gradEnd, updateMutation, toast]);

  const handlePublish = useCallback(async () => {
    if (!validatePublish()) return false;
    return handleSave({
      nextStatus: "published",
      successTitle: "Catalog published",
      successDescription: "The catalog is now marked as published.",
    });
  }, [handleSave, validatePublish]);

  const handleStatusToggle = useCallback(async () => {
    if (status === "published") {
      await handleSave({
        nextStatus: "draft",
        successTitle: "Catalog saved as draft",
      });
      return;
    }

    await handlePublish();
  }, [handlePublish, handleSave, status]);

  const handlePublishToCanvas = useCallback(async () => {
    if (!template) return;
    if (!validatePublish()) return;
    const saved = await handleSave({ successTitle: "Saved" });
    if (!saved) return;
    try {
      await publishToCanvasMutation.mutateAsync(template.id);
      navigate(`/admin/pricing/publisher/${template.id}/canvas?from=publisher`);
    } catch (e: unknown) {
      toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" });
    }
  }, [template, validatePublish, handleSave, publishToCanvasMutation, navigate, toast]);

  const handleUploadAsset = async (file: File, kind: "logo" | "background") => {
    if (!template) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      toast({ title: "Upload failed", description: validationError, variant: "destructive" });
      return;
    }
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `catalogs/${template.id}/${kind}-${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(CATALOG_ASSET_BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(CATALOG_ASSET_BUCKET).getPublicUrl(path);
      if (kind === "logo") setCoverLogoUrl(data.publicUrl);
      else setCoverBackgroundUrl(data.publicUrl);
      toast({ title: `${kind === "logo" ? "Logo" : "Background"} uploaded` });
    } catch (e: unknown) {
      toast({ title: "Upload failed", description: getErrorMessage(e), variant: "destructive" });
    }
  };

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
    } catch (e: unknown) {
      toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" });
    }
  };

  const handleUpdateSection = async (id: number, updates: Partial<CatalogSection>) => {
    try {
      await updateSection.mutateAsync({ id, ...updates });
    } catch (e: unknown) {
      toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" });
    }
  };

  const handleRemoveSection = async (id: number) => {
    try {
      await removeSection.mutateAsync(id);
    } catch (e: unknown) {
      toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" });
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
    } catch (e: unknown) {
      toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" });
    }
  };

  const liveTemplate: CatalogTemplate = template
    ? { ...template, name, status, cover_title: coverTitle, cover_subtitle: serializeCoverContent({ subtitle: coverSubtitle, body: coverBody, footer: coverFooter, gradientAngle: coverGradientAngle, gradientEnabled: coverGradientEnabled, invertText: coverInvertText, logoUrl: coverLogoUrl, backgroundUrl: coverBackgroundUrl }), gradient_color_start: gradStart, gradient_color_end: gradEnd }
    : { id: 0, name: "", status: "draft", cover_title: null, cover_subtitle: null, gradient_color_start: null, gradient_color_end: null, created_at: null, updated_at: null, created_by: null };

  if (!template) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-sm border border-border bg-background">
      <div className="flex h-[46px] shrink-0 items-center border-b border-border bg-background px-3">
        <button
          onClick={() => navigate("/admin/pricing/publisher")}
          className="mr-2 flex items-center gap-2 border-r border-border pr-3 text-left transition-colors hover:text-foreground"
        >
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="hover:text-foreground">Publisher</span>
            <span className="text-muted-foreground/60">/</span>
            <span className="max-w-[240px] truncate font-medium text-foreground">{name || "Untitled Catalog"}</span>
          </span>
        </button>
        <div className="ml-auto flex items-center gap-[5px]">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground px-2 border-r mr-1">
            <span className="font-semibold text-foreground">1. Structure</span>
            <span className="opacity-40">›</span>
            <span className="opacity-40">2. Canvas</span>
            <span className="opacity-40">›</span>
            <span className="opacity-40">3. PDF</span>
          </div>
          <div className="flex items-center rounded-md border border-border bg-muted/20 p-0.5">
            <Button
              variant="default"
              size="sm"
              className="h-6 rounded px-2 text-[11px]"
              onClick={() => navigate(`/admin/pricing/publisher/${template.id}`)}
            >
              Classic
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 rounded px-2 text-[11px]"
              onClick={() => navigate(`/admin/pricing/publisher/${template.id}/canvas`)}
            >
              Canvas
            </Button>
          </div>
          <button
            type="button"
            onClick={handleStatusToggle}
            disabled={updateMutation.isPending}
            className={[
              "flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium transition-opacity",
              status === "published"
                ? "bg-emerald-100 text-emerald-700 hover:opacity-85"
                : "bg-amber-100 text-amber-700 hover:opacity-85",
              updateMutation.isPending ? "cursor-not-allowed opacity-70" : "",
            ].join(" ")}
            title={status === "published" ? "Mark catalog as draft" : "Publish catalog"}
          >
            <span className="h-[5px] w-[5px] rounded-full bg-current" />
            <span>{status === "published" ? "Published" : "Draft"}</span>
          </button>
          <div className="mx-[5px] h-[18px] w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-md border border-transparent px-[7px] text-xs font-normal text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground"
            onClick={() => {
              void handleSave({
                successTitle: "Template saved",
              });
            }}
            disabled={updateMutation.isPending}
          >
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-md border border-transparent px-[7px] text-xs font-normal text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground"
            onClick={async () => {
              const saved = await handleSave({
                successTitle: "Template saved",
              });
              if (saved) navigate("/admin/pricing/publisher");
            }}
            disabled={updateMutation.isPending}
          >
            Save &amp; Exit
          </Button>
          <Button
            size="sm"
            className="h-7 rounded-md px-[9px] text-xs font-normal"
            onClick={() => {
              void handlePublish();
            }}
            disabled={updateMutation.isPending}
          >
            Save &amp; Publish
          </Button>
          <Button
            size="sm"
            className="h-7 rounded-md px-[9px] text-xs font-normal bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            onClick={() => setPublishToCanvasDialogOpen(true)}
            disabled={updateMutation.isPending || publishToCanvasMutation.isPending}
          >
            <ArrowRight className="h-3 w-3" />
            Send to Canvas
          </Button>
        </div>
      </div>

      {/* Content — palette + builder + preview */}
      <div className="flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex min-h-0 flex-1" style={{ minWidth: `${DESKTOP_WORKSPACE_MIN_WIDTH}px` }}>
        {/* Left: Palette */}
        <div className="w-[220px] shrink-0 overflow-auto border-r bg-muted/15 px-3 py-2.5 pr-2.5 space-y-3" style={{ borderColor: "hsl(var(--border))" }}>
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
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-w-0">
          <ResizablePanel defaultSize={53} minSize={41} className="min-w-[620px]">
            <div className="h-full overflow-auto px-3 py-2.5 space-y-3">
              {/* Cover Settings */}
              <div className="rounded-lg border p-3" style={{ borderColor: "hsl(var(--border))" }}>
                <button className="mb-2 flex w-full items-center justify-between text-xs font-semibold text-foreground" onClick={() => setCoverSettingsOpen((v) => !v)}>
                  <span className="flex items-center gap-1.5"><Palette className="h-3.5 w-3.5 text-primary" /> Cover Settings</span>
                  {coverSettingsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {!coverSettingsOpen && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                    <span>Catalog: <span className="font-medium text-foreground">{name || "Untitled Catalog"}</span></span>
                    <span>Cover: <span className="font-medium text-foreground">{coverTitle || "No cover title"}</span></span>
                    <span>Theme: <span className="font-medium text-foreground">{gradStart} to {gradEnd}</span></span>
                  </div>
                )}
                {coverSettingsOpen && <div className="grid grid-cols-2 gap-2.5">
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
                    <Label className="text-[10px]">Cover Logo</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-xs"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadAsset(file, "logo");
                          e.currentTarget.value = "";
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px]">Cover Background Image</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-xs"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadAsset(file, "background");
                          e.currentTarget.value = "";
                        }}
                      />
                    </div>
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
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
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

          <ResizablePanel defaultSize={47} minSize={43} className="min-w-[720px]">
            <div className="h-full p-2 pl-1" style={{ minWidth: `${PREVIEW_PANEL_MIN_WIDTH}px` }}>
              <PdfPreviewShell
                title={`${template.name} — Lens Catalog Builder Preview`}
                formatLabel={`${sections.filter((section) => section.is_included !== false).length} sections`}
                maxHeight="calc(100vh - 164px)"
                defaultSettingsVisible={false}
              >
                <EditorLivePreview
                  template={liveTemplate}
                  sections={sections}
                  versions={versions}
                  articles={articles}
                  settings={settings}
                  coverContent={{ subtitle: coverSubtitle, body: coverBody, footer: coverFooter, gradientAngle: coverGradientAngle, gradientEnabled: coverGradientEnabled, invertText: coverInvertText, logoUrl: coverLogoUrl, backgroundUrl: coverBackgroundUrl }}
                />
              </PdfPreviewShell>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
        </div>
      </div>

      <AlertDialog open={publishToCanvasDialogOpen} onOpenChange={setPublishToCanvasDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to Canvas?</AlertDialogTitle>
            <AlertDialogDescription>
              This saves your current sections, clears any existing canvas layout, and opens the Canvas Editor with a fresh layout built from your sections. Any manual canvas adjustments will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { void handlePublishToCanvas(); }}>
              {publishToCanvasMutation.isPending ? "Sending…" : "Send to Canvas"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CatalogEditorPage;
