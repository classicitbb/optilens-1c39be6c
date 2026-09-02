import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  FileText,
  Loader2,
  Mail,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeRichTextHtml } from "@/lib/sanitizeRichTextHtml";
import { docStudioApi } from "./api";
import {
  BILLING_DOCUMENT_TYPES,
  contentRows,
  contentText,
  copyDraftContent,
  defaultDraft,
  documentTypeLabel,
  draftFromFile,
  legacyBillingPayload,
  legacyFilePayload,
  tabLabel,
  type CustomerOption,
  type EmailContact,
  type JsonRecord,
  type StudioDraft,
  type StudioFileDetail,
  type StudioFileSummary,
  type StudioTab,
} from "./types";

const TABS: StudioTab[] = [
  "files",
  "email",
  "letter",
  "signature",
  "social",
  "billing",
  "shiplabel",
  "statement",
];
function money(value: number, currency = "BBD") {
  return new Intl.NumberFormat("en-BB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function escaped(value: unknown) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function HtmlPreview({
  html,
  className = "",
  sanitize = false,
}: {
  html: string;
  className?: string;
  sanitize?: boolean;
}) {
  return (
    <div
      className={className}
      // Native renderers escape every structured field and only allow rich
      // text through the shared sanitizer. Historical static files do not get
      // that guarantee, so their archive preview remains strictly sanitized.
      // eslint-disable-next-line no-restricted-syntax -- see the sanitized/escaped renderer contract above.
      dangerouslySetInnerHTML={{
        __html: sanitize ? sanitizeRichTextHtml(html) : html,
      }}
    />
  );
}

function billingTotals(content: JsonRecord) {
  const rows = contentRows(content, "blRows");
  const subtotal = rows.reduce(
    (sum, row) => sum + asNumber(row.qty) * asNumber(row.unit),
    0,
  );
  const taxable = rows
    .filter((row) => row.taxable !== false)
    .reduce((sum, row) => sum + asNumber(row.qty) * asNumber(row.unit), 0);
  const discount = asNumber(content.blDiscount);
  const shipping = asNumber(content.blShipping);
  const rate = asNumber(content.blVatRate);
  const taxableDiscount = subtotal > 0 ? discount * (taxable / subtotal) : 0;
  const vat =
    content.blVatEnabled === false
      ? 0
      : (Math.max(0, taxable - taxableDiscount + shipping) * rate) / 100;
  const total = subtotal - discount + shipping + vat;
  const amountPaid =
    content.billType === "receipt"
      ? text(content.blAmountPaid)
        ? asNumber(content.blAmountPaid)
        : total
      : asNumber(content.blAmountPaid);
  return {
    subtotal,
    discount,
    shipping,
    vat,
    total,
    amountPaid,
    balance: total - amountPaid,
  };
}

