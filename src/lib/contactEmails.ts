/** CRM text field accepts common list separators; first address is primary. */
export function parseContactEmails(value: string): string[] {
  const unique = new Map<string, string>();
  for (const part of value.split(/[,;:\n]+/)) {
    const email = part.trim();
    if (email && !unique.has(email.toLowerCase())) unique.set(email.toLowerCase(), email);
  }
  return [...unique.values()];
}

export function normalizeContactEmails(value: string): string {
  const emails = parseContactEmails(value);
  const invalid = emails.find((email) => !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email));
  if (invalid) throw new Error(`Invalid email address: ${invalid}`);
  return emails.join(", ");
}
