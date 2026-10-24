import { supabase } from "@/integrations/supabase/client";

export type HelpdeskAttachment = {
  id: string;
  ticket_id: string;
  message_id: string | null;
  file_name: string;
  mime_type: string;
  byte_size: number;
  storage_path: string;
  created_at: string;
  signedUrl?: string;
};

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_HELPDESK_ATTACHMENTS = 5;

// Keep in sync with the helpdesk-attachments bucket and the table's mime_type check.
export const HELPDESK_ATTACHMENT_MIME_TYPES = [
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "application/pdf", "text/plain", "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg",
] as const;

// Value for an <input type="file"> accept attribute: photos, documents and audio.
export const HELPDESK_ATTACHMENT_ACCEPT = [...HELPDESK_ATTACHMENT_MIME_TYPES, ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt", ".mp3", ".m4a", ".wav", ".ogg"].join(",");

const acceptedFile = (file: File) => (HELPDESK_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type);

export const isImageAttachment = (mimeType: string) => mimeType.startsWith("image/");
export const isAudioAttachment = (mimeType: string) => mimeType.startsWith("audio/");

export function validateHelpdeskFiles(files: File[]) {
  if (files.length > MAX_HELPDESK_ATTACHMENTS) return "Add up to five files at a time.";
  for (const file of files) {
    if (!acceptedFile(file)) return `${file.name} is not a supported photo, document or audio file.`;
    if (file.size > MAX_ATTACHMENT_BYTES) return `${file.name} is larger than 10 MB.`;
  }
  return null;
}

export async function uploadHelpdeskFiles(ticketId: string, files: File[], messageId: string | null = null) {
  const validationError = validateHelpdeskFiles(files);
  if (validationError) throw new Error(validationError);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to add files to this ticket.");

  const uploaded: HelpdeskAttachment[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "file";
    const path = `${ticketId}/${user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("helpdesk-attachments").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw uploadError;
    const { data, error } = await (supabase as any).from("helpdesk_ticket_attachments").insert({
      ticket_id: ticketId,
      message_id: messageId,
      uploaded_by_user_id: user.id,
      file_name: file.name.slice(0, 255),
      mime_type: file.type,
      byte_size: file.size,
      storage_path: path,
    }).select("*").single();
    if (error) {
      await supabase.storage.from("helpdesk-attachments").remove([path]);
      throw error;
    }
    uploaded.push(data as HelpdeskAttachment);
  }
  return uploaded;
}

export async function getHelpdeskAttachmentUrls(attachments: HelpdeskAttachment[], bucket = "helpdesk-attachments") {
  return Promise.all(attachments.map(async (attachment) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(attachment.storage_path, 60 * 10);
    if (error) return attachment;
    return { ...attachment, signedUrl: data.signedUrl };
  }));
}
