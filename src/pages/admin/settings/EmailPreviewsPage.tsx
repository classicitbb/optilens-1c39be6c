import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, FileCode2, Loader2, Mail, Send, ShieldCheck } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import EmailDeliveryHealthCard from "@/components/admin/EmailDeliveryHealthCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type EmailGroup = "Authentication" | "Application";

type EmailTemplate = {
  id: string;
  group: EmailGroup;
  title: string;
  trigger: string;
  recipient: string;
  subject: string;
  preheader: string;
  heading: string;
  paragraphs: string[];
  cta?: string;
  details?: Array<[string, string]>;
  source: string;
};

const EMAIL_TEMPLATES: EmailTemplate[] = [
  { id: "signup", group: "Authentication", title: "Confirm email", trigger: "New account signup", recipient: "New account holder", subject: "Confirm your email", preheader: "Confirm your email for Classic Visions", heading: "Welcome to Classic Visions!", paragraphs: ["Thanks for signing up. Please confirm your email address ({{email}}) to get started.", "If you didn't create an account, you can safely ignore this email."], cta: "Verify Email", source: "_shared/email-templates/signup.tsx" },
  { id: "invite", group: "Authentication", title: "Account invitation", trigger: "Admin invites a user", recipient: "Invited user", subject: "You've been invited", preheader: "You've been invited to join Classic Visions", heading: "You've been invited", paragraphs: ["You've been invited to join Classic Visions. Click the button below to accept the invitation and set up your account.", "If you weren't expecting this invitation, you can safely ignore this email."], cta: "Accept Invitation", source: "_shared/email-templates/invite.tsx" },
  { id: "magiclink", group: "Authentication", title: "Magic link", trigger: "Passwordless sign-in", recipient: "Signing-in user", subject: "Your login link", preheader: "Your login link for Classic Visions", heading: "Sign in to Classic Visions", paragraphs: ["Click the button below to sign in. This link will expire shortly.", "If you didn't request this link, you can safely ignore this email."], cta: "Sign In", source: "_shared/email-templates/magic-link.tsx" },
  { id: "recovery", group: "Authentication", title: "Password reset", trigger: "Password reset requested", recipient: "Account holder", subject: "Reset your password", preheader: "Reset your password for Classic Visions", heading: "Reset your password", paragraphs: ["We received a request to reset your password for Classic Visions. Click the button below to choose a new password.", "If you didn't request a password reset, you can safely ignore this email. Your password will not be changed."], cta: "Reset Password", source: "_shared/email-templates/recovery.tsx" },
  { id: "email-change", group: "Authentication", title: "Confirm email change", trigger: "Email address changed", recipient: "Account holder", subject: "Confirm your new email", preheader: "Confirm your email change for Classic Visions", heading: "Confirm your email change", paragraphs: ["You requested to change your email address for Classic Visions from {{email}} to your new email address.", "If you didn't request this change, please secure your account immediately."], cta: "Confirm Email Change", source: "_shared/email-templates/email-change.tsx" },
  { id: "reauthentication", group: "Authentication", title: "Verification code", trigger: "Sensitive action verification", recipient: "Account holder", subject: "Your verification code", preheader: "Your verification code", heading: "Verify your identity", paragraphs: ["Use the code below to confirm your identity:", "123456", "This code will expire shortly. If you didn't request this, you can safely ignore this email."], source: "_shared/email-templates/reauthentication.tsx" },
  { id: "order-confirmation", group: "Application", title: "Order confirmation", trigger: "Website order placed", recipient: "Customer", subject: "Order Confirmed - #ORD-123456", preheader: "Your Classic Visions order #ORD-123456 has been confirmed", heading: "Order Confirmed", paragraphs: ["Hi {{name}}, thanks for your order! We've received your purchase and it's being processed.", "If you have any questions about your order, please reach out to our support team."], cta: "View Your Orders", details: [["Order number", "ORD-123456"], ["Order date", "25 Mar 2026"], ["Total", "$229.98"]], source: "_shared/transactional-email-templates/order-confirmation.tsx" },
  { id: "welcome", group: "Application", title: "Welcome message", trigger: "Customer account created", recipient: "New customer", subject: "Welcome to Classic Visions!", preheader: "Welcome to Classic Visions - let's get started", heading: "Welcome aboard!", paragraphs: ["Hi {{name}}, we're glad to have you. Your Classic Visions account is ready - browse our lens catalog, place orders, and track everything from your portal.", "You can browse our full lens and supplies catalog, place orders with fast checkout, and track your order status in real time."], cta: "Start Shopping", source: "_shared/transactional-email-templates/welcome.tsx" },
  { id: "welcome-pricelist", group: "Application", title: "Welcome — pricelist", trigger: "Customer onboarding", recipient: "New trade customer", subject: "Your Classic Visions pricelist is ready", preheader: "Your Classic Visions pricelist is ready — log in to view it", heading: "Welcome to Classic Visions", paragraphs: ["Hi {{name}}, your account is set up and your pricelist is ready.", "Log in to your account to view your full pricelist, place orders, and manage your profile.", "Questions? Reply to this email or contact us at support@classicvisions.net."], cta: "View My Pricelist", details: [["Your assigned pricelist", "Standard Pricelist 2026"]], source: "_shared/transactional-email-templates/welcome-pricelist.tsx" },
  { id: "abandoned-cart", group: "Application", title: "Abandoned cart recovery", trigger: "Cart left without checkout", recipient: "Store visitor", subject: "You left items in your cart — complete your order", preheader: "You left 3 item(s) in your cart", heading: "Still interested?", paragraphs: ["Hi {{name}}, you left 3 item(s) worth $254.97 in your cart. They're still waiting for you!", "If you've already completed your purchase or no longer need these items, you can safely ignore this email."], cta: "Complete Your Order", details: [["Progressive Lens 1.67 × 2", "$179.98"], ["Blue Light Filter × 1", "$74.99"], ["Total", "$254.97"]], source: "_shared/transactional-email-templates/abandoned-cart.tsx" },
  { id: "admin-error-notification", group: "Application", title: "Admin error notification", trigger: "Runtime errors detected", recipient: "System administrators", subject: "Alert: 2 runtime error(s) on Classic Visions", preheader: "2 runtime error(s) detected on Classic Visions", heading: "2 Errors Detected", paragraphs: ["The following runtime errors were captured. Review them in the admin dashboard.", "This is an automated notification from Classic Visions monitoring."], cta: "View Error Log", details: [["Unhandled promise rejection", "window.unhandledrejection"], ["Failed to fetch pricing data", "toast notification"]], source: "_shared/transactional-email-templates/admin-error-notification.tsx" },
  { id: "contact-inquiry-notification", group: "Application", title: "Contact inquiry notification", trigger: "Website contact form submitted", recipient: "Sales / support team", subject: "Website contact inquiry from Jane Doe", preheader: "New contact inquiry from Jane Doe", heading: "New Contact Inquiry", paragraphs: ["A new inquiry has been received on Classic Visions.", "Message: Hi, I would like to enquire about your lens products for my practice."], details: [["Name", "Jane Doe"], ["Email", "jane@example.com"], ["Business", "Doe Opticians"], ["Page", "/contact"]], source: "_shared/transactional-email-templates/contact-inquiry-notification.tsx" },
  { id: "inquiry-confirmation", group: "Application", title: "Inquiry confirmation", trigger: "Website inquiry received", recipient: "Person who submitted inquiry", subject: "Quote request received", preheader: "Quote request received — Classic Visions", heading: "Quote request received", paragraphs: ["Hi {{name}}, we have received your optical website design inquiry. Our team will prepare a detailed quote and get back to you shortly.", "If you need to follow up before we respond, you can reply directly to this email or contact us at support@classicvisions.net."], cta: "Visit Classic Visions", source: "_shared/transactional-email-templates/inquiry-confirmation.tsx" },
  { id: "statement-ready", group: "Application", title: "Statement ready", trigger: "New account statement available", recipient: "Account holder", subject: "Your statement is ready — $4320.50 due", preheader: "Your Classic Visions statement is ready — balance $4320.50", heading: "Your statement is ready", paragraphs: ["Hi {{name}}, your Classic Visions account statement (RETAIL) for Jun 1, 2026 – Jun 30, 2026 is now available to view online.", "Sign in to your Classic Visions account to view the full statement, transaction detail, and payment options."], cta: "View Statement", details: [["Balance due", "$4,320.50"], ["Due date", "Jul 30, 2026"]], source: "_shared/transactional-email-templates/statement-ready.tsx" },
];

