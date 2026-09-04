import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import jsPDF from "npm:jspdf@4.2.1";
import * as autoTableModule from "npm:jspdf-autotable@5.0.8";

import { createClient } from "npm:@supabase/supabase-js@2";
import { TEMPLATES } from "../_shared/transactional-email-templates/registry.ts";
import { isAutoNotificationsDisabled } from "../_shared/email/smtp.ts";
import { sendManagedEmail } from "../_shared/email/managed-send.ts";
import { ensureOneDriveFolderPath, uploadOneDrivePdf } from "../_shared/microsoft/graphOneDrive.ts";
import { money, paginateStatementLines, statementTransactionDetail, STATEMENT_PDF_TEMPLATE_VERSION } from "../_shared/statements/statementDocumentModel.ts";
// jspdf-autotable ships a namespace-shaped type under Deno's npm resolution, so
// the callable has to be unwrapped explicitly or `deno check` rejects every call.
type AutoTableFn = (doc: unknown, options: Record<string, unknown>) => void;
const autoTable: AutoTableFn =
  ((autoTableModule as unknown as { default?: AutoTableFn }).default
    ?? (autoTableModule as unknown as AutoTableFn));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const maxBatch = 5;

function b64(bytes: Uint8Array): string {
  let value = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) value += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(value);
}

