import { Wrench, Loader2, Save, Sparkles } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PROVIDERS = [
  { id: "google_places", label: "Google Places", note: "Requires Google API key" },
  { id: "firecrawl_search", label: "Firecrawl Web Search", note: "Requires Firecrawl connector" },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

const LeadSettingsPage = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ["lead-provider-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_lead_provider_credentials_status" as never, {
        p_tenant_key: "default",
      } as never);
      if (error) throw error;
      return (data ?? []) as Array<{ provider: ProviderId; configured: boolean; updated_at: string | null }>;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ provider, credential }: { provider: ProviderId; credential: string }) => {
      const { error } = await supabase.rpc("upsert_lead_provider_credential" as never, {
        p_provider: provider,
        p_credential: credential,
        p_tenant_key: "default",
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-provider-statuses"] });
      toast({ title: "Provider credential saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Unable to save credential", description: error.message, variant: "destructive" });
    },
  });

  const statusByProvider = new Map(statuses.map((s) => [s.provider, s]));

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Leads Settings" icon={Wrench} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Provider credentials</CardTitle>
          <CardDescription>
            Configure API credentials for lead providers. Stored credentials are used by live lead search diagnostics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading provider status...</p>}

          {/* AI Search — always active, no key needed */}
          <div className="rounded-md border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800 p-3 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-medium inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> AI Search (Lovable AI)
              </Label>
              <Badge variant="default">Always Active</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Powered by Lovable AI Gateway. Generates lead results using AI when no other providers return data. No API key required.
            </p>
          </div>

          {PROVIDERS.map((provider) => (
            <ProviderRow
              key={provider.id}
              provider={provider}
              configured={Boolean(statusByProvider.get(provider.id)?.configured)}
              updatedAt={statusByProvider.get(provider.id)?.updated_at ?? null}
              isPending={saveMutation.isPending}
              onSave={(credential) => saveMutation.mutate({ provider: provider.id, credential })}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

const ProviderRow = ({
  provider,
  configured,
  updatedAt,
  isPending,
  onSave,
}: {
  provider: { id: ProviderId; label: string; note: string };
  configured: boolean;
  updatedAt: string | null;
  isPending: boolean;
  onSave: (credential: string) => void;
}) => {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-sm font-medium">{provider.label}</Label>
          <p className="text-[10px] text-muted-foreground">{provider.note}</p>
        </div>
        <Badge variant={configured ? "default" : "outline"}>{configured ? "Configured" : "Not configured"}</Badge>
      </div>
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder={configured ? "Enter new credential to rotate (leave blank to clear)" : "Enter provider API key/token"}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onSave((event.currentTarget as HTMLInputElement).value);
              (event.currentTarget as HTMLInputElement).value = "";
            }
          }}
        />
        <Button
          variant="secondary"
          disabled={isPending}
          onClick={(event) => {
            const input = (event.currentTarget.parentElement?.querySelector("input") as HTMLInputElement | null);
            onSave(input?.value ?? "");
            if (input) input.value = "";
          }}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Last updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "never"}</p>
    </div>
  );
};

export default LeadSettingsPage;