function renderDraft(draft: StudioDraft) {
  const c = draft.content;
  const value = (key: string) => escaped(c[key]);
  if (draft.tab === "email") {
    const body = sanitizeRichTextHtml(text(c.emBody));
    return `<section style="font-family:Arial,sans-serif;color:#0b1e35;background:#f4f2ed;padding:32px"><article style="max-width:680px;margin:auto;background:#fff;border-top:8px solid #0b1e35;padding:36px"><p style="margin:0;color:#1a8a9c;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${value("emEyebrow")}</p><h1 style="font-size:28px;line-height:1.2">${value("emHeading") || value("emailSubject") || "Classic Visions"}</h1>${body}<p style="margin-top:32px;color:#5b6b7c">Classic Visions · Barbados</p></article></section>`;
  }
  if (draft.tab === "letter") {
    return `<article style="font-family:Arial,sans-serif;color:#0b1e35;padding:32px"><header style="border-bottom:3px solid #0b1e35;padding-bottom:16px"><strong style="font-size:22px">CLASSIC VISIONS</strong><p>${value("ltDate")}</p></header><p style="white-space:pre-line">${value("ltRecipient")}</p><h1>${value("ltSubject")}</h1>${sanitizeRichTextHtml(text(c.ltBody))}<p style="margin-top:32px">${value("ltSignName")}<br>${value("ltSignTitle")}</p></article>`;
  }
  if (draft.tab === "signature") {
    return `<section style="font-family:Arial,sans-serif;border-left:4px solid #1a8a9c;padding-left:16px"><strong style="font-size:18px;color:#0b1e35">${value("sgName")}</strong><p style="margin:4px 0">${value("sgTitle")}</p><p style="margin:4px 0">${value("sgPhone")} · ${value("sgEmail")}</p><p style="margin:4px 0;color:#1a8a9c">${value("sgWeb")}</p><small>${value("sgTagline")}</small></section>`;
  }
  if (draft.tab === "social") {
    return `<article style="font-family:Arial,sans-serif;min-height:420px;padding:34px;color:#f4f2ed;background:#0b1e35"><p style="letter-spacing:.12em">${value("smHandle")}</p><h1 style="font-size:40px;line-height:1.05">${value("smHeadline")}</h1><p style="font-size:20px">${value("smSub")}</p>${sanitizeRichTextHtml(text(c.smBody))}</article>`;
  }
  if (draft.tab === "shiplabel") {
    return `<article style="font-family:Arial,sans-serif;border:2px solid #0b1e35;padding:24px"><p><strong>FROM</strong><br>${value("slFromName")}<br>${value("slFromAddr").replace(/\n/g, "<br>")}<br>${value("slFromPhone")}</p><hr><p style="font-size:20px"><strong>TO</strong><br>${value("slToName")}<br>${value("slToCompany")}<br>${value("slToAddr").replace(/\n/g, "<br>")}<br>${value("slToPhone")}</p><hr><p>${value("slCarrier")} ${value("slService")}<br><strong>${value("slTracking")}</strong></p></article>`;
  }
  if (draft.tab === "statement") {
    const rows = contentRows(c, "stRows")
      .map(
        (row) =>
          `<tr><td>${escaped(row.date)}</td><td>${escaped(row.desc)}</td><td>${escaped(row.patient)}</td><td style="text-align:right">${escaped(row.debit)}</td><td style="text-align:right">${escaped(row.credit)}</td></tr>`,
      )
      .join("");
    return `<article style="font-family:Arial,sans-serif;color:#0b1e35"><header style="border-bottom:3px solid #0b1e35"><h1>Statement</h1><p>${value("stCustomer")} · ${value("stAccount")}</p><p>${value("stAddr")}</p></header><p>Period: ${value("stFrom")} to ${value("stTo")}</p><table style="width:100%;border-collapse:collapse" border="1" cellpadding="8"><thead><tr><th>Date</th><th>Description</th><th>Patient</th><th>Debit</th><th>Credit</th></tr></thead><tbody>${rows}</tbody></table><p><strong>Opening balance:</strong> ${value("stOpenBal")} ${value("stCurrency")}</p><p>${value("stNote")}</p></article>`;
  }
  const totals = billingTotals(c);
  const rows = contentRows(c, "blRows")
    .map(
      (row) =>
        `<tr><td>${escaped(row.code)}</td><td>${escaped(row.desc)}</td><td style="text-align:right">${escaped(row.qty)}</td><td style="text-align:right">${money(asNumber(row.unit), text(c.blCurrency) || "BBD")}</td><td style="text-align:right">${money(asNumber(row.qty) * asNumber(row.unit), text(c.blCurrency) || "BBD")}</td></tr>`,
    )
    .join("");
  return `<article style="font-family:Arial,sans-serif;color:#0b1e35"><header style="display:flex;justify-content:space-between;border-bottom:3px solid #0b1e35"><div><h1>CLASSIC VISIONS</h1><p>${escaped(String(c.billType || "invoice").toUpperCase())}</p></div><p>${value("blNumber")}<br>${value("blDate")}</p></header><p><strong>Bill to</strong><br>${value("blToName")}<br>${value("blToCompany")}<br>${value("blToAddr").replace(/\n/g, "<br>")}</p><table style="width:100%;border-collapse:collapse" border="1" cellpadding="8"><thead><tr><th>Code</th><th>Description</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><section style="margin-left:auto;max-width:300px;margin-top:20px"><p>Subtotal: ${money(totals.subtotal, text(c.blCurrency) || "BBD")}</p><p>VAT: ${money(totals.vat, text(c.blCurrency) || "BBD")}</p><p><strong>Total: ${money(totals.total, text(c.blCurrency) || "BBD")}</strong></p></section><p>${value("blNotes")}</p></article>`;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label
      className={`grid gap-1.5 text-sm font-medium text-slate-700 ${className}`}
    >
      <span>{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label
      className={`grid gap-1.5 text-sm font-medium text-slate-700 ${className}`}
    >
      <span>{label}</span>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

interface EditorProps {
  draft: StudioDraft;
  setContent: (updates: JsonRecord) => void;
  customers: CustomerOption[];
}

function CustomerPicker({ draft, setContent, customers }: EditorProps) {
  const selectCustomer = (id: string) => {
    const customer = customers.find((candidate) => String(candidate.id) === id);
    if (!customer) return;
    const account = customer.account_number ?? "";
    if (draft.tab === "billing")
      setContent({
        blToName: customer.name,
        blToCompany: customer.name,
        blToAddr: customer.address ?? "",
        selectedBillingCustomer: customer,
      });
    if (draft.tab === "statement")
      setContent({
        stCustomer: customer.name,
        stAccount: account,
        stAddr: customer.address ?? "",
        selectedStatementCustomer: customer,
      });
    if (draft.tab === "shiplabel")
      setContent({
        slToName: customer.name,
        slToCompany: customer.name,
        slToAddr: customer.address ?? "",
        slToPhone: customer.email ?? "",
        selectedShipCustomer: customer,
      });
  };
  if (
    !(["billing", "statement", "shiplabel"] as StudioTab[]).includes(draft.tab)
  )
    return null;
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span>Load customer details</span>
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        defaultValue=""
        onChange={(event) => selectCustomer(event.target.value)}
      >
        <option value="">Select a customer…</option>
        {customers.map((customer) => (
          <option key={String(customer.id)} value={String(customer.id)}>
            {customer.name}
            {customer.account_number ? ` — ${customer.account_number}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function StandardEditor({ draft, setContent, customers }: EditorProps) {
  const c = draft.content;
  const set = (key: string) => (value: string) => setContent({ [key]: value });
  if (draft.tab === "email")
    return (
      <div className="grid gap-4">
        <Field
          label="Subject"
          value={text(c.emailSubject)}
          onChange={set("emailSubject")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="To" value={text(c.emailTo)} onChange={set("emailTo")} />
          <Field
            label="Reply-to"
            value={text(c.emailReplyTo)}
            onChange={set("emailReplyTo")}
          />
        </div>
        <Field
          label="Heading"
          value={text(c.emHeading)}
          onChange={set("emHeading")}
        />
        <RichTextEditor
          content={text(c.emBody)}
          onChange={(emBody) => setContent({ emBody })}
          placeholder="Write your email…"
          minHeight="280px"
        />
      </div>
    );
  if (draft.tab === "letter")
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Date"
            type="date"
            value={text(c.ltDate)}
            onChange={set("ltDate")}
          />
          <Field
            label="Subject"
            value={text(c.ltSubject)}
            onChange={set("ltSubject")}
          />
        </div>
        <TextField
          label="Recipient"
          value={text(c.ltRecipient)}
          onChange={set("ltRecipient")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Signatory"
            value={text(c.ltSignName)}
            onChange={set("ltSignName")}
          />
          <Field
            label="Title"
            value={text(c.ltSignTitle)}
            onChange={set("ltSignTitle")}
          />
        </div>
        <RichTextEditor
          content={text(c.ltBody)}
          onChange={(ltBody) => setContent({ ltBody })}
          placeholder="Write your letter…"
          minHeight="280px"
        />
      </div>
    );
  if (draft.tab === "signature")
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" value={text(c.sgName)} onChange={set("sgName")} />
        <Field label="Role" value={text(c.sgTitle)} onChange={set("sgTitle")} />
        <Field
          label="Phone"
          value={text(c.sgPhone)}
          onChange={set("sgPhone")}
        />
        <Field
          label="Email"
          value={text(c.sgEmail)}
          onChange={set("sgEmail")}
        />
        <Field label="Website" value={text(c.sgWeb)} onChange={set("sgWeb")} />
        <Field
          label="Tagline"
          value={text(c.sgTagline)}
          onChange={set("sgTagline")}
        />
      </div>
    );
  if (draft.tab === "social")
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Handle"
            value={text(c.smHandle)}
            onChange={set("smHandle")}
          />
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Format</span>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={text(c.smFormat)}
              onChange={(event) => setContent({ smFormat: event.target.value })}
            >
              <option value="instagram">Instagram post</option>
              <option value="facebook">Facebook post</option>
              <option value="linkedin">LinkedIn post</option>
            </select>
          </label>
        </div>
        <Field
          label="Headline"
          value={text(c.smHeadline)}
          onChange={set("smHeadline")}
        />
        <Field
          label="Subheading"
          value={text(c.smSub)}
          onChange={set("smSub")}
        />
        <RichTextEditor
          content={text(c.smBody)}
          onChange={(smBody) => setContent({ smBody })}
          placeholder="Write your post…"
          minHeight="220px"
        />
      </div>
    );
  if (draft.tab === "shiplabel")
    return (
      <div className="grid gap-4">
        <CustomerPicker
          draft={draft}
          setContent={setContent}
          customers={customers}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="From name"
            value={text(c.slFromName)}
            onChange={set("slFromName")}
          />
          <Field
            label="From phone"
            value={text(c.slFromPhone)}
            onChange={set("slFromPhone")}
          />
        </div>
        <TextField
          label="From address"
          value={text(c.slFromAddr)}
          onChange={set("slFromAddr")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Recipient"
            value={text(c.slToName)}
            onChange={set("slToName")}
          />
          <Field
            label="Company"
            value={text(c.slToCompany)}
            onChange={set("slToCompany")}
          />
        </div>
        <TextField
          label="Recipient address"
          value={text(c.slToAddr)}
          onChange={set("slToAddr")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Carrier"
            value={text(c.slCarrier)}
            onChange={set("slCarrier")}
          />
          <Field
            label="Service"
            value={text(c.slService)}
            onChange={set("slService")}
          />
          <Field
            label="Tracking"
            value={text(c.slTracking)}
            onChange={set("slTracking")}
          />
          <Field
            label="Weight / dimensions"
            value={`${text(c.slWeight)} ${text(c.slDims)}`.trim()}
            onChange={(value) => setContent({ slWeight: value, slDims: "" })}
          />
        </div>
        <TextField
          label="Delivery note"
          value={text(c.slNote)}
          onChange={set("slNote")}
        />
      </div>
    );
  if (draft.tab === "statement")
    return (
      <StatementEditor
        draft={draft}
        setContent={setContent}
        customers={customers}
      />
    );
  return (
    <BillingEditor
      draft={draft}
      setContent={setContent}
      customers={customers}
    />
  );
}

function StatementEditor({ draft, setContent, customers }: EditorProps) {
  const c = draft.content;
  const rows = contentRows(c, "stRows");
  const updateRow = (index: number, key: string, value: string) =>
    setContent({
      stRows: rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    });
  return (
    <div className="grid gap-4">
      <CustomerPicker
        draft={draft}
        setContent={setContent}
        customers={customers}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Customer"
          value={text(c.stCustomer)}
          onChange={(stCustomer) => setContent({ stCustomer })}
        />
        <Field
          label="Account"
          value={text(c.stAccount)}
          onChange={(stAccount) => setContent({ stAccount })}
        />
        <Field
          label="From"
          type="date"
          value={text(c.stFrom)}
          onChange={(stFrom) => setContent({ stFrom })}
        />
        <Field
          label="To"
          type="date"
          value={text(c.stTo)}
          onChange={(stTo) => setContent({ stTo })}
        />
      </div>
      <TextField
        label="Address"
        value={text(c.stAddr)}
        onChange={(stAddr) => setContent({ stAddr })}
      />
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-left">Patient</th>
              <th className="p-2 text-left">Debit</th>
              <th className="p-2 text-left">Credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={String(row.id ?? index)} className="border-t">
                {["date", "desc", "patient", "debit", "credit"].map((key) => (
                  <td key={key} className="p-1">
                    <Input
                      value={text(row[key])}
                      onChange={(event) =>
                        updateRow(index, key, event.target.value)
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        variant="outline"
        type="button"
        className="w-fit"
        onClick={() =>
          setContent({
            stRows: [
              ...rows,
              {
                id: crypto.randomUUID(),
                date: "",
                desc: "",
                patient: "",
                debit: "",
                credit: "",
              },
            ],
          })
        }
      >
        <Plus />
        Add transaction
      </Button>
      <TextField
        label="Statement note"
        value={text(c.stNote)}
        onChange={(stNote) => setContent({ stNote })}
      />
    </div>
  );
}

function BillingEditor({ draft, setContent, customers }: EditorProps) {
  const c = draft.content;
  const rows = contentRows(c, "blRows");
  const totals = billingTotals(c);
  const updateRow = (index: number, key: string, value: string | boolean) =>
    setContent({
      blRows: rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    });
  return (
    <div className="grid gap-4">
      <CustomerPicker
        draft={draft}
        setContent={setContent}
        customers={customers}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          <span>Document type</span>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={text(c.billType) || "invoice"}
            onChange={(event) => setContent({ billType: event.target.value })}
          >
            {BILLING_DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {documentTypeLabel(type)}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Number"
          value={text(c.blNumber)}
          onChange={(blNumber) => setContent({ blNumber })}
        />
        <Field
          label="Date"
          type="date"
          value={text(c.blDate)}
          onChange={(blDate) => setContent({ blDate })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Customer name"
          value={text(c.blToName)}
          onChange={(blToName) => setContent({ blToName })}
        />
        <Field
          label="Company"
          value={text(c.blToCompany)}
          onChange={(blToCompany) => setContent({ blToCompany })}
        />
      </div>
      <TextField
        label="Billing address"
        value={text(c.blToAddr)}
        onChange={(blToAddr) => setContent({ blToAddr })}
      />
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[740px] text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Code</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-left">Qty</th>
              <th className="p-2 text-left">Unit price</th>
              <th className="p-2 text-left">Taxable</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={String(row.id ?? index)} className="border-t">
                <td className="p-1">
                  <Input
                    value={text(row.code)}
                    onChange={(event) =>
                      updateRow(index, "code", event.target.value)
                    }
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={text(row.desc)}
                    onChange={(event) =>
                      updateRow(index, "desc", event.target.value)
                    }
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={text(row.qty)}
                    onChange={(event) =>
                      updateRow(index, "qty", event.target.value)
                    }
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={text(row.unit)}
                    onChange={(event) =>
                      updateRow(index, "unit", event.target.value)
                    }
                  />
                </td>
                <td className="p-1 text-center">
                  <input
                    aria-label={`Taxable line ${index + 1}`}
                    type="checkbox"
                    checked={row.taxable !== false}
                    onChange={(event) =>
                      updateRow(index, "taxable", event.target.checked)
                    }
                  />
                </td>
                <td className="p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    title="Remove line"
                    onClick={() =>
                      setContent({
                        blRows: rows.filter(
                          (_, rowIndex) => rowIndex !== index,
                        ),
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        variant="outline"
        type="button"
        className="w-fit"
        onClick={() =>
          setContent({
            blRows: [
              ...rows,
              {
                id: crypto.randomUUID(),
                code: "",
                desc: "",
                qty: "1",
                unit: "",
                taxable: true,
              },
            ],
          })
        }
      >
        <Plus />
        Add line
      </Button>
      <div className="ml-auto grid w-full max-w-xs gap-1 text-sm">
        <span>
          Subtotal{" "}
          <strong className="float-right">
            {money(totals.subtotal, text(c.blCurrency) || "BBD")}
          </strong>
        </span>
        <span>
          VAT{" "}
          <strong className="float-right">
            {money(totals.vat, text(c.blCurrency) || "BBD")}
          </strong>
        </span>
        <span className="border-t pt-1 text-base">
          Total{" "}
          <strong className="float-right">
            {money(totals.total, text(c.blCurrency) || "BBD")}
          </strong>
        </span>
      </div>
      <TextField
        label="Notes"
        value={text(c.blNotes)}
        onChange={(blNotes) => setContent({ blNotes })}
      />
    </div>
  );
}

function FilesPanel({
  files,
  onOpen,
  onDelete,
  loading,
}: {
  files: StudioFileSummary[];
  onOpen: (file: StudioFileSummary) => void;
  onDelete: (file: StudioFileSummary) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const filtered = files.filter((file) =>
    `${file.fileName ?? file.documentName ?? ""} ${file.searchText ?? ""} ${file.customerName ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          aria-label="Search saved files"
          className="max-w-md"
          placeholder="Search saved files and content"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <span className="text-sm text-muted-foreground">
          {loading
            ? "Loading…"
            : `${filtered.length} saved file${filtered.length === 1 ? "" : "s"}`}
        </span>
      </div>
      <div className="overflow-auto rounded-lg border bg-background">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="sticky top-0 bg-muted text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Updated</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((file) => (
              <tr
                key={`${file.kind}-${file.id}`}
                className="border-t hover:bg-muted/30"
              >
                <td className="p-3">
                  <button
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    onClick={() => onOpen(file)}
                  >
                    {file.fileName ?? file.documentName ?? "Untitled document"}
                  </button>
                </td>
                <td className="p-3">
                  {documentTypeLabel(file.fileType ?? file.documentType ?? "")}
                </td>
                <td className="p-3">
                  {file.customerName ?? file.customerCompany ?? "—"}
                </td>
                <td className="p-3">
                  {new Date(
                    file.latestAutosaveAt ??
                      file.updatedAt ??
                      file.createdAt ??
                      0,
                  ).toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete file"
                    onClick={() => onDelete(file)}
                  >
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            ))}
            {!loading && !filtered.length && (
              <tr>
                <td
                  colSpan={5}
                  className="p-12 text-center text-muted-foreground"
                >
                  No saved files match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const NativeDocStudio = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<StudioTab>("files");
  const [draft, setDraft] = useState<StudioDraft>(() => defaultDraft("email"));
  const [files, setFiles] = useState<StudioFileSummary[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [archive, setArchive] = useState<StudioFileDetail | null>(null);
  const autosaveTimer = useRef<number | null>(null);

  const refreshWorkspace = useCallback(async () => {
    const workspace = await docStudioApi.workspace();
    setFiles(workspace);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      refreshWorkspace(),
      docStudioApi.customers(),
      docStudioApi.emailContacts(),
    ])
      .then(([_, customerRows, contactRows]) => {
        if (active) {
          setCustomers(customerRows);
          setContacts(contactRows);
        }
      })
      .catch((error: Error) => {
        if (active)
          toast.error(error.message || "Doc Studio could not load saved data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshWorkspace]);

  useEffect(() => {
    const handoff = searchParams.get("staffInvite");
    if (!handoff) return;
    try {
      const raw = sessionStorage.getItem(
        `cv_doc_studio_staff_invite:${handoff}`,
      );
      if (!raw) return;
      const invite = JSON.parse(raw) as {
        name?: string;
        email?: string;
        password?: string;
      };
      if (!invite.name || !invite.email || !invite.password) return;
      const firstName = invite.name.trim().split(/\s+/)[0] || "there";
      const inviteDraft = defaultDraft("email");
      inviteDraft.name = `Staff access — ${invite.name}`;
      inviteDraft.content = {
        ...inviteDraft.content,
        emEyebrow: "Staff access",
        emHeading: "Your Classic Visions access is ready",
        emBody: `<p>Hi ${escaped(firstName)},</p><p>Your Classic Visions access has been set up.</p><p><strong>Email:</strong> ${escaped(invite.email)}<br><strong>Temporary password:</strong> ${escaped(invite.password)}</p><p>Please sign in and change this temporary password as soon as possible.</p>`,
        emailTo: invite.email,
        emailSubject: "Your Classic Visions access is ready",
      };
      setDraft(inviteDraft);
      setTab("email");
      setSendOpen(true);
    } catch {
      /* a malformed tab-scoped handoff is safely ignored */
    }
  }, [searchParams]);

  const setContent = useCallback((updates: JsonRecord) => {
    setDraft((current) => copyDraftContent(current, updates));
    setDirty(true);
  }, []);

  const openFile = useCallback(
    async (file: Pick<StudioFileSummary, "id" | "kind" | "fileType">) => {
      setLoading(true);
      try {
        const detail =
          file.kind === "billing"
            ? await docStudioApi.billing(file.id)
            : await docStudioApi.file(file.id);
        if (detail.fileType === "pricelist") {
          setArchive(detail);
          setTab("files");
          return;
        }
        const next = draftFromFile(detail);
        setDraft(next);
        setTab(next.tab);
        setDirty(false);
        setArchive(null);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not open the saved file.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const billingDocument = searchParams.get("billingDocument");
    if (!billingDocument) return;
    void openFile({ id: billingDocument, kind: "billing" });
    // The deep link stays in place so a refresh returns to the same document.
  }, [openFile, searchParams]);

  const saveDraft = useCallback(
    async (saveAs = false) => {
      if (draft.tab === "files") return;
      const target = saveAs
        ? {
            ...draft,
            id: undefined,
            kind: undefined,
            version: undefined,
            name: `${draft.name} copy`,
          }
        : draft;
      setSaving(true);
      try {
        const html = renderDraft(target);
        const detail =
          target.tab === "billing"
            ? await docStudioApi.saveBilling(
                legacyBillingPayload(
                  target,
                  html,
                  billingTotals(target.content),
                ),
                target.id,
              )
            : await docStudioApi.saveFile(
                legacyFilePayload(target, html),
                target.id,
              );
        const next = draftFromFile(detail);
        setDraft(next);
        setTab(next.tab);
        setDirty(false);
        await refreshWorkspace();
        toast.success(
          saveAs ? "Saved as a new document." : "Saved to Doc Studio.",
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not save this document.",
        );
      } finally {
        setSaving(false);
      }
    },
    [draft, refreshWorkspace],
  );

  useEffect(() => {
    if (!dirty || !draft.id || draft.tab === "files") return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      const html = renderDraft(draft);
      const payload =
        draft.tab === "billing"
          ? legacyBillingPayload(draft, html, billingTotals(draft.content))
          : legacyFilePayload(draft, html);
      const request =
        draft.tab === "billing"
          ? docStudioApi.autosaveBilling(draft.id!, payload)
          : docStudioApi.autosaveFile(draft.id!, payload);
      void request.catch(() =>
        toast.error(
          "Autosave could not reach Doc Studio. Your changes remain in this tab.",
        ),
      );
    }, 1400);
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [dirty, draft]);

  const newDraft = (nextTab: StudioTab) => {
    if (nextTab === "files") {
      setTab("files");
      setArchive(null);
      return;
    }
    setDraft(defaultDraft(nextTab));
    setTab(nextTab);
    setDirty(false);
    setArchive(null);
  };

  const removeFile = async (file: StudioFileSummary) => {
    if (
      !window.confirm(
        `Delete ${file.fileName ?? file.documentName ?? "this file"}?`,
      )
    )
      return;
    try {
      await docStudioApi.delete(file);
      await refreshWorkspace();
      toast.success("File deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete the file.",
      );
    }
  };

  const sendEmail = async () => {
    if (draft.tab !== "email") return;
    try {
      await docStudioApi.sendEmail({
        to: text(draft.content.emailTo),
        cc: text(draft.content.emailCc),
        bcc: text(draft.content.emailBcc),
        replyTo: text(draft.content.emailReplyTo),
        subject:
          text(draft.content.emailSubject) || text(draft.content.emHeading),
        html: renderDraft(draft),
      });
      setSendOpen(false);
      toast.success("Email queued for delivery.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The email could not be queued.",
      );
    }
  };

  const preview = useMemo(
    () => (draft.tab === "files" ? "" : renderDraft(draft)),
    [draft],
  );
  const changeTab = (nextTab: StudioTab) =>
    nextTab === "files"
      ? newDraft("files")
      : tab === nextTab
        ? undefined
        : newDraft(nextTab);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#e9e5da] text-[#0b1e35]">
      <style>{`@media print {
        .ds-native-no-print { display: none !important; }
        .ds-native-print { max-width: none !important; border: 0 !important; box-shadow: none !important; }
      }`}</style>
      <header className="ds-native-no-print flex flex-wrap items-center gap-3 border-b border-[#243951] bg-[#0b1e35] px-4 py-3 text-[#f4f2ed]">
        <div className="mr-auto">
          <div className="font-extrabold tracking-[.08em]">CLASSIC VISIONS</div>
          <div className="text-[10px] font-bold tracking-[.2em] text-[#c89130]">
            DOCUMENT STUDIO · NATIVE
          </div>
        </div>
        <Input
          aria-label="Document name"
          className="h-9 max-w-xs border-[#56708f] bg-[#162a42] text-[#f4f2ed] placeholder:text-slate-300"
          value={draft.name}
          onChange={(event) => {
            setDraft((current) => ({ ...current, name: event.target.value }));
            setDirty(true);
          }}
          disabled={tab === "files"}
        />
        <span className="text-xs text-slate-300">
          {dirty ? "Unsaved changes" : draft.id ? "Saved" : "New document"}
        </span>
        <Button
          variant="outline"
          className="border-[#56708f] bg-transparent text-[#f4f2ed] hover:bg-[#162a42] hover:text-white"
          disabled={tab === "files" || saving}
          onClick={() => void saveDraft(false)}
        >
          <Save />
          Save
        </Button>
        <Button
          variant="outline"
          className="border-[#56708f] bg-transparent text-[#f4f2ed] hover:bg-[#162a42] hover:text-white"
          disabled={tab === "files" || saving}
          onClick={() => void saveDraft(true)}
        >
          <FileText />
          Save as
        </Button>
        <Button
          variant="outline"
          className="border-[#56708f] bg-transparent text-[#f4f2ed] hover:bg-[#162a42] hover:text-white"
          disabled={tab === "files"}
          onClick={() => window.print()}
        >
          <Printer />
          Print
        </Button>
      </header>
      <nav
        className="ds-native-no-print flex overflow-x-auto border-b bg-[#162a42] px-3"
        aria-label="Doc Studio tools"
      >
        {TABS.map((item) => (
          <button
            key={item}
            className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold ${tab === item ? "border-[#1a8a9c] text-white" : "border-transparent text-slate-300 hover:text-white"}`}
            onClick={() => changeTab(item)}
          >
            {tabLabel(item)}
          </button>
        ))}
      </nav>
      <main className="min-h-0 flex-1 overflow-auto p-4 lg:p-6">
        {tab === "files" ? (
          archive ? (
            <div className="mx-auto grid max-w-4xl gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold">{archive.fileName}</h1>
                  <p className="text-sm text-muted-foreground">
                    Historical price-list archive. New price lists are created
                    in Catalog Publisher.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setArchive(null)}>
                  <RotateCcw />
                  Back to files
                </Button>
              </div>
              <div className="ds-native-print rounded-lg bg-white p-8 shadow">
                <HtmlPreview html={archive.renderedHtml ?? ""} sanitize />
              </div>
            </div>
          ) : (
            <FilesPanel
              files={files}
              loading={loading}
              onOpen={(file) => void openFile(file)}
              onDelete={(file) => void removeFile(file)}
            />
          )
        ) : (
          <div className="grid min-h-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,.8fr)]">
            <section className="ds-native-no-print rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold">{tabLabel(tab)}</h1>
                  <p className="text-sm text-muted-foreground">
                    {draft.id
                      ? "Editing a saved document"
                      : "Create a new document"}
                  </p>
                </div>
                {tab === "email" && (
                  <Button type="button" onClick={() => setSendOpen(true)}>
                    <Mail />
                    Send email
                  </Button>
                )}
              </div>
              <StandardEditor
                draft={draft}
                setContent={setContent}
                customers={customers}
              />
            </section>
            <section className="ds-native-print self-start rounded-xl bg-white p-6 shadow-sm">
              <div className="ds-native-no-print mb-4 text-sm font-semibold text-slate-500">
                Live preview
              </div>
              <HtmlPreview html={preview} />
            </section>
          </div>
        )}
      </main>
      {sendOpen && (
        <div className="ds-native-no-print fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-email-title"
            className="w-full max-w-xl rounded-xl bg-background p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="send-email-title" className="text-lg font-bold">
                Send email
              </h2>
              <Button
                variant="ghost"
                size="icon"
                title="Close dialog"
                onClick={() => setSendOpen(false)}
              >
                ×
              </Button>
            </div>
            <div className="grid gap-4">
              <Field
                label="To"
                value={text(draft.content.emailTo)}
                onChange={(emailTo) => setContent({ emailTo })}
              />
              <Field
                label="Cc"
                value={text(draft.content.emailCc)}
                onChange={(emailCc) => setContent({ emailCc })}
              />
              <Field
                label="Bcc"
                value={text(draft.content.emailBcc)}
                onChange={(emailBcc) => setContent({ emailBcc })}
              />
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                <span>Contacts</span>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue=""
                  onChange={(event) => {
                    const contact = contacts.find(
                      (candidate) => candidate.email === event.target.value,
                    );
                    if (contact)
                      setContent({
                        emailTo: text(draft.content.emailTo)
                          ? `${text(draft.content.emailTo)}, ${contact.email}`
                          : contact.email,
                      });
                  }}
                >
                  <option value="">Add a saved contact…</option>
                  {contacts.map((contact) => (
                    <option key={contact.email} value={contact.email}>
                      {contact.name} — {contact.email}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSendOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void sendEmail()}>
                  <Send />
                  Queue email
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NativeDocStudio;
