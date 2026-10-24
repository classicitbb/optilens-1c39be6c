import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PhoneCall, PhoneIncoming, PhoneOutgoing, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type CallRecording = {
  id: string;
  direction: "inbound" | "outbound" | "unknown";
  recorded_at: string;
  duration_seconds: number | null;
  summary: string | null;
  transcript: string | null;
};

const splitNumbers = (phone: string | null | undefined) =>
  (phone ?? "").split(/[,;/\n]+/).map((part) => part.trim()).filter(Boolean);

// supabase.functions.invoke hides the function's own message behind a generic error.
async function invokeMessage(error: unknown, fallback: string) {
  const response = (error as { context?: Response } | null)?.context;
  const body = response && typeof response.json === "function" ? await response.json().catch(() => null) : null;
  return typeof body?.error === "string" ? body.error : fallback;
}

// Contact dialog tab: ring the staff member's own phone, then the customer, and
// show the calls staff chose to record, with their summary and transcript.
export function ContactCalls({ contactId, phone }: { contactId: string; phone: string | null | undefined }) {
  const { toast } = useToast();
  const numbers = splitNumbers(phone);
  const [selected, setSelected] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const recordings = useQuery({
    queryKey: ["contact-call-recordings", contactId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("call_recordings" as never) as any)
        .select("id,direction,recorded_at,duration_seconds,summary,transcript")
        .eq("contact_id", contactId)
        .order("recorded_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CallRecording[];
    },
  });

  const call = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pbx-calls", {
        body: { action: "request-call", contactId, phone: numbers[selected] },
      });
      if (error) throw new Error(await invokeMessage(error, "Could not start the call."));
      return data as { extension: string };
    },
    onSuccess: (data) => toast({ title: "Calling…", description: `Your phone (extension ${data.extension}) will ring first. Pick up to be connected.` }),
    onError: (error) => toast({ title: "Call not started", description: error instanceof Error ? error.message : undefined, variant: "destructive" }),
  });

  const play = useMutation({
    mutationFn: async (recordingId: string) => {
      const { data, error } = await supabase.functions.invoke("pbx-calls", { body: { action: "recording-url", recordingId } });
      if (error) throw new Error(await invokeMessage(error, "Could not open the recording."));
      return (data as { url: string }).url;
    },
    onSuccess: (url) => { window.open(url, "_blank", "noopener"); },
    onError: (error) => toast({ title: "Recording unavailable", description: error instanceof Error ? error.message : undefined, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {numbers.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {numbers.length > 1 ? (
              <select
                aria-label="Number to call"
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={selected}
                onChange={(event) => setSelected(Number(event.target.value))}
              >
                {numbers.map((number, index) => <option key={number} value={index}>{number}</option>)}
              </select>
            ) : <span className="text-xs">{numbers[0]}</span>}
            <Button type="button" size="sm" onClick={() => call.mutate()} disabled={call.isPending}>
              <PhoneCall className="mr-1 h-4 w-4" /> {call.isPending ? "Starting…" : "Call"}
            </Button>
          </div>
        ) : <p className="text-xs text-muted-foreground">Add a phone number to this contact to call them from here.</p>}
        <p className="text-[10px] text-muted-foreground">
          Your desk or mobile phone rings first, then the customer is dialled. To record a call, start it from your phone with the PBX recording code and tell the customer it is being recorded.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recorded calls</h3>
        {recordings.isLoading ? <p className="text-xs text-muted-foreground">Loading…</p> : null}
        {recordings.isError ? <p className="text-xs text-muted-foreground">Recorded calls aren't available to your account.</p> : null}
        {recordings.data?.length === 0 ? <p className="text-xs text-muted-foreground">No recorded calls for this contact yet.</p> : null}
        {recordings.data?.map((item) => (
          <div key={item.id} className="rounded-md border p-2 text-xs">
            <div className="flex items-center gap-2">
              {item.direction === "inbound" ? <PhoneIncoming className="h-3.5 w-3.5" /> : <PhoneOutgoing className="h-3.5 w-3.5" />}
              <span>{new Date(item.recorded_at).toLocaleString()}</span>
              {item.duration_seconds != null ? <span className="text-muted-foreground">{Math.floor(item.duration_seconds / 60)}:{String(item.duration_seconds % 60).padStart(2, "0")}</span> : null}
              <Button type="button" size="sm" variant="ghost" className="ml-auto h-6 px-2" onClick={() => play.mutate(item.id)} disabled={play.isPending}>
                <Play className="mr-1 h-3 w-3" /> Play
              </Button>
            </div>
            {item.summary ? <p className="mt-1 whitespace-pre-line">{item.summary}</p> : <p className="mt-1 text-muted-foreground">No summary yet.</p>}
            {item.transcript ? (
              <>
                <button type="button" className="mt-1 underline text-muted-foreground" onClick={() => setOpenId(openId === item.id ? null : item.id)}>
                  {openId === item.id ? "Hide transcript" : "Show transcript"}
                </button>
                {openId === item.id ? <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.transcript}</p> : null}
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
