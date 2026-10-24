import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

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
  const { shipmentId } = await request.json();
  if (!shipmentId) return json(400, { error: "shipmentId required" });
  const { data: allowed } = await db.rpc("has_edit_role", { _user_id: user.id });
  if (!allowed) return json(403, { error: "Editor access required" });
  const [{ data: shipment, error: shipmentError }, { data: charges }, { data: lines }, { data: docs }] = await Promise.all([
    db.from("shipments").select("*").eq("id", shipmentId).single(),
    db.from("shipment_charges").select("*").eq("shipment_id", shipmentId).order("sort_order"),
    db.from("shipment_lines").select("*").eq("shipment_id", shipmentId).order("sort_order"),
    db.from("shipment_documents").select("*").eq("shipment_id", shipmentId).order("created_at"),
  ]);
  if (shipmentError || !shipment) return json(404, { error: "Shipment not found" });
  try {
    const binder = await PDFDocument.create(); const font = await binder.embedFont(StandardFonts.Helvetica); const bold = await binder.embedFont(StandardFonts.HelveticaBold);
    const page = binder.addPage([595, 842]); let y = 800;
    const line = (text: string, strong = false) => { page.drawText(text, { x: 42, y, size: 9, font: strong ? bold : font, color: rgb(.1, .1, .1) }); y -= 16; };
    line("Classic Visions — Shipment Landed Cost Binder", true); line(`Shipment: ${shipment.invoice_number || shipment.id}`); line(`Supplier: ${shipment.supplier_id}`); line(`FOB: ${Number(shipment.fob_foreign || 0).toFixed(2)} ${shipment.currency || "USD"}`); line(`FXF: ${Number(shipment.fxf_actual_bbd || 0).toFixed(2)} BBD`); line("Landed charges", true);
    for (const charge of charges ?? []) line(`${charge.charge_type}: ${Number(charge.amount_bbd || 0).toFixed(2)} BBD`);
    line("Invoice lines", true); for (const item of lines ?? []) line(`${item.description || "Unspecified"} × ${item.quantity}: ${Number(item.line_fob_foreign || 0).toFixed(2)}`);
    for (const doc of docs ?? []) {
      const { data: file, error } = await db.storage.from("shipment-costing-documents").download(doc.storage_path); if (error || !file) continue;
      const bytes = await file.arrayBuffer();
      if (doc.mime_type === "application/pdf") { const source = await PDFDocument.load(bytes); const copied = await binder.copyPages(source, source.getPageIndices()); copied.forEach((p) => binder.addPage(p)); }
      else { const image = doc.mime_type === "image/png" ? await binder.embedPng(bytes) : await binder.embedJpg(bytes); const imagePage = binder.addPage([595, 842]); const scaled = image.scale(Math.min(510 / image.width, 740 / image.height)); imagePage.drawImage(image, { x: (595 - scaled.width) / 2, y: (842 - scaled.height) / 2, width: scaled.width, height: scaled.height }); }
    }
    const path = `${shipmentId}/binders/${crypto.randomUUID()}.pdf`; const pdf = await binder.save();
    const { error: uploadError } = await db.storage.from("shipment-costing-documents").upload(path, pdf, { contentType: "application/pdf", upsert: false }); if (uploadError) throw uploadError;
    const { error: updateError } = await db.from("shipments").update({ binder_storage_path: path, binder_created_at: new Date().toISOString() }).eq("id", shipmentId); if (updateError) throw updateError;
    return json(200, { path });
  } catch (error) { console.error("shipment-binder", error); return json(500, { error: "Binder generation failed" }); }
});
