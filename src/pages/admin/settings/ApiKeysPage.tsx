import { useEffect, useState } from "react";
// touch: 2026-07-02 — invoices/balances/statements scopes (push retry)
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const ALL_SCOPES = [
  "catalog:read", "catalog:write",
  "contacts:read", "contacts:write",
  "customers:read", "customers:write",
  "orders:read", "orders:write",
  "products:read", "products:write",
  "moonshot:read", "moonshot:write",
  // Read-only billing data, ingested from Innovations. No :write scope yet —
  // there's no write endpoint for these until a future payments API ships.
  "balances:read",
  "statements:read",
];

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
};

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data, error } = await (supabase as any)
      .from("api_keys").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    else setKeys((data ?? []) as ApiKey[]);
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!name.trim()) return toast({ title: "Name required", variant: "destructive" });
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("create_api_key", {
      p_name: name, p_scopes: selected, p_expires_at: null,
    });
    setLoading(false);
    if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
    setNewToken((data as any)?.token ?? null);
    setName(""); setSelected([]);
    load();
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? External integrations using it will stop working immediately.")) return;
    const { error } = await (supabase as any).rpc("revoke_api_key", { p_id: id });
    if (error) toast({ title: "Revoke failed", description: error.message, variant: "destructive" });
    else load();
  }

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL ?? "";
  const docsUrl = `${supabaseUrl}/functions/v1/api-v1/docs`;
  const specUrl = `${supabaseUrl}/functions/v1/api-v1/openapi.json`;
  const copy = (v: string, label: string) => { navigator.clipboard.writeText(v); toast({ title: `${label} copied` }); };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-semibold">API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Per-integration keys for external apps. Endpoint: <code>/functions/v1/api-v1/&lt;resource&gt;</code>.
          Send <code>x-api-key: &lt;token&gt;</code>.
        </p>
      </header>

      <Card>
        <CardHeader><CardTitle>Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Paste the OpenAPI URL into ChatGPT Custom GPT Actions, Cursor, Postman, or any AI coding tool
            to give it full knowledge of every endpoint, parameter, and response shape. No auth needed to view.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="w-32 shrink-0">Swagger UI</Label>
              <Input readOnly value={docsUrl} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={() => copy(docsUrl, "Docs URL")}>Copy</Button>
              <Button size="sm" variant="outline" asChild><a href={docsUrl} target="_blank" rel="noreferrer">Open</a></Button>
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-32 shrink-0">openapi.json</Label>
              <Input readOnly value={specUrl} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={() => copy(specUrl, "Spec URL")}>Copy</Button>
              <Button size="sm" variant="outline" asChild><a href={specUrl} target="_blank" rel="noreferrer">Open</a></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Create a new key</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Integration name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pricelist Wizard" />
          </div>
          <div>
            <Label>Scopes</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {ALL_SCOPES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.includes(s)}
                    onCheckedChange={(c) => setSelected((prev) => c ? [...prev, s] : prev.filter(x => x !== s))}
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>
          <Button onClick={create} disabled={loading}>Create key</Button>

          {newToken && (
            <div className="border p-4 bg-amber-50 dark:bg-amber-950 rounded">
              <p className="text-sm font-medium mb-2">Copy this token now — it will not be shown again.</p>
              <code className="text-xs break-all">{newToken}</code>
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newToken); toast({ title: "Copied" }); }}>
                  Copy
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setNewToken(null)} className="ml-2">Dismiss</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing keys</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Name</th>
                <th>Prefix</th>
                <th>Scopes</th>
                <th>Last used</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b">
                  <td className="py-2">{k.name}</td>
                  <td><code>clv_live_{k.key_prefix}…</code></td>
                  <td className="text-xs">{k.scopes.join(", ")}</td>
                  <td>{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "—"}</td>
                  <td>{k.revoked_at ? <span className="text-destructive">Revoked</span> : "Active"}</td>
                  <td>
                    {!k.revoked_at && (
                      <Button size="sm" variant="outline" onClick={() => revoke(k.id)}>Revoke</Button>
                    )}
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No keys yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
