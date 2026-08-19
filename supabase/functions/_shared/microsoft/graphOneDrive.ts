type GraphItem = { id: string; name: string; webUrl?: string; parentReference?: { driveId?: string } };

const graph = "https://graph.microsoft.com/v1.0";

async function accessToken(): Promise<string> {
  const tenant = Deno.env.get("MS_TENANT_ID");
  const client = Deno.env.get("MS_CLIENT_ID");
  const secret = Deno.env.get("MS_CLIENT_SECRET");
  if (!tenant || !client || !secret) throw new Error("Microsoft Graph configuration is incomplete.");
  const body = new URLSearchParams({ client_id: client, client_secret: secret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" });
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!response.ok) throw new Error(`Microsoft token request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  return (await response.json()).access_token;
}

async function graphRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken();
  return fetch(`${graph}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
}

export async function ensureOneDriveFolderPath(segments: string[]): Promise<{ driveId: string; itemId: string; path: string }> {
  const user = Deno.env.get("MS_ONEDRIVE_USER");
  if (!user) throw new Error("MS_ONEDRIVE_USER is not configured.");
  const encodedUser = encodeURIComponent(user);
  const rootResponse = await graphRequest(`/users/${encodedUser}/drive/root?$select=id,parentReference`);
  if (!rootResponse.ok) throw new Error(`Microsoft drive lookup failed (${rootResponse.status}).`);
  const root = await rootResponse.json();
  let parentId = root.id as string;
  const driveId = root.parentReference?.driveId as string | undefined;
  if (!driveId) throw new Error("Microsoft drive response did not include driveId.");
  const safeSegments = segments.filter(Boolean).map((segment) => segment.replace(/[\\/:*?"<>|]/g, "-").trim());
  for (const name of safeSegments) {
    const list = await graphRequest(`/users/${encodedUser}/drive/items/${encodeURIComponent(parentId)}/children?$filter=name eq '${name.replaceAll("'", "''")}'&$select=id,name,parentReference`);
    if (!list.ok) throw new Error(`Microsoft folder lookup failed (${list.status}).`);
    const existing = (await list.json()).value?.[0] as GraphItem | undefined;
    if (existing) { parentId = existing.id; continue; }
    const created = await graphRequest(`/users/${encodedUser}/drive/items/${encodeURIComponent(parentId)}/children`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }) });
    if (!created.ok) throw new Error(`Microsoft folder creation failed (${created.status}): ${(await created.text()).slice(0, 500)}`);
    parentId = (await created.json()).id;
  }
  return { driveId, itemId: parentId, path: safeSegments.join("/") };
}

export async function uploadOneDrivePdf(folder: { driveId: string; itemId: string; path: string }, filename: string, bytes: Uint8Array): Promise<GraphItem> {
  const user = Deno.env.get("MS_ONEDRIVE_USER")!;
  const encodedUser = encodeURIComponent(user);
  const target = `/users/${encodedUser}/drive/items/${encodeURIComponent(folder.itemId)}:/${encodeURIComponent(filename)}:/content`;
  const response = await graphRequest(target, { method: "PUT", headers: { "content-type": "application/pdf" }, body: bytes });
  if (!response.ok) throw new Error(`Microsoft PDF upload failed (${response.status}): ${(await response.text()).slice(0, 700)}`);
  return await response.json() as GraphItem;
}

export async function downloadOneDrivePdf(itemId: string): Promise<Response> {
  const user = Deno.env.get("MS_ONEDRIVE_USER");
  if (!user) throw new Error("MS_ONEDRIVE_USER is not configured.");
  return graphRequest(`/users/${encodeURIComponent(user)}/drive/items/${encodeURIComponent(itemId)}/content`);
}
