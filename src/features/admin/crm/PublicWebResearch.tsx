import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { parseContactEmails } from "@/lib/contactEmails";

type Source = { title: string; url: string; snippet: string; emails: string[] };
type Research = { contactId: string; retrievedAt: string; sources: Source[]; warnings?: string[]; skipped?: string; error?: string };

export function PublicWebResearch({ contactId, emails, onEmails }: { contactId: string; emails: string; onEmails: (value: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const research = useMutation({ mutationFn: async () => {
    const { data, error } = await supabase.functions.invoke("crm-enrich-contacts", { body: { contactId, mode: "research" } });
    if (error) throw error;
    const result = data as Research;
    if (result?.error) throw new Error(result.error);
    if (result?.skipped === "daily_cap") throw new Error("The daily research limit has been reached. Try again tomorrow.");
    if (!Array.isArray(result?.sources)) throw new Error("Public web research is unavailable on this deployment.");
    return result;
  } });
  return <div className="space-y-2">
    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" disabled={research.isPending}
      onClick={() => { setExpanded(true); research.mutate(); }}><Globe className="h-3 w-3" />{research.isPending ? "Researching…" : "Research public web"}</Button>
    {expanded && <div className="rounded border p-2 space-y-2 text-xs">
      <div className="flex justify-between gap-2"><p>Review matches before using them. Similar names may refer to other people. Save your edits first; research uses the saved contact.</p>
        <Button variant="ghost" size="sm" className="h-6" onClick={() => setExpanded(false)}>Hide</Button></div>
      {research.isPending && <p role="status">Searching public pages for this contact and their company…</p>}
      {research.error && <p role="alert">{research.error.message}</p>}
      {research.data?.warnings?.map((warning) => <p key={warning} role="status" className="text-muted-foreground">{warning}</p>)}
      {research.data && !research.data.sources.length && <p>No matches returned by the available providers.</p>}
      {research.data?.sources.map((source) => <div key={source.url} className="rounded bg-muted p-2 space-y-1">
        <a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.title}</a>
        <p className="text-muted-foreground">{source.snippet}</p>
        {source.emails.map((email) => <Button key={email} variant="outline" size="sm" className="h-7 text-xs"
          onClick={() => onEmails(parseContactEmails([emails, email].filter(Boolean).join(", ")).join(", "))}>Add {email}</Button>)}
      </div>)}
      {research.data && <p className="text-muted-foreground">Retrieved {new Date(research.data.retrievedAt).toLocaleString()}. Adding an email changes this draft; use Save to keep it.</p>}
    </div>}
  </div>;
}
