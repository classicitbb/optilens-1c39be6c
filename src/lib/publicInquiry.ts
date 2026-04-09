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
}

export const submitPublicInquiry = async (submission: PublicInquirySubmission) => {
  const { error } = await supabase.functions.invoke("contact-inquiry", {
    body: {
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
};
