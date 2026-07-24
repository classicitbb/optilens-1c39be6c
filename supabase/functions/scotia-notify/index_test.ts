// Deno unit tests for scotia-notify.
// Run: deno test --allow-net --allow-env supabase/functions/scotia-notify/index_test.ts
//
// Covers:
//   1. HMAC validation — valid hash settles; invalid hash refuses to settle.
//   2. Idempotency — repeated identical notifications both return 200 and
//      forward to the (idempotent) RPC each time without throwing.
//   3. Correct mapping — STMT-* oid → settle_statement_payment (statement flow);
//      UUID oid → settle_scotia_payment (order flow) with the expected payload
//      shape (approved / association code / card fields / source=notification).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// config.ts constructs a service-role Supabase client at module load. Provide
// harmless placeholders so the client factory doesn't throw in unit tests —
// the tests themselves inject a stub admin and never call the real client.
Deno.env.set("SUPABASE_URL", Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321");
Deno.env.set(
  "SUPABASE_SERVICE_ROLE_KEY",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "test-service-role-placeholder",
);

const { makeHandler } = await import("./index.ts");
const { hmacSha256Base64 } = await import("../_shared/scotia/ipgConnect.ts");
type NotifyAdmin = import("./index.ts").NotifyAdmin;
type NotifyDeps = import("./index.ts").NotifyDeps;

const SHARED_SECRET = "unit-test-shared-secret";

function stubConfig(sharedSecret = SHARED_SECRET) {
  return () =>
    Promise.resolve({
      storeId: "test-store",
      sharedSecret,
      env: "test" as const,
      timezone: "America/Barbados",
      currency: "840",
    });
}

interface RpcCall { fn: string; args: Record<string, unknown> }

function stubAdmin(opts: { userId?: string | null; orderMissing?: boolean; rpcError?: unknown } = {}) {
  const rpcCalls: RpcCall[] = [];
  const admin: NotifyAdmin = {
    rpc: (fn, args) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve({ data: null, error: opts.rpcError ?? null });
    },
    from: (_table) => ({
      select: (_cols) => ({
        eq: (_col, _val) => ({
          single: () =>
            Promise.resolve(
              opts.orderMissing
                ? { data: null, error: { message: "not found" } }
                : { data: { user_id: opts.userId ?? "user-123" }, error: null },
            ),
        }),
      }),
    }),
  };
  return { admin, rpcCalls };
}

/** Build a well-formed gateway response for `oid` with a valid response_hash. */
async function signedResponse(overrides: Record<string, string> = {}): Promise<Record<string, string>> {
  const base: Record<string, string> = {
    oid: overrides.oid ?? crypto.randomUUID(),
    approval_code: "Y:123456:0:M:M",
    processor_response_code: "00",
    chargetotal: "77.35",
    currency: "840",
    txndatetime: "2026:07:24-15:48:45",
    storename: "test-store",
    ccbrand: "VISA",
    cardnumber: "411111######1111",
    bname: "Test Buyer",
    expmonth: "12",
    expyear: "2029",
    ...overrides,
  };
  const stringToHash = [
    base.approval_code,
    base.chargetotal,
    base.currency,
    base.txndatetime,
    base.storename,
  ].join("|");
  base.response_hash = await hmacSha256Base64(stringToHash, SHARED_SECRET);
  return base;
}

