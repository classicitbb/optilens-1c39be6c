// Recipient fields stay plain "a@x.com; b@y.com" strings (the bridge's send
// contract); these helpers turn them into chips and back.

const SEPARATORS = /[,;\s]+/;

export function splitRecipients(value: string): string[] {
  const unique = new Map<string, string>();
  for (const part of value.split(SEPARATORS)) {
    const address = part.trim();
    if (address && !unique.has(address.toLowerCase())) unique.set(address.toLowerCase(), address);
  }
  return [...unique.values()];
}

export function joinRecipients(addresses: string[]): string {
  return splitRecipients(addresses.join(";")).join("; ");
}

export function isEmailAddress(value: string): boolean {
  return /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(value);
}

export function invalidRecipients(value: string): string[] {
  return splitRecipients(value).filter((address) => !isEmailAddress(address));
}

export function hasRecipient(value: string, address: string): boolean {
  return splitRecipients(value).some((item) => item.toLowerCase() === address.toLowerCase());
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase() || "?";
}
