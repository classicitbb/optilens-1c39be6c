import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "@/hooks/useContacts";
import type { ActivityState } from "./useActivities";
import type { OutboxDraft } from "./useCadences";
import { OUTREACH_PLAN_TITLE, OUTREACH_PRACTICE_TITLE } from "../outreachJourney";

export type OutreachContact = Pick<Contact, "id" | "name" | "business_name" | "email" | "city" | "country" | "website" | "is_customer" | "linked_customer_id" | "parent_id"> & {
  stage: string | null; pipeline: string | null;
};
export type OutreachPlan = {
  id: string; contact_id: string; content: string | null; owner_id: string | null;
  due_at: string | null; status: ActivityState; updated_at: string; activity_type: string;
};

export function useOutreachContacts() {
  return useQuery({ queryKey: ["outreach-contacts"], queryFn: async () => {
    const contacts: OutreachContact[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await (supabase.from("contacts") as any)
        .select("id,name,business_name,email,city,country,website,is_customer,linked_customer_id,parent_id,stage,pipeline")
        .eq("is_archived", false).order("lead_score", { ascending: false, nullsFirst: false }).order("name").order("id").range(offset, offset + 499);
      if (error) throw error;
      contacts.push(...data);
      if (data.length < 500) break;
    }
    return contacts;
  }, staleTime: 60_000 });
}

export function useOutreachQueue() {
  return useQuery({ queryKey: ["outreach-queue"], queryFn: async () => {
    const { data, error } = await (supabase.from("activities") as any)
      .select("id,contact_id,content,owner_id,due_at,status,updated_at,activity_type,contact:contacts!activities_contact_id_fkey(name,business_name)")
      .in("activity_type", [OUTREACH_PLAN_TITLE, OUTREACH_PRACTICE_TITLE]).in("status", ["planned", "in_progress", "waiting", "inbox"])
      .order("due_at", { ascending: true, nullsFirst: false }).limit(100);
    if (error) throw error;
    return data as (OutreachPlan & { contact: { name: string; business_name: string | null } | null })[];
  } });
}

export function useOutreachPlan(contactId: string, practice = false) {
  return useQuery({ queryKey: ["outreach-plan", contactId, practice], enabled: !!contactId, queryFn: async () => {
    const { data, error } = await (supabase.from("activities") as any)
      .select("id,contact_id,content,owner_id,due_at,status,updated_at,activity_type")
      .eq("contact_id", contactId).eq("activity_type", practice ? OUTREACH_PRACTICE_TITLE : OUTREACH_PLAN_TITLE)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data as OutreachPlan | null;
  } });
}

export function useJourneyDraft(id: string | null) {
  return useQuery({ queryKey: ["journey-draft", id], enabled: !!id, queryFn: async () => {
    const { data, error } = await (supabase.from("outreach_outbox") as any).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as OutboxDraft | null;
  } });
}

export function useSaveOutreachPlan() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (input: {
    id?: string; contactId: string; content: string; ownerId: string; dueAt: string;
    status: ActivityState; createdBy: string; expectedUpdatedAt?: string; practice?: boolean;
  }) => {
    const fields = { content: input.content, owner_id: input.ownerId, due_at: input.dueAt,
      status: input.status, updated_at: new Date().toISOString() };
    const query = input.id
      ? (supabase.from("activities") as any).update(fields).eq("id", input.id).eq("updated_at", input.expectedUpdatedAt)
      : (supabase.from("activities") as any).insert({ ...fields, contact_id: input.contactId,
        activity_type: input.practice ? OUTREACH_PRACTICE_TITLE : OUTREACH_PLAN_TITLE, type: "email", task_channel: "todo", priority: "normal", created_by: input.createdBy });
    const { data, error } = await query.select("id,contact_id,content,owner_id,due_at,status,updated_at,activity_type").single();
    if (error) throw new Error(input.id ? "Unable to update this outreach. It may have been changed by a colleague. Copy your edits, then reload before saving again." : error.message);
    return data as OutreachPlan;
  }, onSuccess: (data) => {
    qc.setQueryData(["outreach-plan", data.contact_id, data.activity_type === OUTREACH_PRACTICE_TITLE], data);
    void qc.invalidateQueries({ queryKey: ["outreach-queue"] });
    void qc.invalidateQueries({ queryKey: ["crm-activities"] });
    void qc.invalidateQueries({ queryKey: ["operator-attention-crm-tasks"] });
  } });
}

export function useSaveJourneyDraft() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (input: { id?: string; contactId: string; subject: string; body: string; status: "draft" | "approved" | "sent"; practice?: boolean }) => {
    if (input.practice && input.status === "sent") throw new Error("Practice messages cannot be recorded as sent.");
    const fields = { subject: input.subject, body: input.body, status: input.status,
      ...(input.status === "approved" ? { approved_at: new Date().toISOString() } : input.status === "draft" ? { approved_at: null } : {}),
      ...(input.status === "sent" ? { sent_at: new Date().toISOString() } : {}),
      ...(input.practice ? { generated_by: "practice" } : {}) };
    const query = input.id
      ? (supabase.from("outreach_outbox") as any).update(fields).eq("id", input.id).eq("contact_id", input.contactId)
      : (supabase.from("outreach_outbox") as any).insert({ ...fields, contact_id: input.contactId, channel: "email", generated_by: input.practice ? "practice" : "human" });
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return data as OutboxDraft;
  }, onSuccess: (data) => {
    qc.setQueryData(["journey-draft", data.id], data);
    void qc.invalidateQueries({ queryKey: ["outreach-outbox"] });
  } });
}
