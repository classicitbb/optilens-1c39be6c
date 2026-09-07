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

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const acceptedImage = (file: File) => /^image\/(png|jpe?g|gif|webp)$/i.test(file.type);

export function validateHelpdeskImages(files: File[]) {
  if (files.length > 5) return "Add up to five images at a time.";
  for (const file of files) {
    if (!acceptedImage(file)) return `${file.name} is not a supported image.`;
    if (file.size > MAX_IMAGE_BYTES) return `${file.name} is larger than 10 MB.`;
  }
  return null;
}

export async function uploadHelpdeskImages(ticketId: string, files: File[], messageId: string | null = null) {
  const validationError = validateHelpdeskImages(files);
  if (validationError) throw new Error(validationError);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to add images to this ticket.");

  const uploaded: HelpdeskAttachment[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "image";
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

export async function getHelpdeskAttachmentUrls(attachments: HelpdeskAttachment[]) {
  return Promise.all(attachments.map(async (attachment) => {
    const { data, error } = await supabase.storage.from("helpdesk-attachments").createSignedUrl(attachment.storage_path, 60 * 10);
    if (error) return attachment;
    return { ...attachment, signedUrl: data.signedUrl };
  }));
}
