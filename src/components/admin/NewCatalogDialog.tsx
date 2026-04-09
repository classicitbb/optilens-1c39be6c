"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, FilePlus2, Grid2x2, Sparkles } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCatalogTemplates } from "@/hooks/useCatalogTemplates";
import type { PricelistVersion } from "@/hooks/usePricelistVersions";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NewCatalogDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCoverTitle: string;
  defaultCoverSubtitle: string;
};

type PresetKey = "full" | "rx" | "supplies" | "blank";
type SectionType = "rx_prices" | "stock_prices" | "supplies_prices";

type PresetDefinition = {
  key: PresetKey;
  name: string;
  description: string;
  icon: typeof FilePlus2;
  iconClassName: string;
  badgeClassName: string;
  sections: SectionType[];
  badges: string[];
};

type AssignmentRow = {
  key: SectionType;
  label: string;
  chipClassName: string;
  placeholder: string;
};

type CatalogSectionInsert = {
  catalog_template_id: number;
  section_type: string;
  sort_order: number;
  is_included: boolean;
  pricelist_version_id: number | null;
  format_choice: string | null;
  article_id: string | null;
  custom_title: string | null;
};

const PRESETS: PresetDefinition[] = [
  {
    key: "full",
    name: "Full catalog",
    description: "Starts with RX, stock, and supplies sections ready for assignment.",
    icon: Grid2x2,
    iconClassName: "bg-primary/10 text-primary",
    badgeClassName: "bg-primary/10 text-primary",
    sections: ["rx_prices", "stock_prices", "supplies_prices"],
    badges: ["RX pricing", "Stock pricing", "Supplies"],
  },
  {
    key: "rx",
    name: "Rx only",
    description: "Creates a focused catalog for RX lens pricing only.",
    icon: Sparkles,
    iconClassName: "bg-primary/10 text-primary",
    badgeClassName: "bg-primary/10 text-primary",
    sections: ["rx_prices"],
    badges: ["RX pricing"],
  },
  {
    key: "supplies",
    name: "Supplies only",
    description: "Builds a lightweight supplies catalog with one pricing section.",
    icon: FilePlus2,
    iconClassName: "bg-amber-500/10 text-amber-700",
    badgeClassName: "bg-amber-500/10 text-amber-700",
    sections: ["supplies_prices"],
    badges: ["Supplies"],
  },
  {
    key: "blank",
    name: "Blank",
    description: "Creates an empty shell so sections can be added manually.",
    icon: FilePlus2,
    iconClassName: "bg-muted text-muted-foreground",
    badgeClassName: "bg-muted text-muted-foreground",
    sections: [],
    badges: ["No sections"],
  },
];

const ASSIGNMENT_ROWS: AssignmentRow[] = [
  {
    key: "rx_prices",
    label: "RX lens prices",
    chipClassName: "bg-primary/10 text-primary",
    placeholder: "Select RX pricelist",
  },
  {
    key: "stock_prices",
    label: "Stock lens prices",
    chipClassName: "bg-primary/10 text-primary",
    placeholder: "Select stock pricelist",
  },
  {
    key: "supplies_prices",
    label: "Supplies prices",
    chipClassName: "bg-amber-500/10 text-amber-700",
    placeholder: "Select supplies pricelist",
  },
];