function postJson(body: Record<string, string>): Request {
  return new Request("https://example.test/functions/v1/scotia-notify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeps(admin: NotifyAdmin, sharedSecret = SHARED_SECRET): NotifyDeps {
  return { getConfig: stubConfig(sharedSecret), admin };
}

// ─── HMAC validation ─────────────────────────────────────────────────────────

Deno.test("scotia-notify: settles when response hash is valid (order flow)", async () => {
  const { admin, rpcCalls } = stubAdmin();
  const handler = makeHandler(makeDeps(admin));

  const oid = crypto.randomUUID();
  const body = await signedResponse({ oid });
  const res = await handler(postJson(body));
  const json = await res.json();

  assertEquals(res.status, 200);
  assertEquals(json.settled, true);
  assertEquals(json.flow, "order");
  assertEquals(json.approved, true);
  assertEquals(rpcCalls.length, 1);
  assertEquals(rpcCalls[0].fn, "settle_scotia_payment");
});

Deno.test("scotia-notify: refuses to settle when response hash is invalid", async () => {
  const { admin, rpcCalls } = stubAdmin();
  const handler = makeHandler(makeDeps(admin));

  const body = await signedResponse();
  body.response_hash = "not-the-real-hash";
  const res = await handler(postJson(body));
  const json = await res.json();

  assertEquals(res.status, 200); // ALWAYS 200 to Fiserv so it doesn't retry
  assertEquals(json.settled, false);
  assertEquals(json.reason, "bad_hash");
  assertEquals(rpcCalls.length, 0);
});

Deno.test("scotia-notify: refuses when tampered payload changes chargetotal", async () => {
  const { admin, rpcCalls } = stubAdmin();
  const handler = makeHandler(makeDeps(admin));

  const body = await signedResponse({ chargetotal: "77.35" });
  body.chargetotal = "0.01"; // tamper after signing
  const res = await handler(postJson(body));
  const json = await res.json();

  assertEquals(json.settled, false);
  assertEquals(json.reason, "bad_hash");
  assertEquals(rpcCalls.length, 0);
});

Deno.test("scotia-notify: rejects when SharedSecret is not configured", async () => {
  const { admin, rpcCalls } = stubAdmin();
  const handler = makeHandler(makeDeps(admin, "")); // empty secret
  const body = await signedResponse();
  const res = await handler(postJson(body));
  const json = await res.json();

  assertEquals(json.reason, "not_configured");
  assertEquals(rpcCalls.length, 0);
});

// ─── Idempotency ─────────────────────────────────────────────────────────────

Deno.test("scotia-notify: identical notifications forwarded to RPC each time and both return 200", async () => {
  const { admin, rpcCalls } = stubAdmin();
  const handler = makeHandler(makeDeps(admin));

  const body = await signedResponse();
  const first = await handler(postJson(body));
  const second = await handler(postJson(body));

  assertEquals(first.status, 200);
  assertEquals(second.status, 200);
  assertEquals((await first.json()).settled, true);
  assertEquals((await second.json()).settled, true);
  // Handler stays stateless; server-side settle_scotia_payment RPC is the
  // idempotent boundary (documented in the function header).
  assertEquals(rpcCalls.length, 2);
  assertEquals(rpcCalls[0].fn, "settle_scotia_payment");
  assertEquals(rpcCalls[1].fn, "settle_scotia_payment");
  assertEquals(rpcCalls[0].args.p_order_id, rpcCalls[1].args.p_order_id);
});

// ─── Correct mapping into Supabase ───────────────────────────────────────────

Deno.test("scotia-notify: STMT- oid maps to settle_statement_payment with sliced payment id", async () => {
  const { admin, rpcCalls } = stubAdmin();
  const handler = makeHandler(makeDeps(admin));

  const paymentId = "00000000-0000-0000-0000-0000000000aa";
  const body = await signedResponse({ oid: `STMT-${paymentId}` });
  const res = await handler(postJson(body));
  const json = await res.json();

  assertEquals(json.flow, "statement");
  assertEquals(json.settled, true);
  assertEquals(rpcCalls.length, 1);
  assertEquals(rpcCalls[0].fn, "settle_statement_payment");
  assertEquals(rpcCalls[0].args.p_payment_id, paymentId);

  const gw = rpcCalls[0].args.p_gateway as Record<string, unknown>;
  assertEquals(gw.source, "notification");
  assertEquals(gw.approved, true);
  assertEquals(gw.association_response_code, "00");
  assertEquals(gw.chargetotal, "77.35");
  assertEquals(gw.currency, "840");
});

Deno.test("scotia-notify: UUID oid maps to settle_scotia_payment with order user_id and card fields", async () => {
  const { admin, rpcCalls } = stubAdmin({ userId: "user-abc" });
  const handler = makeHandler(makeDeps(admin));

  const oid = crypto.randomUUID();
  const body = await signedResponse({ oid });
  const res = await handler(postJson(body));
  const json = await res.json();

  assertEquals(json.flow, "order");
  assertEquals(json.settled, true);
  assertEquals(rpcCalls.length, 1);

  const call = rpcCalls[0];
  assertEquals(call.fn, "settle_scotia_payment");
  assertEquals(call.args.p_order_id, oid);
  assertEquals(call.args.p_actor_user_id, "user-abc");

  const gw = call.args.p_gateway as Record<string, unknown>;
  assertEquals(gw.card_brand, "VISA");
  assertEquals(gw.card_last4, "1111");
  assertEquals(gw.cardholder_name, "Test Buyer");
  assertEquals(gw.expiry_month, 12);
  assertEquals(gw.expiry_year, 2029);
  assertEquals(gw.source, "notification");
  assert(gw.approved === true);
});

Deno.test("scotia-notify: order flow bails out when the oid does not resolve to an order", async () => {
  const { admin, rpcCalls } = stubAdmin({ orderMissing: true });
  const handler = makeHandler(makeDeps(admin));

  const body = await signedResponse();
  const res = await handler(postJson(body));
  const json = await res.json();

  assertEquals(json.settled, false);
  assertEquals(json.reason, "order_not_found");
  assertEquals(rpcCalls.length, 0);
});

Deno.test("scotia-notify: reports rpc_error when settle_scotia_payment fails", async () => {
  const { admin, rpcCalls } = stubAdmin({ rpcError: { message: "boom" } });
  const handler = makeHandler(makeDeps(admin));

  const body = await signedResponse();
  const res = await handler(postJson(body));
  const json = await res.json();

  assertEquals(res.status, 200);
  assertEquals(json.settled, false);
  assertEquals(json.reason, "rpc_error");
  assertEquals(rpcCalls.length, 1);
});

// ─── Basic HTTP behavior ─────────────────────────────────────────────────────

Deno.test("scotia-notify: GET returns version metadata", async () => {
  const { admin } = stubAdmin();
  const handler = makeHandler(makeDeps(admin));
  const res = await handler(new Request("https://example.test/", { method: "GET" }));
  const json = await res.json();
  assertEquals(res.status, 200);
  assertEquals(json.name, "scotia-notify");
  assert(typeof json.version === "string");
});

Deno.test("scotia-notify: POST without oid returns missing_oid", async () => {
  const { admin, rpcCalls } = stubAdmin();
  const handler = makeHandler(makeDeps(admin));
  const res = await handler(postJson({ approval_code: "Y", response_hash: "x" }));
  const json = await res.json();
  assertEquals(json.reason, "missing_oid");
  assertEquals(rpcCalls.length, 0);
});
