// TEMPORARY diagnostic — determines which string-to-hash contract Scotia uses
// for the server-to-server `notification_hash`. It never returns the shared
// secret, only which candidate algorithm matched. Delete once identified.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getScotiaConfig } from "../_shared/scotia/config.ts";
import { buildExtendedHashString, hmacSha256Base64 } from "../_shared/scotia/ipgConnect.ts";

const enc = new TextEncoder();
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { response } = await req.json() as { response: Record<string, string> };
  const cfg = await getScotiaConfig();
  const secret = cfg.sharedSecret;
  const received = response.notification_hash ?? response.response_hash ?? "";

  const drop = (keys: string[]) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(response)) if (!keys.includes(k)) out[k] = v;
    return out;
  };
  const base = drop(["notification_hash", "response_hash"]);
  const fixed = (storename: string) => [
    response.approval_code ?? "", response.chargetotal ?? "", response.currency ?? "",
    response.txndatetime ?? "", storename,
  ].join("|");

  const strings: Record<string, string> = {
    extended_all: buildExtendedHashString(base),
    extended_with_store: buildExtendedHashString({ ...base, storename: cfg.storeId }),
    extended_no_notifyurl: buildExtendedHashString(drop(["notification_hash", "response_hash", "transactionNotificationURL"])),
    extended_secret_first: `${secret}|${buildExtendedHashString(base)}`,
    extended_secret_last: `${buildExtendedHashString(base)}|${secret}`,
    fixed_echo_store: fixed(response.storename ?? ""),
    fixed_cfg_store: fixed(cfg.storeId),
    fixed_secret_first: `${secret}|${fixed(cfg.storeId)}`,
    fixed_secret_last: `${fixed(cfg.storeId)}|${secret}`,
    legacy_concat: `${secret}${cfg.storeId}${response.txndatetime ?? ""}${response.chargetotal ?? ""}${response.currency ?? ""}`,
    legacy_concat_approval: `${secret}${response.approval_code ?? ""}${response.chargetotal ?? ""}${response.currency ?? ""}${response.txndatetime ?? ""}${cfg.storeId}`,
    notify_core: [response.chargetotal ?? "", response.currency ?? "", response.txndatetime ?? "", cfg.storeId, response.approval_code ?? ""].join("|"),
    notify_oid: [response.oid ?? "", response.chargetotal ?? "", response.currency ?? "", response.txndatetime ?? "", cfg.storeId].join("|"),
    notify_txnid: [response.ipgTransactionId ?? "", response.chargetotal ?? "", response.currency ?? "", response.txndatetime ?? "", cfg.storeId].join("|"),
  };

  const matched: Record<string, string> = {};
  for (const [name, str] of Object.entries(strings)) {
    const hmacBytes = atob(await hmacSha256Base64(str, secret));
    const hmacB64 = btoa(hmacBytes);
    const hmacHex = [...hmacBytes].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
    const plain = await sha256(str);
    if (hmacB64 === received) matched[name] = "hmac_b64";
    else if (hmacHex === received) matched[name] = "hmac_hex";
    else if (b64(plain) === received) matched[name] = "sha256_b64";
    else if (hex(plain) === received) matched[name] = "sha256_hex";
  }

  return new Response(JSON.stringify({ received, matched, tried: Object.keys(strings).length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
