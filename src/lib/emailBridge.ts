import { supabase } from "@/integrations/supabase/client";

// The Email app reads company mail from the OptiLens bridge (optilens-local),
// reached through a Cloudflare tunnel. The bridge checks the caller's
// Supabase session, so every request carries the signed-in user's token.

const STORAGE_KEY = "optilens.emailBridgeUrl";

function readOverride(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function getEmailBridgeUrl(): string | null {
  const override = readOverride();
  const fromEnv = (import.meta.env.VITE_EMAIL_BRIDGE_URL as string | undefined)?.trim() ?? "";
  const url = override || fromEnv;
  return url ? url.replace(/\/+$/, "") : null;
}

export class EmailBridgeError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new EmailBridgeError("Sign in again to use Email.", 401);
  return { Authorization: `Bearer ${token}` };
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const base = getEmailBridgeUrl();
  if (!base) throw new EmailBridgeError("Email isn't connected to the mail bridge yet.", 503);
  let response: Response;
  try {
    response = await fetch(`${base}/api/email/${path}`, {
      ...init,
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(await authHeader()), ...init.headers },
    });
  } catch {
    throw new EmailBridgeError("Can't reach the mail bridge. Check that the office server is online.", 0);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new EmailBridgeError(payload?.error || `Mail bridge returned ${response.status}.`, response.status);
  }
  return response;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  return (await request(path, init)).json() as Promise<T>;
}

export type EmailAddress = { address: string; name: string | null };

export type EmailFolder = {
  folder_id: number;
  account_code: string;
  path: string;
  display_name: string;
  special_use: string | null;
  last_synced_at: string | null;
  total_count: number;
  unread_count: number;
};

export type EmailSummary = {
  message_id: number;
  folder_id: number;
  subject: string | null;
  from_address: string | null;
  from_name: string | null;
  to: EmailAddress[];
  sent_at: string | null;
  is_read: boolean;
  is_flagged: boolean;
  has_attachments: boolean;
  snippet: string | null;
};

export type EmailAttachment = { attachment_id: number; filename: string; content_type: string | null; size_bytes: number };

export type EmailMessage = EmailSummary & {
  cc: EmailAddress[];
  account_code: string;
  account_address: string;
  body_text: string | null;
  body_html: string | null;
  folder_name: string;
  special_use: string | null;
  attachments: EmailAttachment[];
};

export type EmailHistoryItem = EmailSummary & { folder_name: string; account_address: string; direction: "received" | "sent" };

export type EmailAccount = {
  code: string;
  address: string;
  displayName: string;
  isShared: boolean;
  canSend: boolean;
  canManage: boolean;
  members: { email: string; role: "owner" | "member" }[];
  isEnabled: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  syncing: boolean;
};

export type EmailStatus = {
  accounts: EmailAccount[];
  user: { email: string; isAdmin: boolean };
};

export type OutgoingAttachment = { filename: string; contentType: string; base64: string };

export const emailBridge = {
  status: () => json<EmailStatus>("status"),
  syncNow: () => json<EmailStatus>("sync", { method: "POST" }),
  folders: (account: string) => json<{ folders: EmailFolder[] }>(`folders?account=${encodeURIComponent(account)}`).then((r) => r.folders),
  connectAccount: (body: { address: string; password: string; display_name: string; is_shared?: boolean }) =>
    json<{ code: string }>("accounts", { method: "POST", body: JSON.stringify(body) }),
  shareAccount: (code: string, email: string) =>
    json<EmailAccount[]>(`accounts/${encodeURIComponent(code)}/members`, { method: "POST", body: JSON.stringify({ email }) }),
  unshareAccount: (code: string, email: string) =>
    json<EmailAccount[]>(`accounts/${encodeURIComponent(code)}/members/remove`, { method: "POST", body: JSON.stringify({ email }) }),
  disconnectAccount: (code: string) => json<EmailAccount[]>(`accounts/${encodeURIComponent(code)}/disconnect`, { method: "POST" }),
  messages: (folderId: number, q?: string) => {
    const params = new URLSearchParams({ folder_id: String(folderId), limit: "100" });
    if (q) params.set("q", q);
    return json<{ messages: EmailSummary[] }>(`messages?${params}`).then((r) => r.messages);
  },
  message: (id: number) => json<EmailMessage>(`messages/${id}`),
  setFlags: (id: number, flags: { is_read?: boolean; is_flagged?: boolean }) =>
    json<{ ok: true }>(`messages/${id}`, { method: "PATCH", body: JSON.stringify(flags) }),
  move: (id: number, to: "archive" | "trash" | "inbox" | "junk") =>
    json<{ ok: true }>(`messages/${id}/move`, { method: "POST", body: JSON.stringify({ to }) }),
  history: (addresses: string[]) => {
    const params = new URLSearchParams();
    for (const address of addresses) params.append("address", address);
    return json<{ messages: EmailHistoryItem[] }>(`history?${params}`).then((r) => r.messages);
  },
  send: (body: { account: string; to: string; cc?: string; subject: string; text: string; reply_to_message_id?: number; attachments: OutgoingAttachment[] }) =>
    json<{ ok: true; savedToSent: boolean }>("send", { method: "POST", body: JSON.stringify(body) }),
  downloadAttachment: async (attachment: EmailAttachment) => {
    const blob = await (await request(`attachments/${attachment.attachment_id}`)).blob();
    return new File([blob], attachment.filename, { type: attachment.content_type || blob.type });
  },
};

export function fileToAttachment(file: File): Promise<OutgoingAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve({ filename: file.name, contentType: file.type || "application/octet-stream", base64: result.slice(result.indexOf(",") + 1) });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
