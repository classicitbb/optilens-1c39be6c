import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseEmailList } from "../../../../supabase/functions/_shared/crm/contactEmailMatch";
import { looksLikeEmail, type EmailCheckStatus } from "../../../../supabase/functions/_shared/crm/emailVerification";

interface EmailCheck {
  email: string;
  status: EmailCheckStatus;
  checked_at: string;
}

const STATUS_LABEL: Record<EmailCheckStatus, string> = {
  verified: "Verified",
  catch_all: "Catch-all",
  invalid: "Invalid",
  unknown: "Unknown",
};

const STATUS_CLASS: Record<EmailCheckStatus, string> = {
  verified: "border-emerald-500/50 text-emerald-700 dark:text-emerald-300",
  catch_all: "border-amber-500/50 text-amber-700 dark:text-amber-300",
  invalid: "border-destructive/60 text-destructive",
  unknown: "text-muted-foreground",
};

/** Verification status for each address on a contact, with a button to check them. */
export const ContactEmailVerify = ({ contactId, emails }: { contactId: string; emails: string | null }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const addresses = parseEmailList(emails).filter(looksLikeEmail);
  const queryKey = ["contact-email-checks", contactId];

  // The table arrives with its migration; until then an error just means no results.
  const { data: checks = [] } = useQuery({
    queryKey,
    queryFn: async (): Promise<EmailCheck[]> => {
      const { data, error } = await (supabase as any).from("contact_email_checks")
        .select("email,status,checked_at")
        .eq("contact_id", contactId);
      return error ? [] : ((data ?? []) as EmailCheck[]);
    },
  });

  const verify = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("crm-email-verify", { body: { contact_id: contactId } });
      if (error) throw error;
      return (data?.checked ?? []) as { email: string; status: string }[];
    },
    onSuccess: (checked) => {
      qc.invalidateQueries({ queryKey });
      toast({ title: checked.length ? `Checked ${checked.length} address${checked.length === 1 ? "" : "es"}` : "Already checked recently" });
    },
    onError: (e: any) => toast({ title: "Unable to verify", description: e?.message, variant: "destructive" }),
  });

  if (!addresses.length) return null;
  const byEmail = new Map(checks.map((c) => [c.email.toLowerCase(), c]));

  return (
    <div className="mb-3 space-y-2 rounded border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">Email verification</p>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => verify.mutate()} disabled={verify.isPending}>
          <MailCheck className="mr-1 h-3.5 w-3.5" /> {verify.isPending ? "Verifying…" : "Verify email"}
        </Button>
      </div>
      <ul className="space-y-1">
        {addresses.map((a) => {
          const check = byEmail.get(a.toLowerCase());
          const status = check?.status;
          return (
            <li key={a} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">{a}</span>
              {check && status ? (
                <Badge variant="outline" className={`text-[10px] font-normal ${STATUS_CLASS[status]}`} title={`Checked ${new Date(check.checked_at).toLocaleDateString()}`}>
                  {STATUS_LABEL[status]}
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground">Not checked</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
