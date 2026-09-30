import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Copy, Inbox, Loader2, PlayCircle, RefreshCw } from "lucide-react";

// Answers "is support@classicvisions.net actually turning inbound mail into
// helpdesk tickets?" via the admin-only helpdesk-inbound-status function.

type InboundStatus = {
  webhookUrl: string;
  secretConfigured: boolean;
  mailbox: string;
  lastReceivedAt: string | null;
  lastFrom: string | null;
  lastSubject: string | null;
  received30d: number;
};

type SelfTestResult = { ok: boolean; message: string; step?: string };

const STALE_DAYS = 14;
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : "—");

export default function InboundEmailStatusCard() {
  const { toast } = useToast();

  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ["helpdesk-inbound-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("helpdesk-inbound-status", { body: { action: "status" } });
      if (error) throw error;
      return data as InboundStatus;
    },
  });

  const selfTest = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("helpdesk-inbound-status", { body: { action: "selftest" } });
      if (error) throw error;
      return data as SelfTestResult;
    },
    onSuccess: (result) => toast({ title: result.ok ? "Self-test passed" : "Self-test failed", description: result.message, variant: result.ok ? "default" : "destructive" }),
    onError: (err: Error) => toast({ title: "Self-test could not run", description: err.message, variant: "destructive" }),
  });

  const ageDays = data?.lastReceivedAt ? (Date.now() - new Date(data.lastReceivedAt).getTime()) / 86400000 : null;
  const stale = !data?.lastReceivedAt || (ageDays ?? 0) > STALE_DAYS;
  const problem = !!error || (!!data && (!data.secretConfigured || stale));
  const badge = isLoading ? null : problem
    ? <Badge variant="outline" className="border-amber-300 bg-amber-500/10 text-amber-700"><AlertTriangle className="mr-1 h-3 w-3" />Attention needed</Badge>
    : <Badge variant="outline" className="border-emerald-300 bg-emerald-500/10 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />Receiving</Badge>;

  const copyUrl = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.webhookUrl);
    toast({ title: "Webhook URL copied", description: "Add ?token=<secret> when pasting it into a Mailgun route." });
  };

  return (
    <Accordion type="single" collapsible className="rounded-lg border">
      <AccordionItem value="inbound-email-status" className="border-none">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex flex-1 flex-wrap items-center justify-between gap-2 pr-2">
            <span className="flex items-center gap-2 text-sm font-semibold"><Inbox className="h-4 w-4" /> Inbound support email {badge}</span>
            {data && <span className="text-xs text-muted-foreground">{data.received30d} received (30d) · Last: {fmt(data.lastReceivedAt)}</span>}
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 px-4 pb-4 text-sm">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking inbound mail…</div>
          ) : error || !data ? (
            <p className="text-amber-700">Could not read inbound status. Try again in a moment.</p>
          ) : (
            <>
              <p className={problem ? "font-medium text-amber-800" : ""}>
                {!data.secretConfigured
                  ? "The shared secret (HELPDESK_INBOUND_SECRET) is not set, so every inbound email is rejected."
                  : !data.lastReceivedAt
                    ? `No email has ever reached ${data.mailbox}. Check the Mailgun route / MX records.`
                    : stale
                      ? `Nothing received in over ${STALE_DAYS} days (last: ${fmt(data.lastReceivedAt)}). The Mailgun route or MX records may be broken — run the self-test, then send a real test email.`
                      : `Inbound mail to ${data.mailbox} is creating tickets.`}
              </p>
              <dl className="grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-md border bg-muted/30 p-2"><dt className="text-muted-foreground">Last email from</dt><dd className="truncate font-medium">{data.lastFrom ?? "—"}</dd></div>
                <div className="rounded-md border bg-muted/30 p-2"><dt className="text-muted-foreground">Last subject</dt><dd className="truncate font-medium">{data.lastSubject ?? "—"}</dd></div>
                <div className="rounded-md border bg-muted/30 p-2"><dt className="text-muted-foreground">Shared secret</dt><dd className="font-medium">{data.secretConfigured ? "Configured" : "Missing"}</dd></div>
                <div className="rounded-md border bg-muted/30 p-2">
                  <dt className="text-muted-foreground">Webhook URL (for Mailgun route)</dt>
                  <dd className="flex items-center gap-1"><code className="truncate">{data.webhookUrl}</code><Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => void copyUrl()} aria-label="Copy webhook URL"><Copy className="h-3 w-3" /></Button></dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => selfTest.mutate()} disabled={selfTest.isPending}>
                  {selfTest.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="mr-2 h-3.5 w-3.5" />}Run self-test
                </Button>
                <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isRefetching}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />Refresh</Button>
                <span className="text-xs text-muted-foreground">Self-test checks the webhook and secret only — it cannot see Mailgun or DNS. It creates and then deletes a test ticket.</span>
              </div>
              {selfTest.data && <p className={selfTest.data.ok ? "text-emerald-700" : "font-medium text-red-600"}>{selfTest.data.message}</p>}
            </>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
