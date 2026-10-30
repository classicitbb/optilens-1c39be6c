// Pure helpers shared by pbx-calls and pbx-agent. No Deno or network imports so
// they can be unit-tested from src/tests.

export const digitsOnly = (value: string | null | undefined) => (value ?? "").replace(/\D+/g, "");

// Dial strings in the form the FreePBX outbound routes match (checked 2026-10-30):
// Barbados numbers as 7 digits (local routes, FlowSIP), other North American
// numbers as 1 + 10 digits (OverseasCalls route). The PBX has no route for other
// international numbers, so those are not dialled.
export function toDialDigits(raw: string | null | undefined): string | null {
  const digits = digitsOnly(raw);
  const nanp = digits.length === 10 ? `1${digits}` : digits.length === 11 && digits.startsWith("1") ? digits : null;
  if (digits.length === 7) return digits;
  if (nanp?.startsWith("1246")) return nanp.slice(4);
  return nanp;
}

// Two numbers match when their trailing digits agree: ten when both have that
// many, otherwise seven (the local part), so "434-5678" matches "+1 (246) 434-5678".
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = digitsOnly(a);
  const y = digitsOnly(b);
  if (x.length < 7 || y.length < 7) return false;
  const n = x.length >= 10 && y.length >= 10 ? 10 : 7;
  return x.slice(-n) === y.slice(-n);
}

// contacts.phone is free text and may hold several numbers.
export function contactHasPhone(contactPhone: string | null | undefined, number: string): boolean {
  return (contactPhone ?? "")
    .split(/[,;/\n]+/)
    .some((part) => phonesMatch(part, number));
}

export type ParsedRecordingName = {
  direction: "inbound" | "outbound" | "unknown";
  extension: string | null;
  remoteNumber: string | null;
};

// FreePBX default names: {in|out|exten|q|g}-{a}-{b}-{YYYYMMDD}-{HHMMSS}-{uniqueid}.ext
// out-{dialed}-{extension}, in-{did}-{callerid}, exten-{dst ext}-{src ext}.
// Anything that does not fit comes back "unknown" and is still stored, so an
// unexpected naming scheme loses the link to a contact, not the recording.
// The time in the name is PBX local time, so the agent's file mtime is used instead.
export function parseRecordingName(filename: string): ParsedRecordingName {
  const base = filename.split("/").pop() ?? filename;
  const match = /^([a-z]+)-([^-]+)-([^-]+)-\d{8}-\d{6}-[\d.]+\.[a-z0-9]+$/i.exec(base);
  if (!match) return { direction: "unknown", extension: null, remoteNumber: null };
  const [, kind, a, b] = match;
  const lowerKind = kind.toLowerCase();
  if (lowerKind === "out") return { direction: "outbound", extension: b, remoteNumber: a };
  if (lowerKind === "in") return { direction: "inbound", extension: null, remoteNumber: b };
  return { direction: "unknown", extension: null, remoteNumber: null };
}