function date(value: unknown): string {
  if (!value) return "—";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function moneyText(value: unknown): string { return `BBD ${money(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function buildPdf(statement: any, lines: any[], customer: any): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter", compress: true });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 14;
  const pages = paginateStatementLines(lines);
  const currentDue = money(statement.closing_balance) - [1, 2, 3, 4].reduce((sum, n) => sum + money(statement[`aging_amount_${n}`]), 0);

  const footer = (page: number) => {
    doc.setDrawColor(201, 212, 222); doc.line(margin, height - 17, width - margin, height - 17);
    doc.setFontSize(7); doc.setTextColor(140, 155, 168);
    doc.text("Classic Visions · Barbados", margin, height - 11);
    doc.text(`Page ${page} of ${pages.length}`, width / 2, height - 11, { align: "center" });
    doc.text(`Printed: ${date(new Date())}`, width - margin, height - 11, { align: "right" });
  };
  const header = (continuation: boolean, page: number) => {
    doc.setTextColor(11, 30, 53); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("CLASSIC VISIONS", margin, 18);
    doc.setTextColor(26, 138, 156); doc.setFontSize(7); doc.text("OPTICAL · BARBADOS", margin, 23);
    doc.setTextColor(90, 116, 144); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text("Classic Visions · Barbados", margin, 28);
    doc.setTextColor(11, 30, 53); doc.setFont("helvetica", "bold"); doc.setFontSize(continuation ? 11 : 26);
    doc.text("STATEMENT", width - margin, continuation ? 18 : 25, { align: "right" });
    doc.setDrawColor(200, 145, 48); doc.setLineWidth(0.7); doc.line(margin, 33, width - margin, 33);
    if (continuation) { doc.setFontSize(7); doc.setTextColor(90, 116, 144); doc.setFont("helvetica", "normal"); doc.text(`Statement ${statement.innovations_statement_id ?? statement.id} · ${customer?.name ?? ""}`, margin, 40); }
    footer(page);
  };

  pages.forEach((pageLines, index) => {
    if (index) doc.addPage();
    header(index > 0, index + 1);
    let y = index ? 47 : 42;
    if (!index) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(11, 30, 53);
      const meta = [
        ["Statement ID", String(statement.innovations_statement_id ?? statement.id)], ["Date as of", date(statement.statement_date)],
        ["Period", `${date(statement.from_date)} — ${date(statement.to_date)}`], ["Due Date", date(statement.due_date)],
        ["Customer", customer?.name ?? "—"], ["Account #", customer?.account_number ?? statement.account_number ?? "—"],
      ];
      meta.forEach(([label, value]) => { doc.setFont("helvetica", "bold"); doc.setTextColor(90, 116, 144); doc.text(`${label}:`, margin, y); doc.setFont("helvetica", "normal"); doc.setTextColor(11, 30, 53); doc.text(String(value), margin + 27, y); y += 5; });
      y += 4;
      doc.setFont("helvetica", "bold"); doc.setTextColor(26, 138, 156); doc.text("ACCOUNT SUMMARY", margin, y); y += 4;
      autoTable(doc as any, { startY: y, theme: "grid", margin: { left: margin, right: margin }, head: [["Opening", "Invoices / Credits", "Finance Charges", "Payments", "Closing"]], body: [[moneyText(statement.opening_balance), moneyText(statement.transactions), moneyText(statement.finance_charges), moneyText(statement.payments), moneyText(statement.closing_balance)]], styles: { fontSize: 7, cellPadding: 2.2, textColor: [11, 30, 53] }, headStyles: { fillColor: [242, 246, 248], textColor: [26, 138, 156] } });
      y = ((doc as any).lastAutoTable?.finalY ?? y) + 8;
      doc.setFont("helvetica", "bold"); doc.setTextColor(26, 138, 156); doc.text("AGING BALANCES", margin, y); y += 4;
      autoTable(doc as any, { startY: y, theme: "grid", margin: { left: margin, right: margin }, head: [["Current", "30 Days", "60 Days", "90 Days", "120+ Days"]], body: [[moneyText(currentDue), moneyText(statement.aging_amount_1), moneyText(statement.aging_amount_2), moneyText(statement.aging_amount_3), moneyText(statement.aging_amount_4)]], styles: { fontSize: 7, cellPadding: 2.2, halign: "center" }, headStyles: { fillColor: [242, 246, 248], textColor: [59, 82, 104] } });
      y = ((doc as any).lastAutoTable?.finalY ?? y) + 8;
    }
    doc.setFont("helvetica", "bold"); doc.setTextColor(26, 138, 156); doc.text(index ? "STATEMENT LINES" : "STATEMENT LINES", margin, y); y += 4;
    autoTable(doc as any, { startY: y, theme: "grid", margin: { left: margin, right: margin }, head: [["Date", "Type", "Detail", "Invoice", "Amount"]], body: pageLines.map((line: any) => [date(line.post_date), line.order_type_name ?? "—", statementTransactionDetail(line), line.invoice_id ? String(line.invoice_id) : "—", moneyText(line.amount)]), styles: { fontSize: 7, cellPadding: 2.2, overflow: "linebreak", textColor: [11, 30, 53] }, headStyles: { fillColor: [242, 246, 248], textColor: [59, 82, 104] }, columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 28 }, 3: { cellWidth: 20 }, 4: { cellWidth: 25, halign: "right" } } });
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 7;
    if (index === pages.length - 1) {
      doc.setFont("helvetica", "bold"); doc.setTextColor(26, 138, 156); doc.text("TOTALS AND TERMS", margin, y); y += 4;
      autoTable(doc as any, { startY: y, theme: "grid", margin: { left: margin, right: margin }, body: [["Closing balance", moneyText(statement.closing_balance)], ["Due date", date(statement.due_date)], ["Discounts / allowance", moneyText(statement.discount ?? statement.allowance)]], styles: { fontSize: 8, cellPadding: 2.5 }, columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } } });
      y = ((doc as any).lastAutoTable?.finalY ?? y) + 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(59, 82, 104);
      const terms = "Account due when rendered. 1.5% Finance Charge per month will be made on accounts not cleared within the stated terms. In the event of non-payment, the Account Holder becomes liable for all collection fees and expenses.";
      const termLines = doc.splitTextToSize(terms, width - margin * 2); doc.text(termLines, margin, y); y += termLines.length * 3.5 + 5;
      doc.setFont("helvetica", "bold"); doc.setTextColor(200, 145, 48); doc.text("PAYMENT INSTRUCTIONS", margin, y); y += 4; doc.setFont("helvetica", "normal"); doc.setTextColor(59, 82, 104);
      doc.text("Bank of Nova Scotia · SWIFT/BIC: NOSCBBBB · Account No.: 448873", margin, y); y += 3.5; doc.text("Chequing · Account Name: Classic Visions · Payment due: 30 days from statement date", margin, y);
    }
  });
  return new Uint8Array(doc.output("arraybuffer"));
}

async function queueEmail(supabase: any, job: any, statement: any, customer: any, pdf: Uint8Array) {
  const recipient = customer?.email;
  if (!recipient) return { status: "failed", error: "Customer has no email address." };
  if (await isAutoNotificationsDisabled(supabase, recipient)) return { status: "suppressed" };
  const template = TEMPLATES["statement-ready"];
  const baseUrl = Deno.env.get("APP_BASE_URL") ?? "https://classicvisions.net";
  const data = { customerName: customer.name ?? "there", accountNumber: customer.account_number ?? statement.account_number ?? "", periodStart: statement.from_date, periodEnd: statement.to_date, closingBalance: money(statement.closing_balance), dueDate: statement.due_date, siteUrl: baseUrl, statementUrl: `${baseUrl}/profile/statements?statement_id=${encodeURIComponent(statement.innovations_statement_id)}`, pdfUrl: `${baseUrl}/profile/statements?statement_id=${encodeURIComponent(statement.innovations_statement_id)}&download=1` };
  const html = await renderAsync(React.createElement(template.component, data));
  const text = await renderAsync(React.createElement(template.component, data), { plainText: true });
  const subject = typeof template.subject === "function" ? template.subject(data) : template.subject;
  const messageId = `statement-ready-${statement.innovations_statement_id}`;
  const sent = await supabase.from("email_send_log").select("id").eq("message_id", messageId).eq("status", "sent").maybeSingle();
  if (sent.data) return { status: "sent", messageId };
  const result = await sendManagedEmail(supabase, {
    messageId,
    to: recipient,
    from: "Classic Visions <noreply@classicvisions.net>",
    subject,
    html,
    text,
    label: "statement-ready",
    idempotencyKey: messageId,
    logMetadata: { statement_id: statement.innovations_statement_id },
    attachments: [{ filename: job.pdf_filename, content: b64(pdf), content_type: "application/pdf" }],
  });
  if (result.status === "failed") return { status: "failed", error: result.error };
  if (result.status === "suppressed") return { status: "suppressed" };
  return { status: "sent", messageId };
}

async function processJob(supabase: any, job: any) {
  const claimed = await supabase.from("statement_document_jobs").update({ status: "processing", locked_at: new Date().toISOString(), locked_by: crypto.randomUUID(), retry_count: job.retry_count + 1 }).eq("id", job.id).in("status", ["pending", "failed"]).lte("next_retry_at", new Date().toISOString()).select("*").maybeSingle();
  if (claimed.error || !claimed.data) return { skipped: true };
  const current = claimed.data;
  try {
    const { data: statement, error: statementError } = await supabase.from("statements").select("*").eq("innovations_statement_id", current.innovations_statement_id).maybeSingle();
    if (statementError) throw statementError;
    if (!statement || statement.void) { await supabase.from("statement_document_jobs").update({ status: "skipped", skip_reason: statement?.void ? "void_statement" : "statement_missing", upload_status: "skipped", email_status: "suppressed", completed_at: new Date().toISOString() }).eq("id", current.id); return { status: "skipped" }; }
    const [{ data: lines }, { data: customer }] = await Promise.all([
      supabase.from("statement_lines").select("*").eq("innovations_statement_id", current.innovations_statement_id).order("post_date", { ascending: true }),
      supabase.from("customers").select("name,email,account_number").eq("id", statement.customer_id).maybeSingle(),
    ]);
    let pdf: Uint8Array;
    const filename = current.pdf_filename ?? `Statement-${statement.innovations_statement_id}.pdf`;
    let folder: { driveId: string; itemId: string; path: string } | null = null;
    let uploaded: any = { id: current.one_drive_item_id, webUrl: current.one_drive_url };
    if (current.one_drive_item_id && current.upload_status === "uploaded") {
      const existingFile = await (await import("../_shared/microsoft/graphOneDrive.ts")).downloadOneDrivePdf(current.one_drive_item_id);
      if (!existingFile.ok) throw new Error(`Existing OneDrive PDF could not be re-read (${existingFile.status}).`);
      pdf = new Uint8Array(await existingFile.arrayBuffer());
    } else {
      pdf = buildPdf(statement, lines ?? [], customer);
      const when = new Date(statement.to_date ?? statement.statement_date ?? new Date());
      const year = when.getUTCFullYear();
      const month = String(when.getUTCMonth() + 1).padStart(2, "0");
      folder = await ensureOneDriveFolderPath(["CLASSIC ACCOUNTS FILES", "INNOVATIONS DOCUMENTS", "Innovations Statement Prints", String(year), month]);
      uploaded = await uploadOneDrivePdf(folder, filename, pdf);
    }
    const email = await queueEmail(supabase, current, statement, customer, pdf);
    await supabase.from("statement_document_jobs").update({ status: email.status === "failed" ? "failed" : "uploaded", statement_id: statement.id, pdf_template_version: STATEMENT_PDF_TEMPLATE_VERSION, pdf_filename: filename, pdf_bytes: pdf.byteLength, ...(folder ? { one_drive_drive_id: folder.driveId, one_drive_path: `${folder.path}/${filename}` } : {}), one_drive_item_id: uploaded.id, one_drive_url: uploaded.webUrl ?? current.one_drive_url ?? null, upload_status: "uploaded", email_status: email.status, email_message_id: email.messageId ?? null, error_message: email.error ?? null, uploaded_at: current.uploaded_at ?? new Date().toISOString(), emailed_at: email.status === "sent" ? new Date().toISOString() : null, completed_at: email.status === "failed" ? null : new Date().toISOString() }).eq("id", current.id);
    return { status: email.status === "failed" ? "failed" : "uploaded", email: email.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const permanent = current.retry_count >= current.max_retries;
    await supabase.from("statement_document_jobs").update({ status: permanent ? "failed" : "failed", next_retry_at: new Date(Date.now() + Math.min(24 * 60 * 60 * 1000, 2 ** Math.min(current.retry_count, 8) * 60 * 1000)).toISOString(), error_message: message.slice(0, 2000), error_details: { dead_letter: permanent }, completed_at: permanent ? new Date().toISOString() : null }).eq("id", current.id);
    return { status: "failed", error: message };
  }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("STATEMENT_DOCUMENT_WORKER_SECRET");
  if (!secret || req.headers.get("x-statement-worker-secret") !== secret) return json({ error: "Unauthorized" }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: jobs, error } = await supabase.from("statement_document_jobs").select("*").in("status", ["pending", "failed"]).lte("next_retry_at", new Date().toISOString()).order("discovered_at", { ascending: true }).limit(maxBatch);
  if (error) return json({ error: error.message }, 500);
  const results = []; for (const job of jobs ?? []) results.push(await processJob(supabase, job));
  return json({ processed: results.length, results });
});
