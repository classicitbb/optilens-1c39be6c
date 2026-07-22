import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useUserRole";

export type StaffPublicCard = {
  user_id: string;
  slug: string;
  display_name: string;
  title: string | null;
  organization_name: string | null;
  bio: string | null;
  skills: string[];
  email: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  avatar_url: string | null;
  is_published: boolean;
};

export type StaffPublicCardDefaults = Partial<Pick<StaffPublicCard,
  "display_name" | "organization_name" | "email" | "phone" | "avatar_url"
>>;

export type StaffPublicCardDraft = Omit<StaffPublicCard, "user_id">;

export const isStaffRole = (role: AppRole | null | undefined) => role === "admin" || role === "operator" || role === "viewer";

export const slugifyPublicCard = (value: string) => value
  .trim()
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 80);

export const getPublicCardPath = (slug: string) => `/connect/${encodeURIComponent(slug)}`;

export const getPublicCardUrl = (slug: string) => `${window.location.origin}${getPublicCardPath(slug)}`;

export const emptyPublicCard = (defaults: StaffPublicCardDefaults = {}): StaffPublicCardDraft => ({
  slug: slugifyPublicCard(defaults.display_name ?? "") || "staff-member",
  display_name: defaults.display_name?.trim() || "",
  title: null,
  organization_name: defaults.organization_name?.trim() || "Classic Visions",
  bio: null,
  skills: [],
  email: defaults.email?.trim() || null,
  phone: defaults.phone?.trim() || null,
  whatsapp_phone: null,
  linkedin_url: null,
  website_url: null,
  avatar_url: defaults.avatar_url?.trim() || null,
  is_published: false,
});

const cardTable = () => (supabase.from("staff_public_cards") as any);

export const fetchStaffPublicCard = async (userId: string): Promise<StaffPublicCard | null> => {
  const { data, error } = await cardTable().select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data as StaffPublicCard | null;
};

export const fetchPublishedStaffPublicCard = async (slug: string): Promise<StaffPublicCard | null> => {
  const { data, error } = await cardTable().select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  if (error) throw error;
  return data as StaffPublicCard | null;
};

const asOptional = (value: string | null | undefined) => value?.trim() || null;

export const normalizePublicCardDraft = (draft: StaffPublicCardDraft): StaffPublicCardDraft => ({
  ...draft,
  slug: slugifyPublicCard(draft.slug),
  display_name: draft.display_name.trim(),
  title: asOptional(draft.title),
  organization_name: asOptional(draft.organization_name),
  bio: asOptional(draft.bio),
  skills: draft.skills.map((skill) => skill.trim()).filter(Boolean).slice(0, 20),
  email: asOptional(draft.email),
  phone: asOptional(draft.phone),
  whatsapp_phone: asOptional(draft.whatsapp_phone),
  linkedin_url: asOptional(draft.linkedin_url),
  website_url: asOptional(draft.website_url),
  avatar_url: asOptional(draft.avatar_url),
});

export const saveStaffPublicCard = async (userId: string, draft: StaffPublicCardDraft) => {
  const normalized = normalizePublicCardDraft(draft);
  if (!normalized.slug) throw new Error("Choose a public URL for this card.");
  if (!normalized.display_name) throw new Error("A public name is required.");
  const { error } = await cardTable().upsert({ user_id: userId, ...normalized }, { onConflict: "user_id" });
  if (error) throw error;
};

const escapeVCardValue = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export const buildPublicCardVCard = (card: StaffPublicCard, publicUrl: string) => {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardValue(card.display_name)}`,
    `ORG:${escapeVCardValue(card.organization_name || "Classic Visions")}`,
    card.title ? `TITLE:${escapeVCardValue(card.title)}` : null,
    card.email ? `EMAIL;TYPE=INTERNET:${escapeVCardValue(card.email)}` : null,
    card.phone ? `TEL;TYPE=WORK,VOICE:${escapeVCardValue(card.phone)}` : null,
    card.whatsapp_phone ? `TEL;TYPE=CELL:${escapeVCardValue(card.whatsapp_phone)}` : null,
    `URL:${escapeVCardValue(publicUrl)}`,
    card.linkedin_url ? `X-SOCIALPROFILE;TYPE=linkedin:${escapeVCardValue(card.linkedin_url)}` : null,
    card.bio ? `NOTE:${escapeVCardValue(card.bio)}` : null,
    "END:VCARD",
  ];
  return lines.filter(Boolean).join("\r\n");
};

export const downloadPublicCardVCard = (card: StaffPublicCard, publicUrl: string) => {
  const file = new Blob([buildPublicCardVCard(card, publicUrl)], { type: "text/vcard;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = `${card.slug}.vcf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

export const whatsappUrl = (phone: string) => {
  const number = phone.replace(/\D/g, "");
  return number ? `https://wa.me/${number}` : null;
};
