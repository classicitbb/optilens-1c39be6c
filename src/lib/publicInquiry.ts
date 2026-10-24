import { validateHelpdeskFiles } from "@/lib/helpdeskAttachments";
import { supabase } from "@/integrations/supabase/client";

export interface PublicInquirySubmission {
  inquiryType: string;
  name: string;
  email: string;
  phone?: string | null;
  businessName?: string | null;
  message: string;
  notes?: string | null;
  pageSlug: string;
  sourceChannel?: string;
  honeypot?: string;
  startedAt: string;
  files?: File[];
}

export const submitPublicInquiry = async (submission: PublicInquirySubmission) => {
  const { files = [], ...fields } = submission;
  const validation = validateHelpdeskFiles(files);
  if (validation) throw new Error(validation);
  const multipart = new FormData();
  multipart.set("submission", JSON.stringify(fields));
  files.forEach((file) => multipart.append("files", file, file.name));
  const { data, error } = await supabase.functions.invoke("contact-inquiry", {
    body: files.length ? multipart : {
      inquiryType: submission.inquiryType,
      name: submission.name,
      email: submission.email,
      phone: submission.phone ?? null,
      businessName: submission.businessName ?? null,
      message: submission.message,
      notes: submission.notes ?? null,
      pageSlug: submission.pageSlug,
      sourceChannel: submission.sourceChannel ?? "website",
      honeypot: submission.honeypot ?? "",
      startedAt: submission.startedAt,
    },
  });

  if (error) throw error;
  return data as { success: boolean; attachmentError?: string | null };
};
