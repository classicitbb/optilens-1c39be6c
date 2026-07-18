import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Beta Supabase auth.oauth namespace — narrow local typing so TS doesn't complain.
type OAuthResult = {
  data?: {
    client?: { name?: string; client_name?: string; redirect_uris?: string[] } | null;
    redirect_url?: string | null;
    redirect_to?: string | null;
    scope?: string | null;
    scopes?: string[] | null;
  } | null;
  error?: { message: string } | null;
};
type SupabaseOAuth = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = (supabase.auth as unknown as { oauth: SupabaseOAuth }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthResult["data"]>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("This authorization link is missing an authorization_id.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const consentPath = window.location.pathname + window.location.search;
        window.location.replace(`/auth?mode=signin&redirect=${encodeURIComponent(consentPath)}`);
        return;
      }
      setEmail(sess.session.user.email ?? null);
      const res = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (res.error) {
        setError(res.error.message);
        return;
      }
      const immediate = res.data?.redirect_url ?? res.data?.redirect_to;
      if (immediate && !res.data?.client) {
        window.location.replace(immediate);
        return;
      }
      setDetails(res.data ?? null);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError(null);
    const res = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (res.error) {
      setBusy(false);
      setError(res.error.message);
      return;
    }
    const target = res.data?.redirect_url ?? res.data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("The authorization server did not return a redirect URL.");
      return;
    }
    window.location.replace(target);
  };

  const clientName =
    details?.client?.name ?? details?.client?.client_name ?? "an external application";
  const scopes = details?.scopes ?? (details?.scope ? details.scope.split(/\s+/) : []);

  return (
    <main className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
      <Card className="w-full max-w-lg rounded-none border-slate-700 bg-slate-900 text-slate-100">
        <CardHeader>
          <CardTitle className="text-xl">Connect {clientName} to Classic Visions</CardTitle>
          <CardDescription className="text-slate-300">
            This lets {clientName} use Classic Visions as you. It does not bypass this app's
            permissions or backend policies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {!details && !error && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading authorization request…
            </div>
          )}
          {details && (
            <>
              <div className="text-sm">
                <div className="text-slate-400">Signed in as</div>
                <div className="font-medium">{email ?? "current user"}</div>
              </div>
              {scopes.length > 0 && (
                <div className="text-sm">
                  <div className="text-slate-400 mb-1">Requested permissions</div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {scopes.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  className="rounded-none bg-sky-500 hover:bg-sky-400 text-slate-950"
                  disabled={busy}
                  onClick={() => decide(true)}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-none border-slate-600 text-slate-100 hover:bg-slate-800"
                  disabled={busy}
                  onClick={() => decide(false)}
                >
                  Cancel connection
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default OAuthConsent;
