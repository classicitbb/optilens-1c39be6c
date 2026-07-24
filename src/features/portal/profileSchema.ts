import * as z from "zod";

export const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(120, "Name must be less than 120 characters"),
  phone: z.string().trim().min(1, "Phone number is required").max(50, "Phone number must be less than 50 characters"),
  organization_name: z.string().trim().min(1, "Organization is required").max(160, "Organization must be less than 160 characters"),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
