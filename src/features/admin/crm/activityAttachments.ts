import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { validateHelpdeskFiles, type HelpdeskAttachment } from "@/lib/helpdeskAttachments";

// Task files share the helpdesk rules (types, 5 files, 10 MB) but live in their own private bucket.
export const ACTIVITY_ATTACHMENT_BUCKET = "activity-attachments";

export type ActivityAttachment = Omit<HelpdeskAttachment, "ticket_id" | "message_id"> & { activity_id: string };

export const activityAttachmentQueryKey = (activityId: string) => ["crm-activity-attachments", activityId] as const;

/** Stored files in the shape HelpdeskImageAttachments renders (activity id stands in for ticket id). */
export const toDisplayAttachments = (rows: ActivityAttachment[]): HelpdeskAttachment[] =>
  rows.map((row) => ({ ...row, ticket_id: row.activity_id, message_id: null }));

export const useActivityAttachments = (activityId: string | null | undefined) => useQuery({
  queryKey: activityAttachmentQueryKey(activityId ?? ""),
  enabled: !!activityId,
  queryFn: async () => {
    const { data, error } = await (supabase as any).from("activity_attachments")
      .select("*").eq("activity_id", activityId).order("created_at");
    if (error) throw error;
    return (data ?? []) as ActivityAttachment[];
  },
});

export async function uploadActivityFiles(activityId: string, files: File[]) {
  const validationError = validateHelpdeskFiles(files);
  if (validationError) throw new Error(validationError);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to add files to this task.");

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "file";
    const path = `${activityId}/${user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from(ACTIVITY_ATTACHMENT_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { error } = await (supabase as any).from("activity_attachments").insert({
      activity_id: activityId, uploaded_by_user_id: user.id, file_name: file.name.slice(0, 255),
      mime_type: file.type, byte_size: file.size, storage_path: path,
    });
    if (error) {
      await supabase.storage.from(ACTIVITY_ATTACHMENT_BUCKET).remove([path]);
      throw error;
    }
  }
}
