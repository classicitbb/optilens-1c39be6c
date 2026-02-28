import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Contact {
  id: string;
  name: string;
  type: string;
  business_name: string | null;
  is_company: boolean;
  parent_id: string | null;
  email: string;
  phone: string;
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  country_code: string;
  country: string;
  address: string | null;
  tax_id: string;
  website: string;
  google_place_id: string | null;
  facebook_page_id: string | null;
  instagram_handle: string | null;
  industry_id: string | null;
  notes: string;
  salesperson: string;
  is_archived: boolean;
  avatar_url: string;
  business_card_image_url: string | null;
  business_card_uploaded_at: string | null;
  business_card_file_name: string | null;
  is_customer: boolean;
  lead_source: string;
  pipeline_stage: string;
  status: string;
  lead_score: number;
  created_at: string;
  updated_at: string;
}

export interface ContactTag {
  id: string;
  name: string;
  color: string;
  category: string;
}

export interface Industry {
  id: string;
  name: string;
  full_name: string;
  is_active: boolean;
}

export const useContacts = () => {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Contact[];
    },
  });
};

export const useContactTags = () => {
  return useQuery({
    queryKey: ["contact_tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_tags").select("*").order("name");
      if (error) throw error;
      return data as ContactTag[];
    },
  });
};

export const useContactTagLinks = (contactId?: string) => {
  return useQuery({
    queryKey: ["contact_tag_links", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_tag_links")
        .select("tag_id")
        .eq("contact_id", contactId!);
      if (error) throw error;
      return data.map((d) => d.tag_id as string);
    },
  });
};

export const useIndustries = () => {
  return useQuery({
    queryKey: ["industries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("industries").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data as Industry[];
    },
  });
};

export const useSaveContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contact: Partial<Contact> & { id?: string }) => {
      if (contact.id) {
        const { error } = await supabase.from("contacts").update(contact).eq("id", contact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contacts").insert(contact as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
};

export const useDeleteContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
};

export const useSaveContactTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tag: Partial<ContactTag> & { id?: string }) => {
      if (tag.id) {
        const { error } = await supabase.from("contact_tags").update(tag).eq("id", tag.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contact_tags").insert(tag as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact_tags"] }),
  });
};

export const useDeleteContactTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact_tags"] }),
  });
};

export const useSaveIndustry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ind: Partial<Industry> & { id?: string }) => {
      if (ind.id) {
        const { error } = await supabase.from("industries").update(ind).eq("id", ind.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("industries").insert(ind as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["industries"] }),
  });
};

export const useSetContactTags = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, tagIds }: { contactId: string; tagIds: string[] }) => {
      // Delete existing
      await supabase.from("contact_tag_links").delete().eq("contact_id", contactId);
      // Insert new
      if (tagIds.length > 0) {
        const rows = tagIds.map((tag_id) => ({ contact_id: contactId, tag_id }));
        const { error } = await supabase.from("contact_tag_links").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact_tag_links"] }),
  });
};
