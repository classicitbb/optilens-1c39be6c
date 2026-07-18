// Doc Studio backend, ported from optilens-local's lib/docstudio.js (SQL Server)
// to Supabase. The studio front-end (public/ds/studio.html) is unchanged; its
// /api/* calls are redirected here by public/ds/cloud-bridge.js. Response
// envelopes and field names mirror the original API exactly so the studio
// works as-is: { files:[] } { file:{} } { documents:[] } { document:{} }
// { users:[] } { shares:[] } { ok:true }.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSmtpConfig } from "../_shared/email/smtp.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const FILE_TYPES = new Set(["email", "letter", "signature", "social", "pricelist", "shiplabel", "statement"]);
const DOCUMENT_TYPES = new Set(["invoice", "quote", "proforma", "receipt"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const newVersion = () => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
};

const text = (v: unknown, max = 220) => {
  const clean = String(v ?? "").trim();
  return clean ? clean.slice(0, max) : null;
};

const asObject = (v: unknown) => (v && typeof v === "object" ? v : typeof v === "string" ? safeParse(v) : {});
const safeParse = (s: string) => {
  try {
    return JSON.parse(s) ?? {};
  } catch {
    return {};
  }
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const asEmailList = (v: unknown, max = 100) => {
  const raw = Array.isArray(v) ? v : String(v ?? "").split(/[,\n;]/);
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const item of raw) {
    const email = String(item ?? "").trim();
    const key = email.toLowerCase();
    if (!email || seen.has(key)) continue;
    if (!emailRegex.test(email)) throw new Error(`Invalid email address: ${email}`);
    seen.add(key);
    emails.push(email);
    if (emails.length > max) throw new Error(`Too many recipients; limit is ${max}`);
  }
  return emails;
};

const stripHtml = (html: string) => html
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// deno-lint-ignore no-explicit-any
const contactRows = (rows: any[] | null | undefined, source: string) =>
  (rows ?? [])
    .map((row) => ({
      id: `${source}:${row.id ?? row.account_number ?? row.email}`,
      name: String(row.name || row.customer_name || row.email || "").trim(),
      email: String(row.email || "").trim(),
      account: row.account_number || row.account || "",
      phone: row.phone || "",
      source,
    }))
    .filter((row) => row.email && emailRegex.test(row.email));

// deno-lint-ignore no-explicit-any
function publicFile(row: any, detail = false) {
  const autosaveAt = row.latest_autosave_at ? new Date(row.latest_autosave_at).getTime() : 0;
  const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
  const useAutosave = detail && autosaveAt > updatedAt && row.autosave_content;
  // deno-lint-ignore no-explicit-any
  const doc: any = {
    id: row.id,
    kind: "file",
    ownerUserId: row.owner_user_id,
    accessLevel: "owner",
    isOwner: true,
    fileType: row.file_type,
    fileName: row.file_name,
    customerName: row.customer_name || "",
    customerAccount: row.customer_account || "",
    metadata: row.metadata ?? {},
    updatedAt: row.updated_at,
    latestAutosaveAt: row.latest_autosave_at,
    createdAt: row.created_at,
    version: row.version,
    hasNewerAutosave: Boolean(useAutosave),
  };
  if (detail) {
    doc.content = useAutosave ? row.autosave_content ?? {} : row.content ?? {};
    doc.renderedHtml = (useAutosave ? row.autosave_rendered_html : row.rendered_html) || "";
    doc.shares = [];
  }
  return doc;
}

// deno-lint-ignore no-explicit-any
function publicDocument(row: any, detail = false) {
  const autosaveAt = row.latest_autosave_at ? new Date(row.latest_autosave_at).getTime() : 0;
  const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
  const useAutosave = detail && autosaveAt > updatedAt && row.autosave_content;
  // deno-lint-ignore no-explicit-any
  const doc: any = {
    id: row.id,
    kind: "billing",
    ownerUserId: row.owner_user_id,
    accessLevel: "owner",
    isOwner: true,
    documentType: row.document_type,
    documentName: row.document_name,
    billingNumber: row.billing_number || "",
    customerName: row.customer_name || "",
    customerCompany: row.customer_company || "",
    customerAccount: row.customer_account || "",
    paperSize: row.paper_size || "letter",
    status: row.status || "saved",
    updatedAt: row.updated_at,
    latestAutosaveAt: row.latest_autosave_at,
    createdAt: row.created_at,
    version: row.version,
    hasNewerAutosave: Boolean(useAutosave),
  };
  if (detail) {
    doc.content = useAutosave ? row.autosave_content ?? {} : row.content ?? {};
    doc.renderedHtml = (useAutosave ? row.autosave_rendered_html : row.rendered_html) || "";
    doc.totals = useAutosave ? row.autosave_totals ?? {} : row.totals ?? {};
    doc.shares = [];
  }
  return doc;
}

// deno-lint-ignore no-explicit-any
const fileWriteColumns = (p: any, userId: string) => ({
  owner_user_id: userId,
  file_type: FILE_TYPES.has(String(p.fileType || p.type)) ? String(p.fileType || p.type) : "email",
  file_name: text(p.fileName || p.name || p.documentName, 220) ?? "Untitled Doc Studio file",
  customer_name: text(p.customerName),
  customer_account: text(p.customerAccount, 120),
  metadata: asObject(p.metadata),
  content: asObject(p.content ?? p.contentJson),
  rendered_html: String(p.renderedHtml || ""),
});

// deno-lint-ignore no-explicit-any
const documentWriteColumns = (p: any, userId: string) => ({
  owner_user_id: userId,
  document_type: DOCUMENT_TYPES.has(String(p.documentType || p.billType)) ? String(p.documentType || p.billType) : "invoice",
  document_name: text(p.documentName || p.name || p.billingNumber, 220) ?? "Untitled billing file",
  billing_number: text(p.billingNumber || p.blNumber, 80),
  customer_name: text(p.customerName || p.blToName),
  customer_company: text(p.customerCompany || p.blToCompany),
  customer_account: text(p.customerAccount || p.selectedBillingCustomer, 120),
  paper_size: ["letter", "a4"].includes(String(p.paperSize || p.billPaperSize)) ? String(p.paperSize || p.billPaperSize) : "letter",
  content: asObject(p.content ?? p.contentJson),
  rendered_html: String(p.renderedHtml || ""),
  totals: asObject(p.totals ?? p.totalsJson),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  // Authenticate the admin from the bridge's bearer token.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await supabase.auth.getUser(token);
  const userId = userData?.user?.id;
  if (authErr || !userId) return json({ error: "Not authorized" }, 401);
  const { data: isAdmin } = await supabase.rpc("has_edit_role", { _user_id: userId });
  if (!isAdmin) return json({ error: "Not authorized" }, 403);

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const base = parts.indexOf("docstudio-api");
  const route = parts.slice(base + 1);
  // Older bridge builds forwarded the full /api/docstudio/... path — accept both.
  if (route[0] === "docstudio") route.shift();
  const method = req.method;
  // deno-lint-ignore no-explicit-any
  const body: any = method === "POST" || method === "PUT" ? await req.json().catch(() => ({})) : {};

  try {
    // ---- reference data used by the pricelist/statement tabs ----
    if (route[0] === "pl" && route[1] === "customers") {
      // The Studio's statement/customer controls must only show customers with
      // an Innovations account number. A CRM-only customer can have the same
      // display fields, but cannot produce a valid statement reference.
      const { data, error } = await supabase
        .from("customers")
        .select("name,account_number,address,phone,email,innovations_customer_id")
        .not("account_number", "is", null)
        .neq("account_number", "")
        .order("name")
        .limit(500);
      if (error) throw error;
      return json((data ?? []).map((c) => ({
        name: c.name,
        account: c.account_number,
        address: c.address,
        phone: c.phone,
        email: c.email,
        innovationsCustomerId: c.innovations_customer_id,
      })));
    }
    if (route[0] === "pricelists") return json([]);

    if (route[0] === "email" && route[1] === "defaults" && method === "GET") {
      const smtpConfig = getSmtpConfig();
      const { data: profile } = await supabase
        .from("profiles")
        .select("email,full_name,display_name")
        .eq("user_id", userId)
        .maybeSingle();
      const replyTo = text(profile?.email || userData.user?.email, 320) ?? "";
      const displayName = text(profile?.full_name || profile?.display_name || userData.user?.user_metadata?.full_name, 120);
      return json({
        from: smtpConfig?.from ?? "Classic Visions <support@classicvisions.net>",
        replyTo,
        displayName,
      });
    }

    if (route[0] === "email" && route[1] === "contacts" && method === "GET") {
      const [customerResult, contactResult] = await Promise.allSettled([
        supabase
          .from("customers")
          .select("name,account_number,email,phone")
          .not("email", "is", null)
          .neq("email", "")
          .order("name")
          .limit(500),
        supabase
          .from("contacts")
          .select("id,name,email,phone")
          .not("email", "is", null)
          .neq("email", "")
          .order("name")
          .limit(500),
      ]);
      const customers = customerResult.status === "fulfilled" && !customerResult.value.error
        ? contactRows(customerResult.value.data, "customer")
        : [];
      const contacts = contactResult.status === "fulfilled" && !contactResult.value.error
        ? contactRows(contactResult.value.data, "contact")
        : [];
      const byEmail = new Map<string, unknown>();
      for (const row of [...customers, ...contacts]) {
        const key = row.email.toLowerCase();
        if (!byEmail.has(key)) byEmail.set(key, row);
      }
      return json({ contacts: Array.from(byEmail.values()) });
    }

    if (route[0] === "email" && route[1] === "send" && method === "POST") {
      const to = asEmailList(body.to, 100);
      const cc = asEmailList(body.cc, 100);
      const bcc = asEmailList(body.bcc, 100);
      const replyTo = text(body.replyTo, 320);
      if (!to.length) return json({ error: "At least one recipient is required" }, 400);
      if (replyTo && !emailRegex.test(replyTo)) return json({ error: `Invalid reply-to address: ${replyTo}` }, 400);

      const subject = text(body.subject, 240);
      const html = String(body.html || "").trim();
      if (!subject) return json({ error: "Subject is required" }, 400);
      if (!html) return json({ error: "Email body is required" }, 400);

      const smtpConfig = getSmtpConfig();
      if (!smtpConfig) return json({ error: "Email service is not configured" }, 500);

      const recipientJobs = [
        ...to.map((email) => ({ email, header: "to" })),
        ...cc.map((email) => ({ email, header: "cc" })),
        ...bcc.map((email) => ({ email, header: "bcc" })),
      ];
      const messageIds: string[] = [];
      for (const recipient of recipientJobs) {
        const messageId = crypto.randomUUID();
        messageIds.push(messageId);
        await supabase.from("email_send_log").insert({
          message_id: messageId,
          template_name: `docstudio-email-${recipient.header}`,
          recipient_email: recipient.email,
          status: "pending",
        });

        const { error: enqueueError } = await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: messageId,
            to: recipient.email,
            from: smtpConfig.from,
            subject,
            html,
            text: stripHtml(html),
            ...(replyTo ? { reply_to: replyTo } : {}),
            purpose: "transactional",
            label: `docstudio-email-${recipient.header}`,
            idempotency_key: messageId,
            queued_by: userId,
            queued_at: new Date().toISOString(),
          },
        });
        if (enqueueError) throw enqueueError;
      }
      return json({ ok: true, messageIds });
    }

    // Statement populate for the studio's Statement tab: id is the Innovations
    // statement id; data comes from the synced statements / statement_lines /
    // customers tables. Fields the cloud can't derive stay empty — the studio
    // falls back to its manual values for those.
    if (route[0] === "statement" && route[1]) {
      const stmtId = Number(route[1]);
      if (!Number.isFinite(stmtId)) return json({ error: "Statement id must be numeric" }, 400);

      const { data: stmt } = await supabase
        .from("statements")
        .select("*")
        .eq("innovations_statement_id", stmtId)
        .maybeSingle();
      if (!stmt) return json({ error: `Statement ${stmtId} not found` }, 404);

      let customer: { name?: string; account_number?: string; address?: string } | null = null;
      if (stmt.customer_id) {
        const { data } = await supabase.from("customers").select("name,account_number,address").eq("id", stmt.customer_id).maybeSingle();
        customer = data;
      }
      if (!customer && stmt.innovations_customer_id) {
        const { data } = await supabase
          .from("customers")
          .select("name,account_number,address")
          .eq("innovations_customer_id", stmt.innovations_customer_id)
          .maybeSingle();
        customer = data;
      }

      const { data: lines } = await supabase
        .from("statement_lines")
        .select("post_date,order_type_name,reference,invoice_id,order_id,patient,amount")
        .eq("innovations_statement_id", stmtId)
        .order("post_date", { ascending: true });

      let invoiceTotal = 0;
      let creditTotal = 0;
      const transactions = (lines ?? []).map((l) => {
        const amount = Number(l.amount ?? 0);
        if (amount >= 0) invoiceTotal += amount;
        else creditTotal += Math.abs(amount);
        const ref = l.reference || l.invoice_id || l.order_id || "";
        return {
          date: l.post_date ?? "",
          desc: [l.order_type_name, ref].filter(Boolean).join(" "),
          patient: l.patient ?? "",
          debit: amount >= 0 ? amount.toFixed(2) : "",
          credit: amount < 0 ? Math.abs(amount).toFixed(2) : "",
        };
      });

      const aging = [stmt.aging_amount_1, stmt.aging_amount_2, stmt.aging_amount_3, stmt.aging_amount_4].map((v) => Number(v ?? 0));
      const closing = Number(stmt.closing_balance ?? 0);
      const currentDue = closing - aging.reduce((a, b) => a + b, 0);

      return json({
        statement: {
          statementId: stmt.innovations_statement_id,
          customerName: customer?.name ?? "",
          accountNumber: customer?.account_number ?? "",
          address: customer?.address ?? "",
          periodFrom: stmt.from_date ?? "",
          periodTo: stmt.to_date ?? "",
          dueDate: stmt.due_date ?? "",
          openingBalance: stmt.opening_balance,
          closingBalance: stmt.closing_balance,
          currentDue: Number.isFinite(currentDue) ? currentDue.toFixed(2) : null,
          agingAmount1: stmt.aging_amount_1,
          agingAmount2: stmt.aging_amount_2,
          agingAmount3: stmt.aging_amount_3,
          agingAmount4: stmt.aging_amount_4,
          invoiceTotal: invoiceTotal ? invoiceTotal.toFixed(2) : null,
          creditTotal: creditTotal ? creditTotal.toFixed(2) : null,
          debitTotal: invoiceTotal ? invoiceTotal.toFixed(2) : null,
          netAmount: transactions.length ? (invoiceTotal - creditTotal).toFixed(2) : null,
          transactions,
        },
      });
    }

    if (route[0] === "users") return json({ users: [] });

    if (route[0] === "my-files") {
      const [files, docs] = await Promise.all([
        supabase.from("docstudio_files").select("*").is("deleted_at", null).order("updated_at", { ascending: false }),
        supabase.from("docstudio_billing_documents").select("*").is("deleted_at", null).order("updated_at", { ascending: false }),
      ]);
      const merged = [
        ...(files.data ?? []).map((r) => publicFile(r)),
        ...(docs.data ?? []).map((r) => publicDocument(r)),
      ].sort((a, b) => new Date(b.latestAutosaveAt || b.updatedAt || 0).getTime() - new Date(a.latestAutosaveAt || a.updatedAt || 0).getTime());
      return json({ files: merged });
    }

    // ---- shares are a no-op in the single-team cloud port ----
    if (route[0] === "files" && route.length === 4 && route[3] === "shares") return json({ shares: [] });

    // ---- files ----
    if (route[0] === "files" && route.length === 1) {
      if (method === "GET") {
        let q = supabase.from("docstudio_files").select("*").is("deleted_at", null).order("updated_at", { ascending: false });
        const type = url.searchParams.get("type");
        if (type && FILE_TYPES.has(type)) q = q.eq("file_type", type);
        const { data, error } = await q;
        if (error) throw error;
        return json({ files: (data ?? []).map((r) => publicFile(r)) });
      }
      if (method === "POST") {
        const { data, error } = await supabase
          .from("docstudio_files")
          .insert({ ...fileWriteColumns(body, userId), version: newVersion() })
          .select("*")
          .single();
        if (error) throw error;
        return json({ file: publicFile(data, true) }, 201);
      }
    }

    if (route[0] === "files" && route.length >= 2) {
      const id = route[1];
      const isAutosave = route[2] === "autosave";

      if (method === "GET") {
        const { data, error } = await supabase.from("docstudio_files").select("*").eq("id", id).is("deleted_at", null).single();
        if (error || !data) return json({ error: "File not found" }, 404);
        return json({ file: publicFile(data, true) });
      }

      const { data: current, error: curErr } = await supabase.from("docstudio_files").select("*").eq("id", id).is("deleted_at", null).single();
      if (curErr || !current) return json({ error: "File not found" }, 404);

      if (method === "POST" && isAutosave) {
        const { data, error } = await supabase
          .from("docstudio_files")
          .update({
            autosave_content: asObject(body.content ?? body.contentJson),
            autosave_rendered_html: String(body.renderedHtml || ""),
            latest_autosave_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        return json({ file: publicFile(data, true) });
      }

      if (method === "PUT") {
        if (body.version && String(body.version).toUpperCase() !== String(current.version).toUpperCase()) {
          return json({ error: "This document has changed. Reload it before saving." }, 409);
        }
        const { data, error } = await supabase
          .from("docstudio_files")
          .update({
            ...fileWriteColumns(body, userId),
            version: newVersion(),
            autosave_content: null,
            autosave_rendered_html: null,
            latest_autosave_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        return json({ file: publicFile(data, true) });
      }

      if (method === "DELETE") {
        const { error } = await supabase.from("docstudio_files").update({ deleted_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
    }

    // ---- billing documents ----
    if (route[0] === "billing-documents" && route.length === 1) {
      if (method === "GET") {
        const { data, error } = await supabase.from("docstudio_billing_documents").select("*").is("deleted_at", null).order("updated_at", { ascending: false });
        if (error) throw error;
        return json({ documents: (data ?? []).map((r) => publicDocument(r)) });
      }
      if (method === "POST") {
        const { data, error } = await supabase
          .from("docstudio_billing_documents")
          .insert({ ...documentWriteColumns(body, userId), version: newVersion() })
          .select("*")
          .single();
        if (error) throw error;
        return json({ document: publicDocument(data, true) }, 201);
      }
    }

    if (route[0] === "billing-documents" && route.length >= 2) {
      const id = route[1];
      const isAutosave = route[2] === "autosave";
      if (route[2] === "shares") return json({ shares: [] });

      if (method === "GET") {
        const { data, error } = await supabase.from("docstudio_billing_documents").select("*").eq("id", id).is("deleted_at", null).single();
        if (error || !data) return json({ error: "Document not found" }, 404);
        return json({ document: publicDocument(data, true) });
      }

      const { data: current, error: curErr } = await supabase.from("docstudio_billing_documents").select("*").eq("id", id).is("deleted_at", null).single();
      if (curErr || !current) return json({ error: "Document not found" }, 404);

      if (method === "POST" && isAutosave) {
        const { data, error } = await supabase
          .from("docstudio_billing_documents")
          .update({
            autosave_content: asObject(body.content ?? body.contentJson),
            autosave_rendered_html: String(body.renderedHtml || ""),
            autosave_totals: asObject(body.totals ?? body.totalsJson),
            latest_autosave_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        return json({ document: publicDocument(data, true) });
      }

      if (method === "PUT") {
        if (body.version && String(body.version).toUpperCase() !== String(current.version).toUpperCase()) {
          return json({ error: "This document has changed. Reload it before saving." }, 409);
        }
        const { data, error } = await supabase
          .from("docstudio_billing_documents")
          .update({
            ...documentWriteColumns(body, userId),
            version: newVersion(),
            autosave_content: null,
            autosave_rendered_html: null,
            autosave_totals: null,
            latest_autosave_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        return json({ document: publicDocument(data, true) });
      }

      if (method === "DELETE") {
        const { error } = await supabase.from("docstudio_billing_documents").update({ deleted_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
    }

    return json({ error: `Unknown Doc Studio route: ${method} /${route.join("/")}` }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Doc Studio request failed" }, 500);
  }
});
