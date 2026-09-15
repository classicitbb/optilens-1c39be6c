import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const encoder = new TextEncoder();
// Spreading a multi-megabyte array into String.fromCharCode exceeds the Edge
// runtime's argument limit. The same helper is safe for small JWT fragments.
const base64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(binary);
};
const base64Url = (bytes: Uint8Array) => base64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

type ServiceAccount = { client_email: string; private_key: string; token_uri?: string };

const accessToken = async (serviceAccountJson: string) => {
  const account = JSON.parse(serviceAccountJson) as ServiceAccount;
  if (!account.client_email || !account.private_key) throw new Error("The saved service-account JSON is incomplete.");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = base64Url(encoder.encode(JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/cloud-platform", aud: account.token_uri ?? "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })));
  const privateKey = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const der = Uint8Array.from(atob(privateKey), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(`${header}.${claim}`));
  const response = await fetch(account.token_uri ?? "https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claim}.${base64Url(new Uint8Array(signature))}` }) });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error(result.error_description ?? "Google did not issue an access token.");
  return result.access_token as string;
};

const guessDocumentKind = (name: string) => {
  const value = name.toLowerCase();
  if (/awb|airway|air way/.test(value)) return "airwaybill";
  if (/customs|c[& ]?i|entry/.test(value)) return "customs";
  if (/freight|dhl|shipping/.test(value)) return "freight_invoice";
  return "supplier_invoice";
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json(405, { error: "POST required" });
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const caller = createClient(url, anon, { global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json(401, { error: "Authentication required" });
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: allowed } = await db.rpc("has_edit_role", { _user_id: user.id });
  if (!allowed) return json(403, { error: "Editor access required" });

  const input = await request.json().catch(() => ({}));
  const { data: credential, error: credentialError } = await db.rpc("get_document_ai_credentials");
  const settings = Array.isArray(credential) ? credential[0] : credential;
  if (credentialError || !settings?.enabled || !settings?.processor_id || !settings?.service_account_json) return json(409, { error: "Google Document AI is not configured in Settings → Integrations." });
  try {
    const token = await accessToken(settings.service_account_json);
    if (input.operation === "test") {
      const processorResponse = await fetch(`https://${settings.location}-documentai.googleapis.com/v1/projects/${settings.project_id}/locations/${settings.location}/processors/${settings.processor_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const processor = await processorResponse.json().catch(() => null);
      if (!processorResponse.ok) throw new Error(processor?.error?.message ?? "Google could not read the configured Document AI processor.");
      await db.rpc("record_document_ai_test", { p_success: true, p_error_message: null, p_actor_user_id: user.id });
      return json(200, { ok: true, projectId: settings.project_id, location: settings.location, processorId: settings.processor_id });
    }
    if (input.operation !== "extract" || !input.shipmentId || !input.documentId) return json(400, { error: "Use operation test or extract with shipmentId and documentId." });
    const { data: document, error: documentError } = await db.from("shipment_documents").select("id, shipment_id, original_file_name, mime_type, storage_path, byte_size").eq("id", input.documentId).eq("shipment_id", input.shipmentId).single();
    if (documentError || !document) return json(404, { error: "Shipment document not found." });
    if (Number(document.byte_size) > 20 * 1024 * 1024) return json(400, { error: "Document AI supports a maximum 20MB synchronous OCR document." });
    const { data: file, error: downloadError } = await db.storage.from("shipment-costing-documents").download(document.storage_path);
    if (downloadError || !file) throw new Error(downloadError?.message ?? "Could not download the source document.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const endpoint = `https://${settings.location}-documentai.googleapis.com/v1/projects/${settings.project_id}/locations/${settings.location}/processors/${settings.processor_id}:process`;
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ rawDocument: { mimeType: document.mime_type, content: base64(bytes) }, processOptions: { ocrConfig: { enableNativePdfParsing: true } } }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? "Document AI could not process the document.");
    const extractedFields = { page_count: result.document?.pages?.length ?? 0, confidence: result.document?.entities?.[0]?.confidence ?? null };
    const { data: extraction, error: extractionError } = await db.from("shipment_document_extractions").insert({ shipment_id: input.shipmentId, document_id: document.id, processor_id: settings.processor_id, document_kind: guessDocumentKind(document.original_file_name), status: "draft", extracted_text: result.document?.text ?? "", extracted_fields: extractedFields, created_by_user_id: user.id }).select("id, document_kind, extracted_text, extracted_fields, status").single();
    if (extractionError) throw extractionError;
    return json(200, { ok: true, extraction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document AI request failed.";
    if (input.operation === "test") await db.rpc("record_document_ai_test", { p_success: false, p_error_message: message, p_actor_user_id: user.id });
    console.error("document-ai", message);
    return json(500, { error: message });
  }
});
