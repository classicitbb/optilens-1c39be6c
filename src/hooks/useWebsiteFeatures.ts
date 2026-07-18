import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Runtime website feature flags (public.website_features). Publicly readable
 * so the storefront can gate not-yet-live functionality; managed by editors
 * on the admin Feature Board (/admin/website/features), which doubles as the
 * operator's tuning/request surface monitored by the AI build agents.
 */
export interface WebsiteFeature {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  notes: string | null;
  updated_at: string;
}

export const useWebsiteFeatures = () =>
  useQuery({
    queryKey: ["website-features"],
    queryFn: async (): Promise<WebsiteFeature[]> => {
      const { data, error } = await (supabase.from("website_features") as any)
        .select("key,label,description,enabled,notes,updated_at")
        .order("key");
      // Missing table (migration not applied yet) must not break the site.
      if (error) return [];
      return (data ?? []) as WebsiteFeature[];
    },
    staleTime: 60_000,
  });

/**
 * Check one flag. `fallback` decides behavior while loading or when the flag
 * row does not exist — gate-closed features should pass fallback=false.
 */
export const useWebsiteFeature = (key: string, fallback = false) => {
  const query = useWebsiteFeatures();
  const feature = (query.data ?? []).find((row) => row.key === key);
  return {
    enabled: feature ? feature.enabled : fallback,
    isLoading: query.isLoading,
    feature: feature ?? null,
  };
};

export const useUpdateWebsiteFeature = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, patch }: { key: string; patch: Partial<Pick<WebsiteFeature, "enabled" | "notes" | "label" | "description">> }) => {
      const { error } = await (supabase.from("website_features") as any)
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["website-features"] }),
  });
};

export const useCreateWebsiteFeature = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (feature: Pick<WebsiteFeature, "key" | "label"> & Partial<WebsiteFeature>) => {
      const { error } = await (supabase.from("website_features") as any).insert({
        key: feature.key,
        label: feature.label,
        description: feature.description ?? null,
        enabled: feature.enabled ?? false,
        notes: feature.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["website-features"] }),
  });
};
