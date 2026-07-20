import type { User } from "@supabase/supabase-js";

export interface ProfileAddress {
  recipient: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export const EMPTY_ADDRESS: ProfileAddress = {
  recipient: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown) => (typeof value === "string" ? value : "");

export const coerceProfileAddress = (value: unknown): ProfileAddress => {
  if (!isObject(value)) return { ...EMPTY_ADDRESS };

  return {
    recipient: readString(value.recipient),
    line1: readString(value.line1),
    line2: readString(value.line2),
    city: readString(value.city),
    state: readString(value.state),
    postalCode: readString(value.postalCode),
    country: readString(value.country),
  };
};

export const hasAddressContent = (address: ProfileAddress) =>
  Object.values(address).some((value) => value.trim().length > 0);

export const sanitizeProfileAddress = (address: ProfileAddress) => {
  const normalized = {
    recipient: address.recipient.trim(),
    line1: address.line1.trim(),
    line2: address.line2.trim(),
    city: address.city.trim(),
    state: address.state.trim(),
    postalCode: address.postalCode.trim(),
    country: address.country.trim(),
  };

  return hasAddressContent(normalized) ? normalized : null;
};

export const resolveUserFullName = (user: User | null) => {
  const metadata = user?.user_metadata ?? {};
  return (
    readString(metadata.full_name) ||
    readString(metadata.name) ||
    readString(metadata.display_name) ||
    readString(metadata.user_name)
  ).trim();
};

export const capitalizeDisplayName = (value: string | null | undefined, fallback = "") => {
  const trimmed = (value ?? "").trim();
  const source = trimmed || fallback.trim();
  if (!source) return "";

  return source.charAt(0).toUpperCase() + source.slice(1);
};

export const resolveUserAvatar = (user: User | null) => {
  const metadata = user?.user_metadata ?? {};
  return (
    readString(metadata.avatar_url) ||
    readString(metadata.picture) ||
    readString(metadata.photo_url)
  ).trim();
};