const groups: EmailGroup[] = ["Authentication", "Application"];

const personalize = (value: string, name: string, email: string) => value.replaceAll("{{name}}", name).replaceAll("{{email}}", email);

const SITE_URL = "https://classicvisions.net";

// Application-group templates are registered with the send-transactional-email
// function (supabase/functions/_shared/transactional-email-templates/registry.ts)
// and can be test-sent for real. Authentication-group templates are rendered
// by Supabase Auth itself on real signup/invite/recovery events — there's no
// safe way to fire one standalone without creating real auth side effects, so
// those stay preview-only here.
const buildTestTemplateData = (id: string, sampleName: string, sampleEmail: string): Record<string, unknown> => {
  const now = new Date();
  switch (id) {
    case "order-confirmation":
      return {
        customerName: sampleName,
        orderId: "TEST-000001",
        orderDate: now.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }),
        items: [
          { product_name: "Progressive Lens 1.67", quantity: 2, product_price: 89.99 },
          { product_name: "Anti-Reflective Coating", quantity: 2, product_price: 25 },
        ],
        totalAmount: 229.98,
        shippingAddress: "123 Optical Lane, Cape Town, 8001",
        siteUrl: SITE_URL,
      };
    case "welcome":
      return { customerName: sampleName, siteUrl: SITE_URL };
    case "welcome-pricelist":
      return { customerName: sampleName, pricelistName: "Test Pricelist", siteUrl: SITE_URL, loginUrl: `${SITE_URL}/login` };
    case "abandoned-cart":
      return {
        customerName: sampleName,
        totalItems: 3,
        totalAmount: 254.97,
        cartSnapshot: [
          { product_name: "Progressive Lens 1.67", quantity: 2, product_price: 89.99 },
          { product_name: "Blue Light Filter", quantity: 1, product_price: 74.99 },
        ],
        siteUrl: SITE_URL,
      };
    case "admin-error-notification":
      return {
        errorCount: 1,
        errors: [{ title: "[TEST SEND] Sample error", source: "Email Previews admin tool", detail: "This is a test notification — not a real error.", route: "/admin/settings/email-previews", timestamp: now.toISOString() }],
        siteUrl: SITE_URL,
        reportedAt: now.toISOString(),
      };
    case "contact-inquiry-notification":
      return {
        inquiryType: "contact",
        name: sampleName,
        email: sampleEmail,
        phone: "+1 555 123 4567",
        businessName: "Test Business",
        message: "This is a test message sent from the Email Previews admin tool to verify delivery.",
        pageSlug: "/contact",
        sourceChannel: "website",
        submittedAt: now.toISOString(),
      };
    case "inquiry-confirmation":
      return {
        name: sampleName,
        inquiryType: "website-design-lead",
        message: "This is a test send from the Email Previews admin tool to verify delivery.",
        siteUrl: SITE_URL,
      };
    case "statement-ready":
      return {
        customerName: sampleName,
        accountNumber: "TEST",
        periodStart: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10),
        periodEnd: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10),
        closingBalance: 4320.5,
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
        siteUrl: SITE_URL,
      };
    default:
      return {};
  }
};