const SECTION_TO_CATALOG_TYPE: Record<SectionType, "rx" | "stock" | "buysell"> = {
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

const usePricelistAssignments = () =>
  useQuery({
    queryKey: ["new-catalog-pricelist-options"],
    queryFn: async () => {
      const [{ data: versions, error: versionsError }, { data: rows, error: rowsError }] = await Promise.all([
        supabase.from("pricelist_versions").select("*").order("created_at", { ascending: false }),
        (supabase.from("pricelist_catalog_rows") as any).select("pricelist_version_id, catalog_type"),
      ]);

      if (versionsError) throw versionsError;
      if (rowsError) throw rowsError;

      const seenByType = {
        rx: new Set<number>(),
        stock: new Set<number>(),
        buysell: new Set<number>(),
      };

      ((rows ?? []) as any[]).forEach((row: any) => {
        if (row.catalog_type === "rx" || row.catalog_type === "stock" || row.catalog_type === "buysell") {
          seenByType[row.catalog_type].add(row.pricelist_version_id);
        }
      });

      const versionList = ((versions ?? []) as unknown) as PricelistVersion[];
      const defaults: Record<SectionType, string> = {
        rx_prices: "",
        stock_prices: "",
        supplies_prices: "",
      };

      (Object.entries(SECTION_TO_CATALOG_TYPE) as Array<[SectionType, "rx" | "stock" | "buysell"]>).forEach(([sectionType, catalogType]) => {
        const preferred = versionList.find((version) => seenByType[catalogType].has(version.id));
        defaults[sectionType] = preferred ? String(preferred.id) : "";
      });

      return { versions: versionList, defaults, seenByType };
    },
  });

const NewCatalogDialog = ({
  open,
  onOpenChange,
  defaultCoverTitle,
  defaultCoverSubtitle,
}: NewCatalogDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createMutation } = useCatalogTemplates();
  const { data, isLoading: versionsLoading } = usePricelistAssignments();
  const [catalogName, setCatalogName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("full");
  const [selectedVersions, setSelectedVersions] = useState<Record<SectionType, string>>({
    rx_prices: "",
    stock_prices: "",
    supplies_prices: "",
  });

  const preset = useMemo(
    () => PRESETS.find((option) => option.key === selectedPreset) ?? PRESETS[0],
    [selectedPreset]
  );

  useEffect(() => {
    if (!open) return;
    setCatalogName("");
    setSelectedPreset("full");
  }, [open]);

  useEffect(() => {
    if (!data || !open) return;
    setSelectedVersions(data.defaults);
  }, [data, open]);

  const visibleAssignmentRows = useMemo(
    () => ASSIGNMENT_ROWS.filter((row) => preset.sections.includes(row.key)),
    [preset.sections]
  );

  const hasMissingAssignments = visibleAssignmentRows.some((row) => !selectedVersions[row.key]);

  const handleAddSection = async (templateId: number, sectionType: SectionType, sortOrder: number) => {
    const payload: CatalogSectionInsert = {
      catalog_template_id: templateId,
      section_type: sectionType,
      sort_order: sortOrder,
      is_included: true,
      pricelist_version_id: null,
      format_choice: sectionType === "rx_prices" ? "list" : null,
      article_id: null,
      custom_title: null,
    };

    const { data: created, error } = await (supabase
      .from("catalog_sections") as any)
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return created as { id: number };
  };

  const handleUpdateSection = async (id: number, updates: Partial<CatalogSectionInsert>) => {
    const { error } = await (supabase.from("catalog_sections") as any).update(updates).eq("id", id);
    if (error) throw error;
  };

  const handleCreateCatalog = async () => {
    const trimmedName = catalogName.trim();
    if (!trimmedName) {
      toast({ title: "Catalog name required", description: "Enter a name before creating the catalog.", variant: "destructive" });
      return;
    }

    if (hasMissingAssignments) {
      toast({
        title: "Pricelist assignment required",
        description: "Choose a pricelist for every section included in the selected preset.",
        variant: "destructive",
      });
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: trimmedName,
        cover_title: defaultCoverTitle,
        cover_subtitle: defaultCoverSubtitle,
      });

      for (const [index, sectionType] of preset.sections.entries()) {
        const section = await handleAddSection(created.id, sectionType, index + 1);
        const selectedVersionId = selectedVersions[sectionType];

        if (selectedVersionId) {
          await handleUpdateSection(section.id, { pricelist_version_id: Number(selectedVersionId) });
        }
      }

      toast({ title: "Catalog created" });
      onOpenChange(false);
      navigate(`/admin/pricing/publisher/${created.id}`);
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] gap-0 overflow-hidden p-0">
        <DialogHeader className="flex flex-row items-start gap-3 border-b px-6 py-5 text-left">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FilePlus2 />
          </div>
          <div className="flex-1">
            <DialogTitle className="text-[15px] font-semibold">Create a new catalog</DialogTitle>
            <DialogDescription className="mt-1 text-[12.5px] leading-5">
              Start from a preset, assign pricelists up front, and jump straight into the publisher editor.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex max-h-[calc(90vh-132px)] flex-col gap-5 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="catalog-name" className="text-[11.5px] font-medium text-muted-foreground">
              Catalog name
            </Label>
            <Input
              id="catalog-name"
              value={catalogName}
              onChange={(event) => setCatalogName(event.target.value)}
              placeholder="Spring Optical Catalog 2026"
              className="h-9 text-sm"
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
              Starter preset
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PRESETS.map((option) => {
                const Icon = option.icon;
                const isSelected = option.key === selectedPreset;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedPreset(option.key)}
                    className={cn(
                      "relative flex flex-col gap-3 rounded-xl border bg-background p-4 text-left transition-colors",
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-border/80 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex size-8 items-center justify-center rounded-lg", option.iconClassName)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-foreground">{option.name}</div>
                          <div className="mt-1 text-[11.5px] leading-5 text-muted-foreground">{option.description}</div>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {option.badges.map((badge) => (
                        <span
                          key={badge}
                          className={cn("inline-flex h-5 items-center rounded-md px-2 text-[10px] font-medium", option.badgeClassName)}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {preset.sections.length > 0 && (
            <div className="rounded-xl border bg-muted/30 px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                Pricelist assignment
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                These versions will be assigned immediately after the preset sections are created.
              </p>

              <div className="mt-4 flex flex-col gap-2.5">
                {visibleAssignmentRows.map((row) => {
                  const availableVersions = (data?.versions ?? []).filter((version) =>
                    data?.seenByType[SECTION_TO_CATALOG_TYPE[row.key]].has(version.id)
                  );

                  return (
                    <div key={row.key} className="flex flex-col gap-2 rounded-lg bg-background/80 p-3 sm:flex-row sm:items-center">
                      <span className={cn("inline-flex h-6 items-center rounded-md px-2.5 text-[10.5px] font-medium", row.chipClassName)}>
                        {row.label}
                      </span>
                      <span className="hidden text-sm text-muted-foreground sm:block">→</span>
                      <div className="flex-1">
                        <Select
                          value={selectedVersions[row.key]}
                          onValueChange={(value) =>
                            setSelectedVersions((current) => ({ ...current, [row.key]: value }))
                          }
                          disabled={versionsLoading || availableVersions.length === 0}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue
                              placeholder={
                                versionsLoading
                                  ? "Loading pricelists..."
                                  : availableVersions.length === 0
                                    ? `No ${row.label.toLowerCase()} versions found`
                                    : row.placeholder
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {availableVersions.map((version) => (
                              <SelectItem key={version.id} value={String(version.id)} className="text-xs">
                                {version.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between border-t px-6 py-4 sm:flex-row sm:space-x-0">
          <p className="text-[11.5px] text-muted-foreground">
            {preset.key === "blank" ? "Blank catalogs start with no sections." : "You can keep editing sections after the catalog opens."}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={handleCreateCatalog} disabled={createMutation.isPending || versionsLoading}>
              {createMutation.isPending ? "Creating..." : "Create catalog"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewCatalogDialog;
