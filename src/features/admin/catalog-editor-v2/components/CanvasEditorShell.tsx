import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCatalogTemplates } from "@/hooks/useCatalogTemplates";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCanvasEditor } from "../hooks/useCanvasEditor";
import { generateCatalogPdf } from "../utils/generateCatalogPdf";
import CanvasToolbar from "./CanvasToolbar";
import PageThumbnailsSidebar from "./PageThumbnailsSidebar";
import EditorCanvas from "./EditorCanvas";
import PropertiesPanel from "./PropertiesPanel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import type { CanvasObject, CanvasObjectType } from "../types";

type CatalogSection = {
  id: number;
  catalog_template_id: number;
  section_type: string;
  sort_order: number;
  is_included: boolean;
  pricelist_version_id: number | null;
  format_choice: string | null;
  article_id: string | null;
  custom_title: string | null;
};

type ArticleOption = {
  id: string;
  title: string;
  category: string;
};

type PricingVersionOption = {
  id: number;
  name: string;
};

const BOOTSTRAP_QUERY_KEY_PREFIX = "catalog-canvas-object-count";
const SECTIONS_QUERY_KEY_PREFIX = "catalog-sections-canvas";

const PRICING_SECTION_TYPES = new Set(["rx_prices", "stock_prices", "supplies_prices"]);
const FIXED_SECTION_OPTIONS = [
  { value: "terms_conditions", label: "Terms & Conditions" },
  { value: "contact_information", label: "Contact Information" },
  { value: "additional_charges", label: "Additional Charges" },
  { value: "dispensing_guide", label: "Dispensing Guide" },
  { value: "lablink_instructions", label: "LabLink Instructions" },
  { value: "special_services", label: "Special Services" },
  { value: "custom_text", label: "Custom Text" },
] as const;

const SECTION_LABELS: Record<string, string> = {
  rx_prices: "RX Prices",
  stock_prices: "Stock Prices",
  supplies_prices: "Supplies Prices",
  knowledge_article: "Knowledge Article",
  terms_conditions: "Terms & Conditions",
  contact_information: "Contact Information",
  additional_charges: "Additional Charges",
  dispensing_guide: "Dispensing Guide",
  lablink_instructions: "LabLink Instructions",
  special_services: "Special Services",
  custom_text: "Custom Text",
};

const SECTION_TO_CATALOG_TYPE: Record<string, "rx" | "stock" | "buysell"> = {
  rx_prices: "rx",
  stock_prices: "stock",
  supplies_prices: "buysell",
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Something went wrong.";
};

const getSectionLabel = (sectionType: string) => SECTION_LABELS[sectionType] ?? sectionType.replace(/_/g, " ");

const normalizeString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildCanvasObjectFromSection = (
  pageId: string,
  section: CatalogSection,
  index: number,
  y: number,
): Omit<CanvasObject, "id"> => {
  const isPricing = PRICING_SECTION_TYPES.has(section.section_type);

  return {
    page_id: pageId,
    object_type: isPricing ? "pricing_block" : "article_block",
    x: 28,
    y,
    width: 504,
    height: isPricing ? 188 : 128,
    rotation: 0,
    z_index: index + 2,
    content: isPricing
      ? {
          source_section_id: section.id,
          section_type: section.section_type,
          pricelist_version_id: section.pricelist_version_id,
          format: section.format_choice ?? "list",
          custom_title: section.custom_title ?? "",
        }
      : {
          source_section_id: section.id,
          section_type: section.section_type,
          article_id: section.article_id,
          text_mode: section.format_choice ?? "summary",
          custom_title: section.custom_title ?? "",
        },
    style: {},
    is_locked: false,
    is_visible: section.is_included !== false,
    label: section.custom_title || getSectionLabel(section.section_type),
  };
};

