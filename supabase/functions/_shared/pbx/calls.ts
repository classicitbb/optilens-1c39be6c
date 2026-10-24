// Pure helpers shared by pbx-calls and pbx-agent. No Deno or network imports so
// they can be unit-tested from src/tests.

export const digitsOnly = (value: string | null | undefined) => (value ?? "").replace(/\D+/g, "");

// Dial strings are digits only; the PBX agent adds its own outside-line prefix.
// 7-digit numbers are local Barbados numbers (+1 246), so they get 1246.
export function toDialDigits(raw: string | null | undefined): string | null {
  const digits = digitsOnly(raw);
  if (digits.length === 7) return `1246${digits}`;
  if (digits.length === 10) return `1${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
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
