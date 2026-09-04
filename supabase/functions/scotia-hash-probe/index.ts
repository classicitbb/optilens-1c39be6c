// TEMPORARY diagnostic — determines which string-to-hash contract Scotia uses
// for the server-to-server `notification_hash`. It never returns the shared
// secret, only which candidate algorithm matched. Delete once identified.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getScotiaConfig } from "../_shared/scotia/config.ts";
import { buildExtendedHashString, hmacSha256Base64 } from "../_shared/scotia/ipgConnect.ts";

const sha256Hex = async (input: string) => {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { response } = await req.json() as { response: Record<string, string> };
  const cfg = await getScotiaConfig();
  const received = response.notification_hash ?? response.response_hash ?? "";

  const withoutHash: Record<string, string> = {};
  for (const [k, v] of Object.entries(response)) {
    if (k === "notification_hash" || k === "response_hash") continue;
    withoutHash[k] = v;
  }
  const fixed = (storename: string) => [
    response.approval_code ?? "", response.chargetotal ?? "", response.currency ?? "",
    response.txndatetime ?? "", storename,
  ].join("|");

  const candidates: Record<string, string> = {
    extended_all: buildExtendedHashString(withoutHash),
    extended_with_store: buildExtendedHashString({ ...withoutHash, storename: cfg.storeId }),
    fixed_echo_store: fixed(response.storename ?? ""),
    fixed_cfg_store: fixed(cfg.storeId),
    fixed_reordered: [cfg.storeId, response.txndatetime ?? "", response.chargetotal ?? "", response.currency ?? "", response.approval_code ?? ""].join("|"),
    legacy_concat: `${cfg.storeId}${response.txndatetime ?? ""}${response.chargetotal ?? ""}${response.currency ?? ""}`,
    legacy_concat_approval: `${cfg.storeId}${response.txndatetime ?? ""}${response.chargetotal ?? ""}${response.currency ?? ""}${response.approval_code ?? ""}`,
  };

  const results: Record<string, string> = {};
  for (const [name, str] of Object.entries(candidates)) {
    const hmacB64 = await hmacSha256Base64(str, cfg.sharedSecret);
    const hmacHex = [...atob(hmacB64)].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
    const plainHex = await sha256Hex(`${cfg.sharedSecret}${str}`);
    const plainHexSuffix = await sha256Hex(`${str}${cfg.sharedSecret}`);
    if (hmacB64 === received) results[name] = "hmac_base64";
    else if (hmacHex === received) results[name] = "hmac_hex";
    else if (plainHex === received) results[name] = "sha256_secret_prefix_hex";
    else if (plainHexSuffix === received) results[name] = "sha256_secret_suffix_hex";
  }

  return new Response(JSON.stringify({ received, matched: results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