export default function EmailPreviewsPage() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState(EMAIL_TEMPLATES[0].id);
  const [sampleName, setSampleName] = useState("Jane Doe");
  const [sampleEmail, setSampleEmail] = useState("jane@example.com");
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const selected = useMemo(() => EMAIL_TEMPLATES.find((template) => template.id === selectedId) ?? EMAIL_TEMPLATES[0], [selectedId]);
  const canSendTest = selected.group === "Application";

  const selectTemplate = (template: EmailTemplate) => {
    setSelectedId(template.id);
    setSubject(template.subject);
  };

  const sendTestEmail = useMutation({
    mutationFn: async () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sampleEmail)) throw new Error("Enter a valid sample recipient email address first.");
      const { data, error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: selected.id,
          recipientEmail: sampleEmail,
          templateData: buildTestTemplateData(selected.id, sampleName, sampleEmail),
        },
      });
      if (error) throw new Error(error.message);
      if (data?.success === false) throw new Error(data?.reason === "email_suppressed" ? `${sampleEmail} is on the suppression list (unsubscribed or bounced previously).` : "Send failed.");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Test email queued", description: `"${selected.title}" was queued for delivery to ${sampleEmail}. Check the delivery status below in a few seconds.` });
    },
    onError: (error: Error) => {
      toast({ title: "Could not send test email", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
      <AdminPageHeader icon={Mail} title="Email Previews">
        <Badge variant="outline" className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{EMAIL_TEMPLATES.length} active templates</Badge>
      </AdminPageHeader>

      <p className="-mt-2 text-sm text-muted-foreground">Review the authentication and application emails currently wired into the sending pipeline. Sample values only affect this preview.</p>

      <EmailDeliveryHealthCard />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Email templates</h2>
            <p className="mt-1 text-xs text-muted-foreground">Choose an email to inspect its sent copy.</p>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-2">
              {groups.map((group) => (
                <section key={group} className="mb-4 last:mb-0">
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{group}</p>
                  {EMAIL_TEMPLATES.filter((template) => template.group === group).map((template) => {
                    const isSelected = selected.id === template.id;
                    return <button key={template.id} type="button" onClick={() => selectTemplate(template)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors", isSelected ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted") }>
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", isSelected ? "bg-primary-foreground/15" : "bg-muted text-muted-foreground")}><Mail className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{template.title}</span><span className={cn("mt-0.5 block truncate text-xs", isSelected ? "text-primary-foreground/75" : "text-muted-foreground")}>{template.trigger}</span></span>
                      <ChevronRight className={cn("h-4 w-4 shrink-0", isSelected ? "text-primary-foreground/75" : "text-muted-foreground")} />
                    </button>;
                  })}
                </section>
              ))}
            </div>
          </ScrollArea>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-col gap-4 border-b p-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="secondary">{selected.group}</Badge><Badge variant="outline" className="gap-1"><Send className="h-3 w-3" />Active</Badge></div>
              <h2 className="text-lg font-semibold">{selected.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Sent when: {selected.trigger} · To: {selected.recipient}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><FileCode2 className="h-3.5 w-3.5" /><code>{selected.source}</code></div>
          </div>

          <div className="grid gap-3 border-b bg-muted/30 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5"><Label htmlFor="preview-name" className="text-xs">Sample customer name</Label><Input id="preview-name" value={sampleName} onChange={(event) => setSampleName(event.target.value)} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label htmlFor="preview-email" className="text-xs">Sample recipient</Label><Input id="preview-email" type="email" value={sampleEmail} onChange={(event) => setSampleEmail(event.target.value)} className="h-8 text-sm" /></div>
            <div className="space-y-1.5 sm:col-span-2 xl:col-span-1"><Label htmlFor="preview-subject" className="text-xs">Subject preview</Label><Input id="preview-subject" value={subject} onChange={(event) => setSubject(event.target.value)} className="h-8 text-sm" /></div>
            <div className="flex items-end sm:col-span-2 xl:col-span-3">
              {canSendTest ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => sendTestEmail.mutate()} disabled={sendTestEmail.isPending}>
                    {sendTestEmail.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
                    Send test email
                  </Button>
                  <p className="text-xs text-muted-foreground">Sends a real email to the sample recipient above through the live pipeline.</p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Button size="sm" variant="outline" disabled>
                    <Send className="mr-2 h-3.5 w-3.5" />Send test email
                  </Button>
                  <span>Authentication emails are sent by Supabase Auth on real signup/invite/recovery events — there's no way to test-send one without those side effects.</span>
                </div>
              )}
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1 bg-slate-100 p-4 dark:bg-slate-950/40">
            <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4 text-sm"><p className="text-xs text-slate-500">From</p><p>Classic Visions &lt;support@classicvisions.net&gt;</p><p className="mt-3 text-xs text-slate-500">To</p><p>{sampleEmail}</p><p className="mt-3 text-xs text-slate-500">Subject</p><p className="font-medium">{subject}</p></div>
              <article className="mx-auto max-w-xl p-6 sm:p-9">
                <p className="mb-6 text-xs text-slate-500">{personalize(selected.preheader, sampleName, sampleEmail)}</p>
                <div className="border-t-4 border-[#C89130] pt-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1A8A9C]">Classic Visions</p><h3 className="mt-3 text-2xl font-bold text-[#0B1E35]">{personalize(selected.heading, sampleName, sampleEmail)}</h3></div>
                <div className="mt-6 space-y-4 text-[15px] leading-7 text-[#3d4a57]">{selected.paragraphs.slice(0, selected.id === "reauthentication" ? 1 : -1).map((paragraph) => <p key={paragraph}>{personalize(paragraph, sampleName, sampleEmail)}</p>)}</div>
                {selected.id === "reauthentication" && <><p className="mt-5 text-3xl font-extrabold tracking-[0.18em] text-[#0B1E35]">123456</p><p className="mt-5 text-[15px] italic leading-7 text-[#3d4a57]">{selected.paragraphs[2]}</p></>}
                {selected.details && <div className="mt-6 rounded-lg bg-[#F4F2ED] p-4">{selected.details.map(([label, value], index) => <div key={label} className={cn("flex items-start justify-between gap-4 py-2 text-sm", index > 0 && "border-t border-[#e2ddd2]")}><span className="text-[#3d4a57]">{label}</span><span className="text-right font-semibold text-[#0B1E35]">{value}</span></div>)}</div>}
                {selected.cta && <div className="mt-7"><span className="inline-flex rounded-md bg-[#C89130] px-5 py-3 text-sm font-bold text-[#0B1E35]">{selected.cta}</span></div>}
                {selected.id !== "reauthentication" && <p className="mt-6 text-[15px] italic leading-7 text-[#3d4a57]">{personalize(selected.paragraphs[selected.paragraphs.length - 1] ?? "", sampleName, sampleEmail)}</p>}
                <div className="mt-9 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500"><p>Classic Visions</p><p>support@classicvisions.net</p></div>
              </article>
            </div>
          </ScrollArea>
          <div className="flex items-center gap-2 border-t px-4 py-3 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-emerald-600" />This screen is a safe review surface. Live templates remain source-managed and use the existing authenticated sender.</div>
        </section>
      </div>
    </div>
  );
}
