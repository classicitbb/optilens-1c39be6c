import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CatalogTemplate {
  id: number;
  name: string;
  status: string | null;
  cover_title: string | null;
  cover_subtitle: string | null;
  gradient_color_start: string | null;
  gradient_color_end: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export interface CatalogAssignment {
  id: number;
  catalog_template_id: number | null;
  customer_id: number | null;
  assigned_at: string | null;
}

export const useCatalogTemplates = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["catalog-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_templates")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as CatalogTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: Partial<CatalogTemplate>) => {
      const { data, error } = await supabase
        .from("catalog_templates")
        .insert(template as any)
        .select()
        .single();
      if (error) throw error;
      return data as CatalogTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-templates"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CatalogTemplate> & { id: number }) => {
      const { error } = await supabase
        .from("catalog_templates")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-templates"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // Delete assignments first
      await (supabase.from("catalog_assignments") as any).delete().eq("catalog_template_id", id);
      await (supabase.from("catalog_sections") as any).delete().eq("catalog_template_id", id);
      const { error } = await (supabase.from("catalog_templates") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-templates"] }),
  });

  const publishToCanvasMutation = useMutation({
    mutationFn: async (templateId: number) => {
      // 1. Get all page IDs for this template
      const { data: pages, error: pagesError } = await supabase
        .from("catalog_pages")
        .select("id")
        .eq("catalog_template_id", templateId);
      if (pagesError) throw pagesError;

      // 2. Delete all canvas objects across those pages
      if (pages && pages.length > 0) {
        const pageIds = pages.map((p: any) => p.id);
        const { error: deleteError } = await supabase
          .from("catalog_page_objects")
          .delete()
          .in("page_id", pageIds);
        if (deleteError) throw deleteError;
      }

      // 3. Set status to canvas_ready
      const { error: updateError } = await supabase
        .from("catalog_templates")
        .update({ status: "canvas_ready", updated_at: new Date().toISOString() } as any)
        .eq("id", templateId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-templates"] });
      qc.invalidateQueries({ queryKey: ["catalog-pages"] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template: CatalogTemplate) => {
      const { id, created_at, updated_at, ...rest } = template;
      const { data, error } = await supabase
        .from("catalog_templates")
        .insert({ ...rest, name: `${template.name} (Copy)` } as any)
        .select()
        .single();
      if (error) throw error;

      const duplicatedTemplate = data as CatalogTemplate;

      const { data: sections, error: sectionsError } = await supabase
        .from("catalog_sections")
        .select("*")
        .eq("catalog_template_id", template.id)
        .order("sort_order");
      if (sectionsError) throw sectionsError;

      if ((sections ?? []).length > 0) {
        const sectionCopies = (sections ?? []).map(({ id: _id, catalog_template_id: _catalogTemplateId, ...section }) => ({
          ...section,
          catalog_template_id: duplicatedTemplate.id,
        }));

        const { error: insertSectionsError } = await supabase
          .from("catalog_sections")
          .insert(sectionCopies as any[]);
        if (insertSectionsError) throw insertSectionsError;
      }

      return duplicatedTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-templates"] }),
  });

  return {
    ...query,
    createMutation,
    updateMutation,
    deleteMutation,
    duplicateMutation,
    publishToCanvasMutation,
  };
};

export const useCatalogAssignments = (templateId?: number) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["catalog-assignments", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_assignments")
        .select("*")
        .eq("catalog_template_id", templateId!);
      if (error) throw error;
      return data as CatalogAssignment[];
    },
    enabled: !!templateId,
  });

  const setAssignments = useMutation({
    mutationFn: async ({ templateId, customerIds }: { templateId: number; customerIds: number[] }) => {
      // Remove existing
      await (supabase.from("catalog_assignments") as any).delete().eq("catalog_template_id", templateId);
      // Insert new
      if (customerIds.length > 0) {
        const rows = customerIds.map((cid) => ({
          catalog_template_id: templateId,
          customer_id: cid,
        }));
        const { error } = await (supabase.from("catalog_assignments") as any).insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-assignments"] }),
  });

  return { ...query, setAssignments };
};

export const useCustomersList = () => {
  return useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as { id: number; name: string }[];
    },
  });
};
