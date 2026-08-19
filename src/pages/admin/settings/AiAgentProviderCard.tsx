import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, PlugZap, ShieldCheck, Trash2 } from "lucide-react";

export type AiAgentStatus = "not_configured" | "connected" | "unverified" | "error";

export interface AiAgentSettingsRow {
  provider: string;
  model: string | null;
  enabled: boolean;
  has_secret: boolean;
  status: AiAgentStatus;
  last_tested_at: string | null;
  last_error: string | null;
  updated_at: string;
}

export const aiAgentStatusMeta: Record<AiAgentStatus, { label: string; className: string }> = {
  connected: { label: "Connected", className: "bg-emerald-500/10 text-emerald-700 border-emerald-300" },
  unverified: { label: "Saved (unverified)", className: "bg-amber-500/10 text-amber-700 border-amber-300" },
  error: { label: "Error", className: "bg-red-500/10 text-red-700 border-red-300" },
  not_configured: { label: "Not configured", className: "bg-slate-500/10 text-slate-700 border-slate-300" },
};

// Slug -> display title, e.g. "grok" -> "Grok", "azure-openai" -> "Azure Openai".
export const providerTitle = (provider: string) =>
  provider.split("-").filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");

interface AiAgentProviderCardProps {
  provider: string;
  /** null for a not-yet-saved provider the admin just added. */
  row: AiAgentSettingsRow | null;
  /** Only Anthropic is actually verified today — nothing else is wired up to call it. */
  canTest: boolean;
  /** Only invoked when row is null — there's no DB row to delete yet. */
  onRemoveDraft: () => void;
}

export default function AiAgentProviderCard({ provider, row, canTest, onRemoveDraft }: AiAgentProviderCardProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [model, setModel] = useState(row?.model ?? "");
  const [enabled, setEnabled] = useState(row?.enabled ?? false);
  const [apiKey, setApiKey] = useState("");
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  useEffect(() => {
    setModel(row?.model ?? "");
    setEnabled(row?.enabled ?? false);
  }, [row]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("upsert_ai_agent_settings" as never, {
        p_provider: provider,
        p_model: model || null,
        p_enabled: enabled,
        p_api_key: apiKey || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-agent-settings"] });
      setApiKey("");
      toast({ title: "Saved", description: `${providerTitle(provider)} credentials were updated.` });
    },
    onError: (error: any) => {
      toast({ title: "Unable to save", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("portal-copilot", { body: { operation: "test-ai-agent" } });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || "The AI agent did not confirm the configuration.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-agent-settings"] });
      toast({ title: "Connected", description: "The Claude API key and model were verified." });
    },
    onError: (error: any) => {
      qc.invalidateQueries({ queryKey: ["ai-agent-settings"] });
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("delete_ai_agent_settings" as never, { p_provider: provider } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-agent-settings"] });
      toast({ title: "Removed", description: `${providerTitle(provider)} was removed.` });
    },
    onError: (error: any) => {
      toast({ title: "Unable to remove", description: error.message, variant: "destructive" });
    },
  });

  const handleRemoveClick = () => {
    if (!row) { onRemoveDraft(); return; }
    setConfirmingRemove(true);
  };

  const status = row?.status ?? "not_configured";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{providerTitle(provider)}</CardTitle>
          <Badge variant="outline" className={aiAgentStatusMeta[status].className}>
            {aiAgentStatusMeta[status].label}
          </Badge>
        </div>
        <CardDescription>
          API key stored encrypted server-side and never returned to the browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Model</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gpt-5, grok-4, claude-sonnet-5"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> API key
            </Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={row?.has_secret ? "Leave empty to keep the stored key" : "Paste the API key"}
              autoComplete="off"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled
        </label>
        {row?.has_secret && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-emerald-600" /> A key is stored. Enter a new value only to rotate it.
          </p>
        )}
        {row?.last_error && <p className="text-xs text-destructive">Last test: {row.last_error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (!apiKey && !row?.has_secret)}
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
          {canTest && (
            <Button variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending || !row?.has_secret}>
              {testMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
              Test configuration
            </Button>
          )}
          <Button variant="ghost" onClick={handleRemoveClick} disabled={removeMutation.isPending}>
            {removeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Remove
          </Button>
        </div>
      </CardContent>

      <Dialog open={confirmingRemove} onOpenChange={setConfirmingRemove}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {providerTitle(provider)}?</DialogTitle>
            <DialogDescription>
              This deletes the stored API key and settings for this provider. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmingRemove(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => { removeMutation.mutate(); setConfirmingRemove(false); }}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