const CanvasEditorShell = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromPublisher = searchParams.get("from") === "publisher";
  const qc = useQueryClient();
  const { toast } = useToast();
  const templateId = Number(id);
  const bootstrappedRef = useRef(false);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { data: templates = [], updateMutation } = useCatalogTemplates();
  const { data: settings } = useCompanySettings();
  const template = templates.find((item) => item.id === templateId) ?? null;

  const sectionsQuery = useQuery({
    queryKey: [SECTIONS_QUERY_KEY_PREFIX, templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_sections")
        .select("*")
        .eq("catalog_template_id", templateId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CatalogSection[];
    },
    enabled: !!templateId,
  });

  const articlesQuery = useQuery({
    queryKey: ["catalog-canvas-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("id, title, category")
        .eq("is_active", true)
        .in("content_type", ["knowledge", "faq"])
        .in("visibility", ["public", "customer"])
        .order("category")
        .order("title");
      if (error) throw error;
      return (data ?? []) as ArticleOption[];
    },
  });

  const pricingVersionsQuery = useQuery({
    queryKey: ["catalog-canvas-pricing-versions"],
    queryFn: async () => {
      const [{ data: versions, error: versionsError }, { data: rows, error: rowsError }] = await Promise.all([
        supabase.from("pricelist_versions").select("id, name").order("created_at", { ascending: false }),
        supabase.from("pricelist_catalog_rows").select("pricelist_version_id, catalog_type"),
      ]);

      if (versionsError) throw versionsError;
      if (rowsError) throw rowsError;

      const seenByType = {
        rx: new Set<number>(),
        stock: new Set<number>(),
        buysell: new Set<number>(),
      };

      (rows ?? []).forEach((row) => {
        if (row.catalog_type === "rx" || row.catalog_type === "stock" || row.catalog_type === "buysell") {
          seenByType[row.catalog_type].add(row.pricelist_version_id);
        }
      });

      const versionList = (versions ?? []) as PricingVersionOption[];
      return {
        rx_prices: versionList.filter((version) => seenByType.rx.has(version.id)),
        stock_prices: versionList.filter((version) => seenByType.stock.has(version.id)),
        supplies_prices: versionList.filter((version) => seenByType.buysell.has(version.id)),
      };
    },
  });

  const {
    editorState,
    pages,
    pagesLoading,
    objects,
    objectsLoading,
    selectObject,
    setZoom,
    setActiveTab,
    setActivePage,
    insertObject,
    updateObject,
    deleteObject,
    addPage,
  } = useCanvasEditor(templateId);

  const objectCountQuery = useQuery({
    queryKey: [BOOTSTRAP_QUERY_KEY_PREFIX, templateId, pages.map((page) => page.id).join(",")],
    queryFn: async () => {
      if (pages.length === 0) return 0;
      const { count, error } = await supabase
        .from("catalog_page_objects" as any)
        .select("id", { count: "exact", head: true })
        .in("page_id", pages.map((page) => page.id));
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!templateId && pages.length > 0,
  });

  const sections = sectionsQuery.data ?? [];
  const selectedObject = objects.find((item) => item.id === editorState.selectedObjectId) ?? null;

  useEffect(() => {
    if (template) {
      setStatus(template.status === "published" ? "published" : "draft");
    }
  }, [template]);

  useEffect(() => {
    if (!templateId || pagesLoading || sectionsQuery.isLoading || objectCountQuery.isLoading) return;

    if (!fromPublisher && ((pages.length > 0 && (objectCountQuery.data ?? 0) > 0) || bootstrappedRef.current)) {
      return;
    }

    bootstrappedRef.current = true;

    void (async () => {
      try {
        const page = pages[0] ?? await addPage();
        if (!page || sections.length === 0) return;

        const bootstrapObjects: Array<Omit<CanvasObject, "id">> = [
          {
            page_id: page.id,
            object_type: "text",
            x: 28,
            y: 28,
            width: 504,
            height: null,
            rotation: 0,
            z_index: 1,
            content: { text: template?.name ?? "Catalog" },
            style: { fontSize: 22, fontFamily: "DM Sans", color: "hsl(var(--foreground))", lineHeight: 1.2 },
            is_locked: false,
            is_visible: true,
            label: "Catalog title",
          },
        ];

        let y = 78;
        sections.forEach((section, index) => {
          bootstrapObjects.push(buildCanvasObjectFromSection(page.id, section, index, y));
          y += PRICING_SECTION_TYPES.has(section.section_type) ? 204 : 144;
        });

        const { error } = await supabase.from("catalog_page_objects" as any).insert(bootstrapObjects as any[]);
        if (error) throw error;

        await Promise.all([
          qc.invalidateQueries({ queryKey: ["catalog-pages", templateId] }),
          qc.invalidateQueries({ queryKey: ["catalog-page-objects", page.id] }),
          qc.invalidateQueries({ queryKey: [BOOTSTRAP_QUERY_KEY_PREFIX, templateId] }),
        ]);

        // Strip the ?from=publisher query param after bootstrap
        if (fromPublisher) {
          navigate(`/admin/pricing/publisher/${templateId}/canvas`, { replace: true });
        }

        toast({
          title: "Canvas ready",
          description: "Imported your current catalog sections into the canvas editor.",
        });
      } catch (error: unknown) {
        bootstrappedRef.current = false;
        toast({
          title: "Canvas setup failed",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    })();
  }, [
    addPage,
    fromPublisher,
    navigate,
    objectCountQuery.data,
    objectCountQuery.isLoading,
    pages,
    pagesLoading,
    qc,
    sections,
    sectionsQuery.isLoading,
    template?.name,
    templateId,
    toast,
  ]);

  const validatePublish = useCallback(() => {
    if (!template) return false;

    const trimmedName = template.name.trim();
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

    const invalidPricingSection = includedSections.find(
      (section) => PRICING_SECTION_TYPES.has(section.section_type) && !section.pricelist_version_id,
    );

    if (invalidPricingSection) {
      toast({
        title: "Cannot publish catalog",
        description: `${getSectionLabel(invalidPricingSection.section_type)} needs a pricelist version before publishing.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [sections, template, toast]);

  const saveTemplate = useCallback(async (nextStatus?: "draft" | "published") => {
    if (!template) return false;
    const resolvedStatus = nextStatus ?? status;

    try {
      await updateMutation.mutateAsync({
        id: template.id,
        status: resolvedStatus,
      });
      setStatus(resolvedStatus);
      return true;
    } catch (error: unknown) {
      toast({
        title: "Save failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  }, [status, template, toast, updateMutation]);

  const handleSave = useCallback(async () => {
    const saved = await saveTemplate();
    if (saved) {
      toast({ title: "Canvas saved" });
    }
  }, [saveTemplate, toast]);

  const handleSaveAndExit = useCallback(async () => {
    const saved = await saveTemplate();
    if (!saved) return;
    toast({ title: "Canvas saved" });
    navigate("/admin/pricing/publisher");
  }, [navigate, saveTemplate, toast]);

  const handlePublish = useCallback(async () => {
    if (!validatePublish()) return;
    const saved = await saveTemplate("published");
    if (saved) {
      toast({
        title: "Catalog published",
        description: "The catalog is now marked as published.",
      });
    }
  }, [saveTemplate, toast, validatePublish]);

  const handleExportPdf = useCallback(async () => {
    if (!template) return;
    setIsExportingPdf(true);
    try {
      await generateCatalogPdf(template, settings);
      toast({ title: "PDF downloaded" });
    } catch (e: unknown) {
      toast({ title: "Export failed", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setIsExportingPdf(false);
    }
  }, [template, settings, toast]);

  const createCatalogSection = useCallback(async (sectionType: string, content: Record<string, unknown>) => {
    const lastSection = sections.length > 0 ? sections[sections.length - 1] : undefined;
    const nextSortOrder = (lastSection?.sort_order ?? sections.length) + 1;
    const isPricing = PRICING_SECTION_TYPES.has(sectionType);
    const payload = {
      catalog_template_id: templateId,
      section_type: sectionType,
      sort_order: nextSortOrder,
      is_included: true,
      pricelist_version_id: isPricing ? normalizeNumber(content.pricelist_version_id) : null,
      format_choice: sectionType === "knowledge_article"
        ? normalizeString(content.text_mode) ?? "summary"
        : isPricing && sectionType === "rx_prices"
          ? normalizeString(content.format) ?? "list"
          : null,
      article_id: sectionType === "knowledge_article" ? normalizeString(content.article_id) : null,
      custom_title: normalizeString(content.custom_title),
    };

    const { data, error } = await supabase
      .from("catalog_sections")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;

    await qc.invalidateQueries({ queryKey: [SECTIONS_QUERY_KEY_PREFIX, templateId] });
    return data as CatalogSection;
  }, [qc, sections, templateId]);

  const handleInsertObject = useCallback(async (type: CanvasObjectType, overrides?: Partial<CanvasObject>) => {
    try {
      const content = (overrides?.content as Record<string, unknown> | undefined) ?? {};

      if (type === "pricing_block" || type === "article_block") {
        const sectionType = typeof content.section_type === "string"
          ? content.section_type
          : type === "pricing_block"
            ? "rx_prices"
            : "knowledge_article";

        const createdSection = await createCatalogSection(sectionType, content);

        await insertObject(type, {
          ...overrides,
          is_visible: true,
          label: overrides?.label ?? getSectionLabel(sectionType),
          content: {
            ...content,
            source_section_id: createdSection.id,
            section_type: sectionType,
            pricelist_version_id: createdSection.pricelist_version_id,
            format: createdSection.format_choice ?? "list",
            text_mode: createdSection.format_choice ?? "summary",
            article_id: createdSection.article_id,
            custom_title: createdSection.custom_title ?? "",
          },
        });
        return;
      }

      await insertObject(type, overrides);
    } catch (error: unknown) {
      toast({
        title: "Unable to add object",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  }, [createCatalogSection, insertObject, toast]);

  const syncLinkedSection = useCallback(async (existingObject: CanvasObject, nextObject: Partial<CanvasObject> & { id: string }) => {
    if (!nextObject.content && typeof nextObject.is_visible !== "boolean") return;

    const sourceSectionId = normalizeNumber(existingObject.content.source_section_id);
    if (!sourceSectionId) return;

    const mergedContent = nextObject.content
      ? { ...existingObject.content, ...(nextObject.content as Record<string, unknown>) }
      : existingObject.content;

    const sectionType = typeof mergedContent.section_type === "string"
      ? mergedContent.section_type
      : typeof existingObject.content.section_type === "string"
        ? (existingObject.content.section_type as string)
        : null;

    if (!sectionType) return;

    const isPricing = PRICING_SECTION_TYPES.has(sectionType);

    const updates = {
      section_type: sectionType,
      is_included: typeof nextObject.is_visible === "boolean" ? nextObject.is_visible : existingObject.is_visible,
      pricelist_version_id: isPricing ? normalizeNumber(mergedContent.pricelist_version_id) : null,
      format_choice: sectionType === "knowledge_article"
        ? normalizeString(mergedContent.text_mode) ?? "summary"
        : isPricing && sectionType === "rx_prices"
          ? normalizeString(mergedContent.format) ?? "list"
          : null,
      article_id: sectionType === "knowledge_article" ? normalizeString(mergedContent.article_id) : null,
      custom_title: normalizeString(mergedContent.custom_title),
    };

    const { error } = await supabase
      .from("catalog_sections")
      .update(updates)
      .eq("id", sourceSectionId);
    if (error) throw error;

    await qc.invalidateQueries({ queryKey: [SECTIONS_QUERY_KEY_PREFIX, templateId] });
  }, [qc, templateId]);

  const handleUpdateObject = useCallback(async (nextObject: Partial<CanvasObject> & { id: string }) => {
    const existingObject = objects.find((item) => item.id === nextObject.id);
    if (!existingObject) return;

    const mergedObject = {
      ...nextObject,
      style: nextObject.style ? { ...existingObject.style, ...(nextObject.style as Record<string, unknown>) } : undefined,
      content: nextObject.content ? { ...existingObject.content, ...(nextObject.content as Record<string, unknown>) } : undefined,
    };

    try {
      await updateObject(mergedObject);
      await syncLinkedSection(existingObject, mergedObject);
    } catch (error: unknown) {
      toast({
        title: "Unable to update object",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  }, [objects, syncLinkedSection, toast, updateObject]);

  const handleDeleteObject = useCallback(async (objectId: string) => {
    const existingObject = objects.find((item) => item.id === objectId);
    if (!existingObject) return;

    try {
      const sourceSectionId = normalizeNumber(existingObject.content.source_section_id);
      if (sourceSectionId) {
        const { error } = await supabase.from("catalog_sections").delete().eq("id", sourceSectionId);
        if (error) throw error;
        await qc.invalidateQueries({ queryKey: [SECTIONS_QUERY_KEY_PREFIX, templateId] });
      }

      await deleteObject(objectId);
    } catch (error: unknown) {
      toast({
        title: "Unable to remove object",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  }, [deleteObject, objects, qc, templateId, toast]);

  const handleDuplicate = useCallback(async (object: CanvasObject) => {
    try {
      const sourceSectionId = normalizeNumber(object.content.source_section_id);
      const baseContent = object.content as Record<string, unknown>;
      let nextContent: Record<string, unknown> = { ...baseContent };

      if (sourceSectionId) {
        const sourceSection = sections.find((section) => section.id === sourceSectionId);
        if (sourceSection) {
          const clonedSection = await createCatalogSection(sourceSection.section_type, baseContent);
          nextContent = {
            ...baseContent,
            source_section_id: clonedSection.id,
            pricelist_version_id: clonedSection.pricelist_version_id,
            article_id: clonedSection.article_id,
            custom_title: clonedSection.custom_title ?? "",
            format: clonedSection.format_choice ?? "list",
            text_mode: clonedSection.format_choice ?? "summary",
          };
        }
      }

      await insertObject(object.object_type, {
        ...object,
        x: object.x + 20,
        y: object.y + 20,
        label: object.label ? `${object.label} (copy)` : null,
        content: nextContent,
      });
    } catch (error: unknown) {
      toast({
        title: "Unable to duplicate object",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  }, [createCatalogSection, insertObject, sections, toast]);

  const articleOptions = articlesQuery.data ?? [];
  const pricingVersionOptions = pricingVersionsQuery.data ?? {
    rx_prices: [] as PricingVersionOption[],
    stock_prices: [] as PricingVersionOption[],
    supplies_prices: [] as PricingVersionOption[],
  };

  const fixedSectionOptions = useMemo(
    () => FIXED_SECTION_OPTIONS.map((option) => ({ ...option })),
    [],
  );

  if (!template) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading editor…</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <CanvasToolbar
        templateId={templateId}
        templateName={template.name}
        status={status}
        zoom={editorState.zoom}
        onZoomChange={setZoom}
        onInsert={(type, overrides) => {
          void handleInsertObject(type, overrides);
        }}
        onSave={handleSave}
        onSaveAndExit={handleSaveAndExit}
        onPublish={handlePublish}
        onExport={() => setPdfModalOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <PageThumbnailsSidebar
          pages={pages}
          activePageId={editorState.activePageId}
          onSelectPage={setActivePage}
          onAddPage={() => {
            void addPage();
          }}
        />
        <EditorCanvas
          objects={objects}
          selectedObjectId={editorState.selectedObjectId}
          zoom={editorState.zoom}
          onSelectObject={selectObject}
          onUpdateObject={(nextObject) => {
            void handleUpdateObject(nextObject);
          }}
        />
        <PropertiesPanel
          selectedObject={selectedObject}
          activeTab={editorState.activeTab}
          articleOptions={articleOptions}
          fixedSectionOptions={fixedSectionOptions}
          pricingVersions={pricingVersionOptions}
          onTabChange={setActiveTab}
          onUpdate={(nextObject) => {
            void handleUpdateObject(nextObject);
          }}
          onDelete={(objectId) => {
            void handleDeleteObject(objectId);
          }}
          onDuplicate={(object) => {
            void handleDuplicate(object);
          }}
        />
      </div>
      {(pagesLoading || objectsLoading || sectionsQuery.isLoading) && (
        <div className="absolute bottom-3 right-3 rounded-md border border-border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
          Syncing editor…
        </div>
      )}

      <Dialog open={pdfModalOpen} onOpenChange={setPdfModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Export Catalog PDF</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            <p>Generate a high-quality PDF of <strong>{template?.name}</strong> using the current catalog sections and pricing data.</p>
            <ul className="mt-3 space-y-1 text-xs list-disc list-inside">
              <li>Cover page with catalog title and company details</li>
              <li>Table of contents</li>
              <li>Pricing sections with all assigned pricelist data</li>
              <li>Add-ons &amp; extras (if available)</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setPdfModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => { void handleExportPdf(); setPdfModalOpen(false); }}
              disabled={isExportingPdf}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {isExportingPdf ? "Generating…" : "Export 600 DPI PDF"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CanvasEditorShell;
